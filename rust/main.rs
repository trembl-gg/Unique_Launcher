#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod assets;
mod backend;
mod game_icon;
mod native;
mod protocol;

use serde_json::{json, Value};
use std::{
    collections::HashMap,
    sync::atomic::Ordering,
    time::{Duration, Instant},
};
use tao::{
    dpi::LogicalSize,
    event::{Event, WindowEvent},
    event_loop::{ControlFlow, EventLoopBuilder},
    window::{Icon, WindowBuilder},
};
use wry::{DragDropEvent, WebContext, WebView, WebViewBuilder};

#[derive(Debug)]
enum HostEvent {
    Invoke(String),
    Message(Value),
    Drop(Vec<std::path::PathBuf>, (i32, i32)),
    BackendStopped,
}

fn dispatch(webview: &WebView, message: Value) {
    // JSON is a literal argument, never interpolated into a quoted JavaScript string.
    let script = format!("window.__uniqueDispatch && window.__uniqueDispatch({message});");
    if let Err(error) = webview.evaluate_script(&script) {
        eprintln!("Bridge: {error}");
    }
}

fn error_dialog(message: &str) {
    rfd::MessageDialog::new()
        .set_title("UNIQUE LAUNCHER")
        .set_description(message)
        .set_level(rfd::MessageLevel::Error)
        .show();
}

fn main() {
    if let Err(error) = run() {
        error_dialog(&error);
    }
}

fn run() -> Result<(), String> {
    wry::webview_version().map_err(|error| format!("Microsoft Edge WebView2 Runtime is required. Install the launcher with its installer, then restart.\n{error}"))?;
    let root = backend::project_root()?;
    let event_loop = EventLoopBuilder::<HostEvent>::with_user_event().build();
    let image = image::load_from_memory(include_bytes!("../unique.png"))
        .map_err(|e| e.to_string())?
        .into_rgba8();
    let (width, height) = image.dimensions();
    let icon = Icon::from_rgba(image.into_raw(), width, height).map_err(|e| e.to_string())?;
    let window = WindowBuilder::new()
        .with_title("UNIQUE LAUNCHER")
        .with_decorations(false)
        .with_min_inner_size(LogicalSize::new(1120., 720.))
        .with_maximized(true)
        .with_window_icon(Some(icon))
        .build(&event_loop)
        .map_err(|e| e.to_string())?;
    native::restore_streamer_mode(&window);
    let proxy = event_loop.create_proxy();
    let mut backend = backend::Backend::start(&root, proxy.clone())?;
    let data_dir = native::data_dir().join("WebView2-Rust");
    std::fs::create_dir_all(&data_dir).map_err(|e| e.to_string())?;
    let mut context = WebContext::new(Some(data_dir));
    let index_url = assets::RENDERER_URL;
    let asset_root = root.clone();
    let ipc_proxy = proxy.clone();
    let drop_proxy = proxy.clone();
    let webview = WebViewBuilder::new_with_web_context(&mut context)
        .with_html("<html style='background:#090611;color:white;font:18px system-ui'><body>UNIQUE LAUNCHER…</body></html>")
        .with_background_color((9, 6, 17, 255))
        .with_devtools(cfg!(debug_assertions))
        .with_custom_protocol("unique".into(), move |_, request| assets::respond(&asset_root, request))
        .with_navigation_handler(|url| url == "about:blank" || assets::is_renderer_url(&url))
        .with_new_window_req_handler(|_, _| wry::NewWindowResponse::Deny)
        .with_initialization_script("window.__UNIQUE_RUST__ = true;")
        .with_ipc_handler(move |request| {
            if assets::is_renderer_url(&request.uri().to_string()) {
                let _ = ipc_proxy.send_event(HostEvent::Invoke(request.body().clone()));
            }
        })
        .with_drag_drop_handler(move |event| {
            if let DragDropEvent::Drop { paths, position } = event { let _ = drop_proxy.send_event(HostEvent::Drop(paths, position)); }
            true
        })
        .build(&window).map_err(|e| e.to_string())?;
    let mut audio = native::AudioMeter::default();
    let game_icons = game_icon::GameIcons::new(&root);
    let mut pending = HashMap::new();
    let mut dropped_paths = Vec::new();
    let mut ready = false;
    let mut stopped = false;
    let mut deadline = Instant::now() + Duration::from_secs(30);
    event_loop.run(move |event, _, control| {
        *control = if ready { ControlFlow::Wait } else { ControlFlow::WaitUntil(Instant::now() + Duration::from_millis(250)) };
        match event {
            Event::WindowEvent { event: WindowEvent::CloseRequested, .. } => *control = ControlFlow::Exit,
            Event::WindowEvent { event: WindowEvent::Resized(_) | WindowEvent::Moved(_) | WindowEvent::Focused(true), .. } => {
                dispatch(&webview, protocol::event("window-maximized-state", json!(window.is_maximized())));
                dispatch(&webview, protocol::event("hardware-info", native::hardware(&window)));
            }
            Event::UserEvent(HostEvent::Message(mut message)) => {
                if message["type"] == "invoke-result" {
                    let channel = message["id"].as_u64().and_then(|id| pending.remove(&id));
                    if channel.as_deref() == Some("get-launch-state") && message["result"]["running"] == true {
                        if let Some(pid) = message["result"]["pid"].as_u64() { game_icons.track(pid as u32); }
                    }
                    if channel.as_deref() == Some("get-system-info") {
                        if let Some(result) = message["result"].as_object_mut() {
                            if let Some(hardware) = native::hardware(&window).as_object() { result.extend(hardware.clone()); }
                        }
                    }
                }
                if message["channel"] == "launch-started" {
                    if let Some(pid) = message["data"]["pid"].as_u64() { game_icons.track(pid as u32); }
                }
                if message["type"] == "event" && message["channel"] == "window-control" {
                    window_action(&window, message["data"].as_str().unwrap_or(""), control);
                } else { dispatch(&webview, message); }
            }
            Event::UserEvent(HostEvent::Drop(paths, position)) => {
                if paths.len() <= 100 {
                    dropped_paths = paths.iter().filter(|p| p.exists()).cloned().collect();
                    let scale = window.scale_factor();
                    dispatch(&webview, protocol::event("native-file-drop", json!({"names":dropped_paths.iter().map(|p| p.file_name().unwrap_or_default().to_string_lossy()).collect::<Vec<_>>(),"x":position.0 as f64 / scale,"y":position.1 as f64 / scale})));
                } else { dispatch(&webview, protocol::event("native-drop-error", json!("Перетащите не больше 100 файлов за раз."))); }
            }
            Event::UserEvent(HostEvent::BackendStopped) => {
                stopped = true;
                for (id, _) in pending.drain() { dispatch(&webview, protocol::reply(id, Err("Launcher backend stopped. Restart the launcher.".into()))); }
                if !ready { error_dialog("Launcher backend stopped during startup. See %LOCALAPPDATA%/UNIQUE LAUNCHER/logs/rust-backend.log"); *control = ControlFlow::Exit; }
                else { dispatch(&webview, protocol::event("backend-stopped", json!(true))); }
            }
            Event::UserEvent(HostEvent::Invoke(body)) => {
                let Ok(request) = serde_json::from_str::<protocol::Invoke>(&body) else { return; };
                let id = request.id;
                let channel = request.channel.as_str();
                let result = match channel {
                    "window-control" => { window_action(&window, request.payload.as_str().unwrap_or(""), control); Some(Ok(json!(true))) }
                    "window-is-maximized" => Some(Ok(json!(window.is_maximized()))),
                    "window-drag" => Some(window.drag_window().map(|_| json!(true)).map_err(|e| e.to_string())),
                    "get-hardware-info" => Some(Ok(native::hardware(&window))),
                    "open-external-url" => Some(native::open_external(&request.payload)),
                    "audio-peak" => Some(audio.read()),
                    "audio-meter-stop" => { audio.stop(); Some(Ok(json!(true))) }
                    "streamer-mode" => Some(Ok(native::streamer_mode(&window, request.payload.as_bool().unwrap_or(false)))),
                    "choose-file" => Some(Ok(native::choose_file(&request.payload))),
                    "choose-directory" => Some(Ok(native::path_result(rfd::FileDialog::new().pick_folder()))),
                    "dropped-files" => Some(Ok(json!(std::mem::take(&mut dropped_paths)))),
                    _ if stopped => Some(Err("Launcher backend stopped. Restart the launcher.".into())),
                    _ if pending.len() >= 128 => Some(Err("Too many pending requests. Wait for the current operation.".into())),
                    _ => {
                        let mut payload = request.payload.clone();
                        if channel == "launch-minecraft" { if let Some(obj) = payload.as_object_mut() { obj.insert("_displayRefreshRate".into(), native::hardware(&window)["refreshRate"].clone()); } }
                        match backend.invoke(&json!({"id":id,"channel":channel,"payload":payload})) {
                            Ok(()) => { pending.insert(id, request.channel.clone()); None }
                            Err(error) => Some(Err(error)),
                        }
                    }
                };
                if let Some(result) = result { dispatch(&webview, protocol::reply(id, result)); }
            }
            Event::MainEventsCleared if !ready && !stopped => {
                if backend.ready.load(Ordering::Acquire) {
                    match webview.load_url(index_url) {
                        Ok(()) => ready = true,
                        Err(error) => { error_dialog(&error.to_string()); *control = ControlFlow::Exit; }
                    }
                } else if backend.migrating.load(Ordering::Acquire) { deadline = Instant::now() + Duration::from_secs(30); }
                else if Instant::now() > deadline { error_dialog("Launcher backend startup timed out."); *control = ControlFlow::Exit; }
            }
            _ => {}
        }
    });
}

fn window_action(window: &tao::window::Window, action: &str, control: &mut ControlFlow) {
    match action {
        "minimize" => window.set_minimized(true),
        "maximize" => window.set_maximized(!window.is_maximized()),
        "close" => *control = ControlFlow::Exit,
        "show" => {
            window.set_visible(true);
            window.set_minimized(false);
            window.set_focus();
        }
        "hide" => window.set_visible(false),
        _ => {}
    }
}
