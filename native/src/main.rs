#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]
mod archive;
mod auth;
mod catalog;
mod crypto;
mod horizon;
mod minecraft;
mod net;
mod storage;
fn main() {
    let args = std::env::args().collect::<Vec<_>>();
    if let Some(index) = args.iter().position(|v| v == "--launch-probe") {
        if let Some(path) = args.get(index + 1) {
            let result = launch_probe(args.iter().any(|v| v == "--cancel-after-start"));
            let report = match result {
                Ok(value) => value,
                Err(error) => serde_json::json!({"success":false,"error":error}),
            };
            let _ = storage::atomic_write(
                std::path::Path::new(path),
                &serde_json::to_vec_pretty(&report).unwrap(),
            );
            return;
        }
    }
    if let Some(index) = args.iter().position(|v| v == "--network-probe") {
        if let Some(path) = args.get(index + 1) {
            let result = network_probe();
            let report = match result {
                Ok(value) => value,
                Err(error) => serde_json::json!({"success":false,"error":error}),
            };
            let success = report["success"] == true;
            let _ = storage::atomic_write(
                std::path::Path::new(path),
                &serde_json::to_vec_pretty(&report).unwrap(),
            );
            if !success {
                std::process::exit(1);
            }
            return;
        }
    }
    // The Rust migration uses the same renderer and host as the public 1.0.0 build.
    unique_launcher::launch();
}
fn launch_probe(cancel_after_start: bool) -> Result<serde_json::Value, String> {
    let folder = std::env::var_os("UNIQUE_NATIVE_DATA")
        .map(std::path::PathBuf::from)
        .ok_or("Launch probe requires an isolated UNIQUE_NATIVE_DATA profile")?;
    let mut store = storage::Store::open(folder)?;
    let instance = store
        .instances()
        .into_iter()
        .next()
        .ok_or("Launch fixture missing")?;
    let cancel = std::sync::Arc::new(std::sync::atomic::AtomicBool::new(false));
    let code = minecraft::launch(&mut store, &instance, &cancel, &|label, _, _| {
        if cancel_after_start && label == "Minecraft запущен" {
            cancel.store(true, std::sync::atomic::Ordering::Relaxed);
        }
    })?;
    Ok(
        serde_json::json!({"success":true,"exitCode":code,"cancelled":cancel_after_start,"scope":"Java fixture exercising real native launch pipeline, paths, identity, arguments, log persistence and process stop; not a Minecraft gameplay test"}),
    )
}
fn network_probe() -> Result<serde_json::Value, String> {
    let manifest = net::get_json(minecraft::MANIFEST)?;
    let id = manifest["latest"]["release"]
        .as_str()
        .ok_or("Mojang latest release missing")?;
    let fabric = net::get_json("https://meta.fabricmc.net/v2/versions/loader")?;
    let projects = catalog::search("sodium", "mod", 0, "1.20.1", "fabric")?;
    let version = manifest["versions"]
        .as_array()
        .and_then(|v| v.iter().find(|v| v["id"] == "1.20.1"))
        .ok_or("Mojang 1.20.1 missing")?;
    let details = net::get_json(version["url"].as_str().ok_or("Missing version URL")?)?;
    let json_bytes = serde_json::to_vec(&details).map_err(|e| e.to_string())?;
    if details["javaVersion"]["majorVersion"] != 17
        || !details["libraries"].is_array()
        || !minecraft::allows(&serde_json::Value::Null)
    {
        return Err("Unexpected Minecraft descriptor".into());
    }
    Ok(
        serde_json::json!({"success":true,"transport":"Windows WinHTTP with system TLS validation","mojangLatest":id,"fabricLoader":fabric[0]["version"],"modrinthMatches":projects["total_hits"],"minecraftDescriptorBytes":json_bytes.len(),"javaRequired":details["javaVersion"]["majorVersion"]}),
    )
}
