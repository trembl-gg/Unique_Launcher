use std::{
    collections::HashSet,
    path::{Path, PathBuf},
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc, Mutex,
    },
    thread,
    time::Duration,
};
use windows::{
    core::{BOOL, GUID, PCWSTR, PWSTR},
    Win32::{
        Foundation::{CloseHandle, HANDLE, HWND, LPARAM, PROPERTYKEY, WAIT_TIMEOUT, WPARAM},
        System::{
            Com::{
                CoInitializeEx, CoUninitialize, StructuredStorage::PROPVARIANT,
                COINIT_APARTMENTTHREADED,
            },
            Threading::{
                OpenProcess, QueryFullProcessImageNameW, WaitForSingleObject, PROCESS_NAME_WIN32,
                PROCESS_QUERY_LIMITED_INFORMATION, PROCESS_SYNCHRONIZE,
            },
        },
        UI::{
            Shell::PropertiesSystem::{IPropertyStore, SHGetPropertyStoreForWindow},
            WindowsAndMessaging::{
                DestroyIcon, EnumWindows, GetWindowThreadProcessId, IsWindowVisible, LoadImageW,
                SendMessageTimeoutW, HICON, IMAGE_ICON, LR_LOADFROMFILE, SMTO_ABORTIFHUNG,
                WM_GETICON, WM_SETICON,
            },
        },
    },
};

pub struct GameIcons {
    active: Arc<Mutex<HashSet<u32>>>,
    shutdown: Arc<AtomicBool>,
    icon: PathBuf,
    launcher_icon: PathBuf,
}
impl GameIcons {
    pub fn new(root: &Path) -> Self {
        Self {
            active: Default::default(),
            shutdown: Default::default(),
            icon: root.join("game.ico"),
            launcher_icon: if root.join("launcher.ico").is_file() { root.join("launcher.ico") } else { root.join("unique иконка.ico") },
        }
    }
    pub fn track(&self, pid: u32, engine: &str) {
        if pid == 0 || !self.active.lock().unwrap().insert(pid) {
            return;
        }
        let horizon = engine == "horizon";
        let (active, shutdown, icon) = (
            self.active.clone(),
            self.shutdown.clone(),
            if horizon { self.launcher_icon.clone() } else { self.icon.clone() },
        );
        thread::spawn(move || {
            if let Err(error) = watch(pid, &icon, horizon, &shutdown) {
                eprintln!("Minecraft icon: {error}");
            }
            active.lock().unwrap().remove(&pid);
        });
    }
}
impl Drop for GameIcons {
    fn drop(&mut self) {
        self.shutdown.store(true, Ordering::Release);
    }
}
struct Process(HANDLE);
impl Drop for Process {
    fn drop(&mut self) {
        let _ = unsafe { CloseHandle(self.0) };
    }
}
struct Icon(HICON);
impl Drop for Icon {
    fn drop(&mut self) {
        let _ = unsafe { DestroyIcon(self.0) };
    }
}
struct Com;
impl Drop for Com {
    fn drop(&mut self) {
        unsafe { CoUninitialize() };
    }
}
struct State {
    pid: u32,
    small: Icon,
    large: Icon,
    branded: HashSet<isize>,
    path: String,
}

fn watch(pid: u32, icon: &Path, horizon: bool, shutdown: &AtomicBool) -> windows::core::Result<()> {
    unsafe {
        let process = Process(OpenProcess(
            PROCESS_QUERY_LIMITED_INFORMATION | PROCESS_SYNCHRONIZE,
            false,
            pid,
        )?);
        let mut path = [0u16; 32768];
        let mut length = path.len() as u32;
        QueryFullProcessImageNameW(
            process.0,
            PROCESS_NAME_WIN32,
            PWSTR(path.as_mut_ptr()),
            &mut length,
        )?;
        let executable = String::from_utf16_lossy(&path[..length as usize]);
        if !Path::new(&executable).file_name().is_some_and(|name| {
            if horizon { name.eq_ignore_ascii_case("horizon-client.exe") }
            else { name.eq_ignore_ascii_case("java.exe") || name.eq_ignore_ascii_case("javaw.exe") }
        }) {
            return Ok(());
        }
        CoInitializeEx(None, COINIT_APARTMENTTHREADED).ok()?;
        let _com = Com;
        let wide: Vec<u16> = icon
            .to_string_lossy()
            .encode_utf16()
            .chain(Some(0))
            .collect();
        let mut state = State {
            pid,
            small: Icon(HICON(
                LoadImageW(
                    None,
                    PCWSTR(wide.as_ptr()),
                    IMAGE_ICON,
                    16,
                    16,
                    LR_LOADFROMFILE,
                )?
                .0,
            )),
            large: Icon(HICON(
                LoadImageW(
                    None,
                    PCWSTR(wide.as_ptr()),
                    IMAGE_ICON,
                    48,
                    48,
                    LR_LOADFROMFILE,
                )?
                .0,
            )),
            branded: HashSet::new(),
            path: icon.to_string_lossy().into_owned(),
        };
        while !shutdown.load(Ordering::Acquire) && WaitForSingleObject(process.0, 0) == WAIT_TIMEOUT
        {
            EnumWindows(Some(apply), LPARAM(&mut state as *mut State as isize))?;
            for _ in 0..20 {
                if shutdown.load(Ordering::Acquire) {
                    break;
                }
                thread::sleep(Duration::from_millis(100));
            }
        }
    }
    Ok(())
}

unsafe extern "system" fn apply(window: HWND, parameter: LPARAM) -> BOOL {
    let state = &mut *(parameter.0 as *mut State);
    let mut pid = 0;
    GetWindowThreadProcessId(window, Some(&mut pid));
    if pid != state.pid || !IsWindowVisible(window).as_bool() {
        return BOOL(1);
    }
    if state.branded.insert(window.0 as isize) {
        if let Err(error) = brand_taskbar(window, &state.path) {
            eprintln!("Minecraft taskbar: {error}");
        }
    }
    for (size, icon) in [(0, state.small.0), (1, state.large.0)] {
        let mut current = 0;
        if SendMessageTimeoutW(
            window,
            WM_GETICON,
            WPARAM(size),
            LPARAM(0),
            SMTO_ABORTIFHUNG,
            100,
            Some(&mut current),
        )
        .0 != 0
            && current != icon.0 as usize
        {
            SendMessageTimeoutW(
                window,
                WM_SETICON,
                WPARAM(size),
                LPARAM(icon.0 as isize),
                SMTO_ABORTIFHUNG,
                100,
                None,
            );
        }
    }
    BOOL(1)
}

unsafe fn brand_taskbar(window: HWND, icon: &str) -> windows::core::Result<()> {
    let store: IPropertyStore = SHGetPropertyStoreForWindow(window)?;
    for (pid, text) in [(3, format!("{icon},0")), (5, "UNIQUE.Minecraft".into())] {
        let key = PROPERTYKEY {
            fmtid: GUID::from_u128(0x9f4c2855_9f79_4b39_a8d0_e1d42de1d5f3),
            pid,
        };
        let value = PROPVARIANT::from(text.as_str());
        store.SetValue(&key, &value)?;
    }
    store.Commit()
}
