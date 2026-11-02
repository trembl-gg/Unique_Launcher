use crate::{
    archive,
    minecraft::Report,
    net::{self, Cancel},
    storage::{self, Store},
};
use serde_json::{json, Value};
use std::{fs, path::Path};
pub fn search(
    query: &str,
    kind: &str,
    offset: usize,
    version: &str,
    loader: &str,
) -> Result<Value, String> {
    if !matches!(kind, "mod" | "modpack" | "resourcepack" | "shader") {
        return Err("Unknown content type".into());
    }
    let mut facets = vec![vec![format!("project_type:{kind}")]];
    if !version.is_empty() {
        facets.push(vec![format!("versions:{version}")]);
    }
    if kind == "mod" && loader != "vanilla" && !loader.is_empty() {
        facets.push(vec![format!("categories:{loader}")]);
    }
    let mut url = url::Url::parse("https://api.modrinth.com/v2/search").unwrap();
    url.query_pairs_mut()
        .append_pair("query", query)
        .append_pair("limit", "20")
        .append_pair("offset", &offset.to_string())
        .append_pair(
            "facets",
            &serde_json::to_string(&facets).map_err(|e| e.to_string())?,
        );
    net::get_json(url.as_str())
}
pub fn install(
    store: &mut Store,
    project: &Value,
    instance: &Value,
    kind: &str,
    cancel: &Cancel,
    report: Report,
) -> Result<(), String> {
    let id = project["project_id"]
        .as_str()
        .ok_or("Missing Modrinth project")?;
    if !id.bytes().all(|c| c.is_ascii_alphanumeric()) {
        return Err("Invalid Modrinth project ID".into());
    }
    let mut url =
        url::Url::parse(&format!("https://api.modrinth.com/v2/project/{id}/version")).unwrap();
    if kind != "modpack" {
        let version = instance["minecraftVersion"]
            .as_str()
            .ok_or("Выберите сборку")?;
        url.query_pairs_mut()
            .append_pair("game_versions", &json!([version]).to_string());
        if kind == "mod" {
            let loader = instance["loader"].as_str().unwrap_or("fabric");
            url.query_pairs_mut()
                .append_pair("loaders", &json!([loader]).to_string());
        }
    }
    let versions = net::get_json(url.as_str())?;
    let version = versions
        .as_array()
        .and_then(|v| v.first())
        .ok_or("Нет совместимой версии проекта")?;
    let files = version["files"].as_array().ok_or("Missing project files")?;
    let file = files
        .iter()
        .find(|f| f["primary"] == true)
        .or_else(|| files.first())
        .ok_or("Project has no files")?;
    if kind == "modpack" {
        let name = project["title"].as_str().unwrap_or("Modrinth modpack");
        let temp = store
            .folder
            .join("downloads")
            .join(format!("{}.mrpack", crate::crypto::random()?));
        download(file, &temp, cancel, report)?;
        let stage = store
            .folder
            .join("downloads")
            .join(format!("pack_{}", crate::crypto::random()?));
        let result = (|| {
            archive::extract(&temp, &stage, cancel, &|name| name == "modrinth.index.json")?;
            let index: Value = serde_json::from_slice(
                &fs::read(stage.join("modrinth.index.json")).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            if index["formatVersion"] != 1 || index["game"] != "minecraft" {
                return Err("Unsupported mrpack format".into());
            }
            let minecraft = index["dependencies"]["minecraft"]
                .as_str()
                .ok_or("Modpack has no Minecraft version")?;
            let (loader, version) = if let Some(v) = index["dependencies"]["fabric-loader"].as_str()
            {
                ("fabric", v)
            } else if let Some(v) = index["dependencies"]["quilt-loader"].as_str() {
                ("quilt", v)
            } else if index["dependencies"]["forge"].is_string()
                || index["dependencies"]["neoforge"].is_string()
            {
                return Err("Forge/NeoForge ещё не перенесены. Пакет сохранён, основная версия лаунчера поддерживает эти сборки.".into());
            } else {
                ("vanilla", "latest")
            };
            // Save the new instance only after every downloaded file has been verified.
            let mut working = Store::open(store.folder.clone())?;
            working.data = store.data.clone();
            working.insert_instance(name, minecraft, loader)?;
            let mut pack = working
                .instances()
                .first()
                .cloned()
                .ok_or("Instance creation failed")?;
            pack["loaderVersion"] = json!(version);
            let root = working.instance_root(&pack)?;
            fs::create_dir_all(&root).map_err(|e| e.to_string())?;
            for item in index["files"].as_array().ok_or("Missing mrpack files")? {
                net::checkpoint(cancel)?;
                if item["env"]["client"] == "unsupported" {
                    continue;
                }
                let path = item["path"].as_str().ok_or("Missing mrpack path")?;
                let target = storage::safe_join(&root, path)?;
                let url = item["downloads"][0]
                    .as_str()
                    .ok_or("Missing mrpack download")?;
                let hash = item["hashes"]["sha1"]
                    .as_str()
                    .ok_or("Missing mrpack SHA1")?;
                net::download(
                    url,
                    &target,
                    hash,
                    item["fileSize"].as_u64().unwrap_or(0),
                    cancel,
                    &|a, b| report(path, a, b),
                )?;
            }
            for prefix in ["overrides/", "client-overrides/"] {
                let extracted = stage.join(prefix.trim_end_matches('/'));
                archive::extract(&temp, &stage, cancel, &|name| name.starts_with(prefix))?;
                if extracted.is_dir() {
                    copy_tree(&extracted, &root, cancel)?;
                }
            }
            let owner = if working.nickname().is_empty() {
                "global"
            } else {
                working.nickname()
            }
            .to_owned();
            working.data["buildInstances"][owner][0] = pack;
            working.save()?;
            store.data = working.data;
            Ok(())
        })();
        // The download stays available for retry/import; only our random staging folder is removed.
        if stage.starts_with(store.folder.join("downloads"))
            && stage
                .file_name()
                .is_some_and(|n| n.to_string_lossy().starts_with("pack_"))
        {
            let _ = fs::remove_dir_all(stage);
        }
        result
    } else {
        let directory = match kind {
            "mod" => "mods",
            "resourcepack" => "resourcepacks",
            "shader" => "shaderpacks",
            _ => return Err("Unsupported content type".into()),
        };
        let root = store.instance_root(instance)?.join(directory);
        let filename = file["filename"].as_str().ok_or("Missing filename")?;
        let target = storage::safe_join(&root, filename)?;
        if target.exists() {
            return Err("Файл уже установлен. Существующий файл сохранён.".into());
        }
        download(file, &target, cancel, report)
    }
}
fn download(file: &Value, target: &Path, cancel: &Cancel, report: Report) -> Result<(), String> {
    let hash = file["hashes"]["sha1"]
        .as_str()
        .ok_or("Missing download integrity hash")?;
    net::download(
        file["url"].as_str().ok_or("Missing download URL")?,
        target,
        hash,
        file["size"].as_u64().unwrap_or(0),
        cancel,
        &|a, b| report(file["filename"].as_str().unwrap_or("Modrinth"), a, b),
    )
}
fn copy_tree(source: &Path, target: &Path, cancel: &Cancel) -> Result<(), String> {
    for entry in fs::read_dir(source).map_err(|e| e.to_string())? {
        net::checkpoint(cancel)?;
        let entry = entry.map_err(|e| e.to_string())?;
        let destination = storage::safe_join(target, &entry.file_name().to_string_lossy())?;
        let kind = entry.file_type().map_err(|e| e.to_string())?;
        if kind.is_symlink() {
            return Err("Linked files are forbidden".into());
        }
        if kind.is_dir() {
            fs::create_dir_all(&destination).map_err(|e| e.to_string())?;
            copy_tree(&entry.path(), &destination, cancel)?;
        } else {
            fs::create_dir_all(target).map_err(|e| e.to_string())?;
            fs::copy(entry.path(), destination).map_err(|e| e.to_string())?;
        }
    }
    Ok(())
}
pub fn latest() -> Result<Value, String> {
    let release =
        net::get_json("https://api.github.com/repos/trembl-gg/Unique_Launcher/releases/latest")?;
    let tag = release["tag_name"].as_str().ok_or("Missing release tag")?;
    let latest = parse_version(tag)?;
    let current = parse_version(env!("CARGO_PKG_VERSION"))?;
    let url = release["html_url"].as_str().ok_or("Missing release URL")?;
    let parsed = url::Url::parse(url).map_err(|e| e.to_string())?;
    if parsed.scheme() != "https"
        || parsed.host_str() != Some("github.com")
        || !parsed
            .path()
            .starts_with("/trembl-gg/Unique_Launcher/releases/tag/")
        || !parsed.username().is_empty()
        || parsed.password().is_some()
    {
        return Err("Invalid release URL".into());
    }
    Ok(
        json!({"available":latest>current,"version":tag,"notes":release["body"].as_str().unwrap_or(""),"url":url}),
    )
}
fn parse_version(value: &str) -> Result<[u32; 3], String> {
    let value = value.trim().trim_start_matches('v');
    let list: Vec<_> = value.split('.').collect();
    if list.len() != 3 {
        return Err("Invalid release version".into());
    }
    let mut result = [0; 3];
    for (i, v) in list.iter().enumerate() {
        result[i] = v.parse().map_err(|_| "Invalid release version")?;
    }
    Ok(result)
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn stable_versions() {
        assert!(parse_version("v1.10.0").unwrap() > parse_version("1.9.0").unwrap());
        assert!(parse_version("v1.0.0-beta").is_err());
    }
}
