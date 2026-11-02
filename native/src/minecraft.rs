use crate::{
    archive, auth,
    net::{self, Cancel},
    storage::{self, Store},
};
use serde_json::{json, Value};
use std::{
    collections::HashMap,
    fs,
    io::Write,
    os::windows::process::CommandExt,
    path::{Path, PathBuf},
    process::{Command, Stdio},
    time::Duration,
};
pub const MANIFEST: &str = "https://piston-meta.mojang.com/mc/game/version_manifest_v2.json";
pub type Report<'a> = &'a dyn Fn(&str, u64, u64);
pub fn versions(folder: &Path) -> Result<Value, String> {
    let path = folder.join("version-manifest.json");
    match net::get_json(MANIFEST) {
        Ok(v) => {
            storage::atomic_write(&path, &serde_json::to_vec(&v).map_err(|e| e.to_string())?)?;
            Ok(v)
        }
        Err(e) => fs::read(path)
            .ok()
            .and_then(|b| serde_json::from_slice(&b).ok())
            .ok_or(e),
    }
}
pub fn allows(rules: &Value) -> bool {
    let Some(rules) = rules.as_array() else {
        return true;
    };
    let mut allowed = false;
    for rule in rules {
        if rule["features"]
            .as_object()
            .is_some_and(|v| v.values().any(|v| v == true))
        {
            continue;
        }
        if let Some(os) = rule.get("os") {
            if os["name"].as_str().is_some_and(|n| n != "windows") {
                continue;
            }
            if os["arch"]
                .as_str()
                .is_some_and(|a| !matches!(a, "x86_64" | "amd64"))
            {
                continue;
            }
            if let Some(version) = os["version"].as_str() {
                if !version.starts_with("^10") && !version.starts_with("10") {
                    continue;
                }
            }
        }
        allowed = rule["action"] == "allow";
    }
    allowed
}
fn string<'a>(value: &'a Value, key: &str) -> Result<&'a str, String> {
    value[key]
        .as_str()
        .ok_or_else(|| format!("Manifest missing {key}"))
}
fn descriptor(
    store: &Store,
    instance: &Value,
    root: &Path,
    cancel: &Cancel,
    report: Report,
) -> Result<(Value, String), String> {
    let id = string(instance, "minecraftVersion")?;
    if !storage::safe_name(id) {
        return Err("Invalid Minecraft version".into());
    }
    report("Версия Minecraft", 0, 0);
    net::checkpoint(cancel)?;
    let cache = root.join("versions").join(id).join(format!("{id}.json"));
    let manifest = versions(&store.folder)?;
    let version = manifest["versions"]
        .as_array()
        .and_then(|a| a.iter().find(|v| v["id"] == id))
        .ok_or("Версия Minecraft отсутствует в официальном списке")?;
    let mut base = if cache.exists() {
        serde_json::from_slice(&fs::read(&cache).map_err(|e| e.to_string())?)
            .map_err(|e| format!("Повреждено описание версии: {e}"))?
    } else {
        let value = net::get_json(string(version, "url")?)?;
        storage::atomic_write(
            &cache,
            &serde_json::to_vec(&value).map_err(|e| e.to_string())?,
        )?;
        value
    };
    let loader = instance["loader"].as_str().unwrap_or("vanilla");
    if matches!(loader, "fabric" | "quilt") {
        if !base["arguments"]["game"].is_array() {
            if let Some(text) = base["minecraftArguments"].as_str() {
                let args = text
                    .split_whitespace()
                    .map(|s| json!(s))
                    .collect::<Vec<_>>();
                base["arguments"] = json!({"game":args,"jvm":[]});
            }
        }
        report("Загрузчик модов", 0, 0);
        let host = if loader == "fabric" {
            "https://meta.fabricmc.net/v2"
        } else {
            "https://meta.quiltmc.org/v3"
        };
        let requested = instance["loaderVersion"].as_str().unwrap_or("latest");
        let version = if requested == "latest" {
            let list = net::get_json(&format!("{host}/versions/loader/{id}"))?;
            list[0]["loader"]["version"]
                .as_str()
                .ok_or("Нет совместимого загрузчика")?
                .to_owned()
        } else {
            requested.to_owned()
        };
        if !storage::safe_name(&version) {
            return Err("Invalid loader version".into());
        }
        let descriptor = net::get_json(&format!(
            "{host}/versions/loader/{id}/{version}/profile/json"
        ))?;
        let mut libraries = descriptor["libraries"]
            .as_array()
            .cloned()
            .unwrap_or_default();
        libraries.extend(base["libraries"].as_array().cloned().unwrap_or_default());
        base["libraries"] = json!(libraries);
        for kind in ["game", "jvm"] {
            let mut args = base["arguments"][kind]
                .as_array()
                .cloned()
                .unwrap_or_default();
            args.extend(
                descriptor["arguments"][kind]
                    .as_array()
                    .cloned()
                    .unwrap_or_default(),
            );
            base["arguments"][kind] = json!(args);
        }
        base["mainClass"] = descriptor["mainClass"].clone();
        base["id"] = descriptor["id"].clone();
    } else if loader != "vanilla" {
        return Err(format!("Загрузчик {loader} ещё не перенесён в native-версию. Сборка сохранена; используйте основную версию лаунчера."));
    }
    Ok((base, id.to_owned()))
}
fn maven(name: &str) -> Result<String, String> {
    let parts: Vec<_> = name.split(':').collect();
    if !(3..=4).contains(&parts.len()) {
        return Err("Invalid library coordinate".into());
    }
    if parts.iter().any(|s| {
        !s.bytes()
            .all(|c| c.is_ascii_alphanumeric() || b"._-".contains(&c))
    }) {
        return Err("Invalid library coordinate".into());
    }
    Ok(format!(
        "{}/{}/{}/{}-{}{}.jar",
        parts[0].replace('.', "/"),
        parts[1],
        parts[2],
        parts[1],
        parts[2],
        parts.get(3).map(|s| format!("-{s}")).unwrap_or_default()
    ))
}
fn download_artifact(
    item: &Value,
    path: &Path,
    cancel: &Cancel,
    report: Report,
    label: &str,
) -> Result<(), String> {
    net::download(
        string(item, "url")?,
        path,
        item["sha1"].as_str().unwrap_or(""),
        item["size"].as_u64().unwrap_or(0),
        cancel,
        &|received, total| report(label, received, total),
    )
}
fn java(settings: &Value, required: u64) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Some(path) = settings["javaPath"].as_str().filter(|p| !p.is_empty()) {
        candidates.push(PathBuf::from(path));
    }
    if let Some(home) = std::env::var_os("JAVA_HOME") {
        candidates.push(PathBuf::from(home).join("bin/java.exe"));
    }
    if let Some(paths) = std::env::var_os("PATH") {
        candidates.extend(std::env::split_paths(&paths).map(|p| p.join("java.exe")));
    }
    for variable in ["ProgramFiles", "LOCALAPPDATA"] {
        if let Some(root) = std::env::var_os(variable) {
            for folder in [
                "Java",
                "Eclipse Adoptium",
                "Microsoft",
                "Programs/Eclipse Adoptium",
            ] {
                if let Ok(entries) = fs::read_dir(PathBuf::from(&root).join(folder)) {
                    for entry in entries.flatten() {
                        candidates.push(entry.path().join("bin/java.exe"));
                    }
                }
            }
        }
    }
    for path in candidates {
        if !path.is_file() {
            continue;
        }
        let output = Command::new(&path)
            .arg("-version")
            .creation_flags(0x08000000)
            .output()
            .map_err(|e| e.to_string())?;
        let version = format!(
            "{}{}",
            String::from_utf8_lossy(&output.stderr),
            String::from_utf8_lossy(&output.stdout)
        );
        if java_major(&version) >= required {
            return Ok(path);
        }
    }
    Err(format!("Нужна Java {required} или новее. Установите Java или укажите путь к java.exe в настройках."))
}
pub fn java_major(text: &str) -> u64 {
    let version = text.split('"').nth(1).unwrap_or("");
    let version = version.strip_prefix("1.").unwrap_or(version);
    version
        .split(['.', '-', '_'])
        .next()
        .unwrap_or("")
        .parse()
        .unwrap_or(0)
}
fn arguments(value: &Value, replacements: &HashMap<&str, String>) -> Vec<String> {
    let mut result = Vec::new();
    if let Some(args) = value.as_array() {
        for item in args {
            let values = if item.is_string() {
                vec![item.as_str().unwrap()]
            } else if allows(&item["rules"]) {
                if let Some(v) = item["value"].as_str() {
                    vec![v]
                } else {
                    item["value"]
                        .as_array()
                        .map(|v| v.iter().filter_map(Value::as_str).collect())
                        .unwrap_or_default()
                }
            } else {
                Vec::new()
            };
            for value in values {
                let mut value = value.to_owned();
                for (key, replace) in replacements {
                    value = value.replace(&format!("${{{key}}}"), replace);
                }
                if !value.contains("${") {
                    result.push(value);
                }
            }
        }
    }
    result
}
pub fn launch(
    store: &mut Store,
    instance: &Value,
    cancel: &Cancel,
    report: Report,
) -> Result<i32, String> {
    let settings = store.settings();
    let game = store.instance_root(instance)?;
    let root = store.game_root();
    fs::create_dir_all(&game).map_err(|e| e.to_string())?;
    let logs = store.folder.join("logs");
    fs::create_dir_all(&logs).map_err(|e| e.to_string())?;
    let logfile = logs.join("native-game.log");
    let mut log = fs::OpenOptions::new()
        .append(true)
        .create(true)
        .open(logfile)
        .map_err(|e| e.to_string())?;
    writeln!(
        log,
        "\n[info] Launch requested: {} / {}",
        instance["name"], instance["minecraftVersion"]
    )
    .map_err(|e| e.to_string())?;
    let result = (|| {
        report("Аккаунт", 0, 0);
        let credentials = auth::credentials(store)?;
        net::checkpoint(cancel)?;
        let (version, base_id) = descriptor(store, instance, &root, cancel, report)?;
        let java = java(
            &settings,
            version["javaVersion"]["majorVersion"].as_u64().unwrap_or(8),
        )?;
        let client = root
            .join("versions")
            .join(&base_id)
            .join(format!("{base_id}.jar"));
        download_artifact(
            &version["downloads"]["client"],
            &client,
            cancel,
            report,
            "Minecraft client",
        )?;
        let natives = game.join("natives");
        fs::create_dir_all(&natives).map_err(|e| e.to_string())?;
        let mut classpath = Vec::new();
        for library in version["libraries"].as_array().ok_or("Missing libraries")? {
            net::checkpoint(cancel)?;
            if !allows(&library["rules"]) {
                continue;
            }
            let artifact = &library["downloads"]["artifact"];
            if artifact.is_object() {
                let path = storage::safe_join(&root.join("libraries"), string(artifact, "path")?)?;
                download_artifact(
                    artifact,
                    &path,
                    cancel,
                    report,
                    library["name"].as_str().unwrap_or("Library"),
                )?;
                classpath.push(path);
            } else if library["downloads"].is_null() {
                let relative = maven(string(library, "name")?)?;
                let path = storage::safe_join(&root.join("libraries"), &relative)?;
                if !path.is_file() {
                    let url = format!(
                        "{}/{}",
                        library["url"]
                            .as_str()
                            .unwrap_or("https://libraries.minecraft.net/")
                            .trim_end_matches('/'),
                        relative
                    );
                    net::download(&url, &path, "", 0, cancel, &|a, b| {
                        report("Библиотеки загрузчика", a, b)
                    })?;
                }
                classpath.push(path);
            }
            if let Some(classifier) = library["natives"]["windows"].as_str() {
                let key = classifier.replace("${arch}", "64");
                let artifact = &library["downloads"]["classifiers"][key];
                if !artifact.is_null() {
                    let path =
                        storage::safe_join(&root.join("libraries"), string(artifact, "path")?)?;
                    download_artifact(artifact, &path, cancel, report, "Native library")?;
                    archive::extract(&path, &natives, cancel, &|name| {
                        !name.starts_with("META-INF/")
                    })?;
                }
            }
        }
        classpath.push(client);
        let classpath = classpath
            .iter()
            .map(|p| p.to_string_lossy())
            .collect::<Vec<_>>()
            .join(";");
        let asset_index = &version["assetIndex"];
        let asset_id = string(asset_index, "id")?;
        let index = storage::safe_join(&root.join("assets/indexes"), &format!("{asset_id}.json"))?;
        download_artifact(asset_index, &index, cancel, report, "Индекс ресурсов")?;
        let index: Value = serde_json::from_slice(&fs::read(index).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;
        let objects = index["objects"].as_object().ok_or("Invalid asset index")?;
        let total = objects
            .values()
            .map(|v| v["size"].as_u64().unwrap_or(0))
            .sum::<u64>();
        let mut done = 0;
        for (name, item) in objects {
            net::checkpoint(cancel)?;
            let hash = string(item, "hash")?;
            if hash.len() != 40 || !hash.bytes().all(|c| c.is_ascii_hexdigit()) {
                return Err("Invalid asset hash".into());
            }
            let relative = format!("{}/{}", &hash[..2], hash);
            let path = storage::safe_join(&root.join("assets/objects"), &relative)?;
            let size = item["size"].as_u64().unwrap_or(0);
            net::download(
                &format!("https://resources.download.minecraft.net/{relative}"),
                &path,
                hash,
                size,
                cancel,
                &|received, _| report("Ресурсы Minecraft", done + received, total),
            )?;
            if index["virtual"] == true || index["map_to_resources"] == true {
                let base = if index["map_to_resources"] == true {
                    game.join("resources")
                } else {
                    root.join("assets/virtual").join(asset_id)
                };
                let target = storage::safe_join(&base, name)?;
                if !target.exists() {
                    fs::create_dir_all(target.parent().unwrap()).map_err(|e| e.to_string())?;
                    fs::copy(&path, target).map_err(|e| e.to_string())?;
                }
            }
            done += size;
            report("Ресурсы Minecraft", done, total);
        }
        let mut replacements = HashMap::new();
        for (key, value) in [
            (
                "auth_player_name",
                credentials["name"].as_str().unwrap_or("Player").to_owned(),
            ),
            (
                "auth_uuid",
                credentials["uuid"].as_str().unwrap_or("").to_owned(),
            ),
            (
                "auth_access_token",
                credentials["access_token"]
                    .as_str()
                    .unwrap_or("0")
                    .to_owned(),
            ),
            (
                "user_type",
                credentials["user_type"]
                    .as_str()
                    .unwrap_or("msa")
                    .to_owned(),
            ),
            ("version_name", string(&version, "id")?.to_owned()),
            ("version_type", "release".into()),
            ("game_directory", game.to_string_lossy().into_owned()),
            (
                "assets_root",
                root.join("assets").to_string_lossy().into_owned(),
            ),
            ("assets_index_name", asset_id.to_owned()),
            ("natives_directory", natives.to_string_lossy().into_owned()),
            ("launcher_name", "Unique Launcher".into()),
            ("launcher_version", "1.0.0".into()),
            ("classpath", classpath),
            ("classpath_separator", ";".into()),
            (
                "library_directory",
                root.join("libraries").to_string_lossy().into_owned(),
            ),
            ("user_properties", "{}".into()),
            ("auth_xuid", "".into()),
            ("clientid", "".into()),
            ("resolution_width", "1280".into()),
            ("resolution_height", "720".into()),
        ] {
            replacements.insert(key, value);
        }
        let mut args = arguments(&version["arguments"]["jvm"], &replacements);
        if args.is_empty() {
            args = vec![
                format!("-Djava.library.path={}", natives.display()),
                "-cp".into(),
                replacements["classpath"].clone(),
            ];
        }
        args.retain(|v| !v.starts_with("-Xmx") && !v.starts_with("-Xms"));
        args.push(format!(
            "-Xmx{}M",
            settings["memory"]["max"]
                .as_u64()
                .unwrap_or(2048)
                .clamp(512, 65536)
        ));
        args.push("-Dlog4j2.formatMsgNoLookups=true".into());
        if let Some(logging) = version["logging"]["client"].as_object() {
            if let Some(file) = logging.get("file") {
                let filename = file["id"].as_str().ok_or("Missing logging config")?;
                let path = storage::safe_join(&root.join("assets/log_configs"), filename)?;
                download_artifact(file, &path, cancel, report, "Конфигурация журнала")?;
                if let Some(argument) = logging.get("argument").and_then(Value::as_str) {
                    args.push(argument.replace("${path}", &path.to_string_lossy()));
                }
            }
        }
        args.push(string(&version, "mainClass")?.to_owned());
        let game_args = if version["arguments"]["game"].is_array() {
            arguments(&version["arguments"]["game"], &replacements)
        } else {
            let values: Vec<_> = string(&version, "minecraftArguments")?
                .split_whitespace()
                .map(|s| json!(s))
                .collect();
            arguments(&json!(values), &replacements)
        };
        args.extend(game_args);
        net::checkpoint(cancel)?;
        report("Запуск Minecraft", 0, 0);
        let mut child = Command::new(java)
            .args(args)
            .current_dir(&game)
            .stdin(Stdio::null())
            .stdout(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
            .stderr(Stdio::from(log.try_clone().map_err(|e| e.to_string())?))
            .creation_flags(0x08000000)
            .spawn()
            .map_err(|e| e.to_string())?;
        writeln!(log, "[info] Game process started: PID {}", child.id())
            .map_err(|e| e.to_string())?;
        report("Minecraft запущен", 1, 1);
        loop {
            if cancel.load(std::sync::atomic::Ordering::Relaxed) {
                child.kill().map_err(|e| e.to_string())?;
                let status = child.wait().map_err(|e| e.to_string())?;
                writeln!(
                    log,
                    "[warn] Game stopped by user: method=process-kill pid={} code={:?}",
                    child.id(),
                    status.code()
                )
                .map_err(|e| e.to_string())?;
                return Ok(status.code().unwrap_or(1));
            }
            if let Some(status) = child.try_wait().map_err(|e| e.to_string())? {
                writeln!(
                    log,
                    "[{}] Game process exited: method=process-exit pid={} code={:?}",
                    if status.success() { "info" } else { "error" },
                    child.id(),
                    status.code()
                )
                .map_err(|e| e.to_string())?;
                return Ok(status.code().unwrap_or(1));
            }
            std::thread::sleep(Duration::from_millis(200));
        }
    })();
    if let Err(error) = &result {
        let _ = writeln!(
            log,
            "[error] Launch interrupted: method={} reason={error}",
            if cancel.load(std::sync::atomic::Ordering::Relaxed) {
                "user-cancel"
            } else {
                "launch-error"
            }
        );
    }
    result
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn manifests_and_java() {
        assert_eq!(java_major("openjdk version \"25.0.1\""), 25);
        assert_eq!(java_major("java version \"1.8.0_321\""), 8);
        assert!(allows(&Value::Null));
        assert!(!allows(&json!([{"action":"allow","os":{"name":"linux"}}])));
        assert!(!allows(
            &json!([{"action":"allow","features":{"is_demo_user":true}}])
        ));
        assert_eq!(
            maven("net.fabricmc:loader:1.2.3").unwrap(),
            "net/fabricmc/loader/1.2.3/loader-1.2.3.jar"
        );
        assert!(maven("../evil:x:1").is_err());
    }
}
