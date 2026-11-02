use crate::{
    auth, crypto,
    minecraft::Report,
    net::{self, Cancel},
    storage::{self, Store},
};
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::{Duration, Instant},
};
fn copy_tree(source: &Path, target: &Path, cancel: &Cancel) -> Result<(), String> {
    net::checkpoint(cancel)?;
    let metadata = fs::symlink_metadata(source).map_err(|e| e.to_string())?;
    use std::os::windows::fs::MetadataExt;
    if metadata.file_attributes() & 0x400 != 0 {
        return Err("Horizon: ссылки в ресурсах запрещены".into());
    }
    if metadata.is_dir() {
        fs::create_dir_all(target).map_err(|e| e.to_string())?;
        for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            let destination = storage::safe_join(target, &entry.file_name().to_string_lossy())?;
            copy_tree(&entry.path(), &destination, cancel)?;
        }
    } else if metadata.is_file() {
        fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
        fs::copy(source, target).map_err(|e| e.to_string())?;
    } else {
        return Err("Неподдерживаемый файл Horizon".into());
    }
    Ok(())
}
fn digest(path: &Path) -> Result<String, String> {
    use std::os::windows::fs::MetadataExt;
    let metadata = fs::symlink_metadata(path).map_err(|e| e.to_string())?;
    if metadata.file_attributes() & 0x400 != 0 {
        return Err("Horizon: ссылки запрещены".into());
    }
    if metadata.is_file() {
        return crypto::file_hash("SHA256", path);
    }
    if !metadata.is_dir() {
        return Err("Unsupported Horizon file".into());
    }
    let mut entries = fs::read_dir(path)
        .map_err(|e| e.to_string())?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| e.to_string())?;
    entries.sort_by_key(|e| e.file_name());
    let mut values = Vec::new();
    for entry in entries {
        values.push(format!(
            "{}:{}",
            entry.file_name().to_string_lossy(),
            digest(&entry.path())?
        ));
    }
    crypto::hash("SHA256", values.join("\n").as_bytes())
}
fn resources(
    source: &Path,
    cache: &Path,
    cancel: &Cancel,
    report: Report,
) -> Result<PathBuf, String> {
    let manifest = source.join("unique-compact.json");
    if !manifest.is_file() {
        return Ok(source.to_path_buf());
    }
    let manifest: Value = serde_json::from_slice(&fs::read(manifest).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let bytes = fs::read(source.join("asset-index.json")).map_err(|e| e.to_string())?;
    let core = manifest["coreHash"]
        .as_str()
        .ok_or("Missing Horizon core hash")?;
    if core.len() != 64
        || !core.bytes().all(|c| c.is_ascii_hexdigit())
        || manifest["schema"] != 1
        || manifest["indexHash"] != crypto::hash("SHA256", &bytes)?
    {
        return Err("Повреждены ресурсы Minecraft Rust".into());
    }
    let target = storage::safe_join(cache, core)?;
    let ready = target.join(".unique-core-ready");
    if !ready.exists() {
        report("Подготовка ресурсов Minecraft Rust", 0, 0);
        copy_tree(source, &target, cancel)?;
        storage::atomic_write(&ready, core.as_bytes())?;
    }
    let index: Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    let objects = index["objects"]
        .as_object()
        .ok_or("Missing Horizon asset objects")?;
    let sounds = objects
        .iter()
        .filter(|(name, _)| name.starts_with("minecraft/sounds/"))
        .collect::<Vec<_>>();
    let total = sounds
        .iter()
        .map(|(_, v)| v["size"].as_u64().unwrap_or(0))
        .sum();
    let mut done = 0;
    for (name, item) in sounds {
        net::checkpoint(cancel)?;
        let hash = item["hash"].as_str().ok_or("Missing audio hash")?;
        if hash.len() != 40
            || !hash.bytes().all(|c| c.is_ascii_hexdigit())
            || !name.ends_with(".ogg")
        {
            return Err("Invalid Horizon audio entry".into());
        }
        let destination = storage::safe_join(&target.join("assets"), name)?;
        let size = item["size"].as_u64().ok_or("Missing audio size")?;
        net::download(
            &format!(
                "https://resources.download.minecraft.net/{}/{hash}",
                &hash[..2]
            ),
            &destination,
            hash,
            size,
            cancel,
            &|a, _| report("Звуки Minecraft Rust", done + a, total),
        )?;
        done += size;
        report("Звуки Minecraft Rust", done, total);
    }
    Ok(target)
}
fn sync(source: &Path, target: &Path, cancel: &Cancel) -> Result<usize, String> {
    fs::create_dir_all(target).map_err(|e| e.to_string())?;
    let manifest = target.join(".unique-native-horizon-import.json");
    let previous: Value = if manifest.exists() {
        serde_json::from_slice(&fs::read(&manifest).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?
    } else {
        json!({})
    };
    let mut files = json!({});
    for folder in ["resourcepacks", "horizon-mods"] {
        let directory = source.join(folder);
        if !directory.exists() {
            continue;
        }
        digest(&directory)?;
        for entry in fs::read_dir(directory).map_err(|e| e.to_string())? {
            net::checkpoint(cancel)?;
            let entry = entry.map_err(|e| e.to_string())?;
            let name = entry.file_name().to_string_lossy().into_owned();
            if name.ends_with(".disabled") {
                continue;
            }
            let relative = format!("{folder}/{name}");
            let destination = storage::safe_join(target, &relative)?;
            let hash = digest(&entry.path())?;
            if destination.exists() {
                let current = digest(&destination)?;
                if current == hash {
                    files[relative] = json!(hash);
                    continue;
                }
                if previous["files"][&relative] != current {
                    return Err(format!("Файл Rust-сборки изменён: {relative}. Сохраните его отдельно перед обновлением."));
                }
                if destination.is_dir() {
                    fs::remove_dir_all(&destination).map_err(|e| e.to_string())?;
                } else {
                    fs::remove_file(&destination).map_err(|e| e.to_string())?;
                }
            }
            copy_tree(&entry.path(), &destination, cancel)?;
            files[relative] = json!(hash);
        }
    }
    // Worlds and settings are copied once; an existing Rust world is never replaced.
    let saves = source.join("saves");
    if saves.exists() {
        digest(&saves)?;
        for entry in fs::read_dir(saves).map_err(|e| e.to_string())? {
            let entry = entry.map_err(|e| e.to_string())?;
            if !entry.file_type().map_err(|e| e.to_string())?.is_dir() {
                continue;
            }
            let name = entry.file_name().to_string_lossy().into_owned();
            let target = storage::safe_join(&target.join("saves"), &name)?;
            if !target.exists() {
                copy_tree(&entry.path(), &target, cancel)?;
            }
        }
    }
    for name in ["options.txt", "servers.dat"] {
        let original = source.join(name);
        let target = storage::safe_join(target, name)?;
        if original.exists() && !target.exists() {
            digest(&original)?;
            copy_tree(&original, &target, cancel)?;
        }
    }
    storage::atomic_write(
        &manifest,
        &serde_json::to_vec(&json!({"files":files})).map_err(|e| e.to_string())?,
    )?;
    Ok(fs::read_dir(source.join("mods"))
        .into_iter()
        .flatten()
        .filter_map(Result::ok)
        .filter(|e| e.path().extension().is_some_and(|x| x == "jar"))
        .count())
}
pub fn launch(
    store: &mut Store,
    instance: &Value,
    cancel: &Cancel,
    report: Report,
) -> Result<i32, String> {
    if store.data["lastSession"]["microsoft"] != true || store.data["lastSession"]["guest"] == true
    {
        return Err("Minecraft Rust требует Microsoft-аккаунт с Minecraft Java Edition".into());
    }
    let settings = store.settings();
    let exe = PathBuf::from(settings["horizonExecutable"].as_str().unwrap_or(""));
    let source = PathBuf::from(settings["horizonResources"].as_str().unwrap_or(""));
    if !exe.is_absolute()
        || !exe.is_file()
        || exe
            .file_name()
            .is_none_or(|n| n.to_string_lossy().to_lowercase() != "horizon-client.exe")
    {
        return Err("Укажите установленный horizon-client.exe во вкладке Minecraft Rust".into());
    }
    if !source.is_absolute() || !source.join("horizon-resources.json").is_file() {
        return Err("Укажите папку подготовленных ресурсов Minecraft Rust".into());
    }
    let credentials = auth::credentials(store)?;
    net::checkpoint(cancel)?;
    let logs = store.folder.join("logs");
    fs::create_dir_all(&logs).map_err(|e| e.to_string())?;
    let scratch = logs.join(format!("horizon-api-{}.json", crypto::random()?));
    let file = fs::File::create(&scratch).map_err(|e| e.to_string())?;
    let mut child = Command::new(&exe)
        .arg("--launch-api")
        .stdout(Stdio::from(file))
        .stderr(Stdio::null())
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| e.to_string())?;
    let deadline = Instant::now() + Duration::from_secs(10);
    loop {
        if cancel.load(std::sync::atomic::Ordering::Relaxed) || Instant::now() > deadline {
            let _ = child.kill();
            let _ = child.wait();
            let _ = fs::remove_file(&scratch);
            return Err("Horizon Launch API: запрос прерван или истёк таймаут".into());
        }
        if child.try_wait().map_err(|e| e.to_string())?.is_some() {
            break;
        }
        std::thread::sleep(Duration::from_millis(50));
    }
    let bytes = fs::read(&scratch).map_err(|e| e.to_string())?;
    let _ = fs::remove_file(scratch);
    if bytes.len() > 1024 * 1024 {
        return Err("Horizon API response too large".into());
    }
    let api: Value =
        serde_json::from_slice(&bytes).map_err(|_| "Некорректный Horizon Launch API")?;
    if !api["launch_api"].as_str().unwrap_or("").starts_with("0.1.")
        || ["--resources", "--game-dir", "--home", "--session-stdin"]
            .iter()
            .any(|name| {
                !api["options"]
                    .as_array()
                    .into_iter()
                    .flatten()
                    .any(|v| v["name"] == *name)
            })
    {
        return Err("Обновите Horizon: нужен Launch API 0.1".into());
    }
    let resources = resources(
        &source,
        &store.game_root().join("horizon/resources"),
        cancel,
        report,
    )?;
    let owner = crypto::hash("SHA256", store.nickname().as_bytes())?;
    let id = instance["id"].as_str().ok_or("Missing instance ID")?;
    let root = storage::safe_join(
        &store.game_root(),
        &format!("horizon/{}/{id}", &owner[..24]),
    )?;
    let skipped = sync(&store.instance_root(instance)?, &root, cancel)?;
    let mut log = fs::OpenOptions::new()
        .append(true)
        .create(true)
        .open(logs.join("native-game.log"))
        .map_err(|e| e.to_string())?;
    writeln!(
        log,
        "[info] Rust launch prepared; Java mods skipped: {skipped}"
    )
    .map_err(|e| e.to_string())?;
    net::checkpoint(cancel)?;
    let mut child = Command::new(exe)
        .args(["--resources"])
        .arg(resources)
        .arg("--game-dir")
        .arg(&root)
        .arg("--home")
        .arg(&root)
        .arg("--session-stdin")
        .current_dir(&root)
        .stdin(Stdio::piped())
        .stdout(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
        .stderr(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
        .creation_flags(0x08000000)
        .spawn()
        .map_err(|e| e.to_string())?;
    let session = json!({"name":credentials["name"],"uuid":credentials["uuid"],"access_token":credentials["access_token"],"user_type":"msa"});
    if let Some(mut input) = child.stdin.take() {
        if let Err(error) =
            input.write_all(&serde_json::to_vec(&session).map_err(|e| e.to_string())?)
        {
            let _ = child.kill();
            let _ = child.wait();
            return Err(error.to_string());
        }
    }
    writeln!(log, "[info] Rust process started: pid={}", child.id()).map_err(|e| e.to_string())?;
    report("Minecraft Rust запущен", 1, 1);
    loop {
        if cancel.load(std::sync::atomic::Ordering::Relaxed) {
            let _ = child.kill();
            let status = child.wait().map_err(|e| e.to_string())?;
            writeln!(
                log,
                "[warn] Rust stopped by user: method=process-kill code={:?}",
                status.code()
            )
            .map_err(|e| e.to_string())?;
            return Ok(status.code().unwrap_or(1));
        }
        if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
            writeln!(
                log,
                "[info] Rust finished: method=process-exit code={:?}",
                status.code()
            )
            .map_err(|e| e.to_string())?;
            return Ok(status.code().unwrap_or(1));
        }
        std::thread::sleep(Duration::from_millis(200));
    }
}
