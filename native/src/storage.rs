use crate::crypto;
use serde_json::{json, Value};
use std::{
    fs,
    io::Write,
    path::{Component, Path, PathBuf},
};
use windows::{
    core::PCWSTR,
    Win32::Storage::FileSystem::{MoveFileExW, MOVEFILE_REPLACE_EXISTING, MOVEFILE_WRITE_THROUGH},
};

pub fn atomic_write(path: &Path, bytes: &[u8]) -> Result<(), String> {
    fs::create_dir_all(path.parent().ok_or("Missing parent folder")?).map_err(|e| e.to_string())?;
    let temp = path.with_extension(format!("{}.tmp", crypto::random()?));
    let result = (|| {
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temp)
            .map_err(|e| e.to_string())?;
        file.write_all(bytes)
            .and_then(|_| file.sync_all())
            .map_err(|e| e.to_string())?;
        drop(file);
        replace(&temp, path)
    })();
    if temp.exists() {
        let _ = fs::remove_file(temp);
    }
    result
}
pub fn replace(source: &Path, target: &Path) -> Result<(), String> {
    let a: Vec<u16> = source.as_os_str().encode_wide().chain(Some(0)).collect();
    let b: Vec<u16> = target.as_os_str().encode_wide().chain(Some(0)).collect();
    unsafe {
        MoveFileExW(
            PCWSTR(a.as_ptr()),
            PCWSTR(b.as_ptr()),
            MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH,
        )
        .map_err(|e| e.to_string())
    }
}
use std::os::windows::ffi::OsStrExt;
pub fn safe_name(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 200
        && !name.ends_with(['.', ' '])
        && !name
            .chars()
            .any(|c| c.is_control() || "\\/:*?\"<>|".contains(c))
        && !matches!(
            name.split('.').next().unwrap_or("").to_uppercase().as_str(),
            "CON"
                | "PRN"
                | "AUX"
                | "NUL"
                | "COM1"
                | "COM2"
                | "COM3"
                | "COM4"
                | "COM5"
                | "COM6"
                | "COM7"
                | "COM8"
                | "COM9"
                | "LPT1"
                | "LPT2"
                | "LPT3"
                | "LPT4"
                | "LPT5"
                | "LPT6"
                | "LPT7"
                | "LPT8"
                | "LPT9"
        )
}
pub fn safe_join(base: &Path, relative: &str) -> Result<PathBuf, String> {
    if relative.is_empty() || relative.contains('\\') || Path::new(relative).is_absolute() {
        return Err("Invalid relative path".into());
    }
    let mut path = base.to_path_buf();
    for part in Path::new(relative).components() {
        let Component::Normal(name) = part else {
            return Err("Path escapes instance folder".into());
        };
        if !safe_name(&name.to_string_lossy()) {
            return Err("Invalid file name".into());
        }
        path.push(name);
        if fs::symlink_metadata(&path).is_ok_and(|m| {
            use std::os::windows::fs::MetadataExt;
            m.file_attributes() & 0x400 != 0
        }) {
            return Err("Linked game folders are not supported".into());
        }
    }
    Ok(path)
}
pub struct Store {
    pub data: Value,
    pub folder: PathBuf,
    path: PathBuf,
    pub imported: bool,
}
fn credentials(value: &mut Value, encrypt: bool) -> Result<(), String> {
    match value {
        Value::Object(map) => {
            for (key, value) in map {
                if matches!(
                    key.as_str(),
                    "refreshToken" | "sessionToken" | "access_token" | "accessToken"
                ) && value.as_str().is_some_and(|v| !v.is_empty())
                {
                    *value = json!(if encrypt {
                        crypto::protect(value.as_str().unwrap())?
                    } else {
                        crypto::unprotect(value.as_str().unwrap())?
                    });
                } else {
                    credentials(value, encrypt)?;
                }
            }
        }
        Value::Array(list) => {
            for item in list {
                credentials(item, encrypt)?;
            }
        }
        _ => {}
    }
    Ok(())
}
impl Store {
    pub fn open(folder: PathBuf) -> Result<Self, String> {
        let path = folder.join("native-rust.json");
        let imported = !path.exists() && folder.join("launcher-data.json").exists();
        let source = if imported {
            folder.join("launcher-data.json")
        } else {
            path.clone()
        };
        let mut data = if source.exists() {
            if fs::metadata(&source).map_err(|e| e.to_string())?.len() > 32 * 1024 * 1024 {
                return Err("Configuration is too large".into());
            }
            let value: Value =
                serde_json::from_slice(&fs::read(source).map_err(|e| e.to_string())?)
                    .map_err(|e| format!("Configuration is damaged; original retained: {e}"))?;
            if !value.is_object() {
                return Err("Configuration must be an object".into());
            }
            value
        } else {
            json!({})
        };
        credentials(&mut data, false)?;
        Ok(Self {
            data,
            folder,
            path,
            imported,
        })
    }
    pub fn save(&self) -> Result<(), String> {
        let mut data = self.data.clone();
        credentials(&mut data, true)?;
        atomic_write(
            &self.path,
            &serde_json::to_vec_pretty(&data).map_err(|e| e.to_string())?,
        )
    }
    pub fn nickname(&self) -> &str {
        self.data["lastSession"]["nickname"].as_str().unwrap_or("")
    }
    pub fn settings(&self) -> Value {
        let mut value = json!({"minecraftVersion":"1.20.1","modLoader":"vanilla","memory":{"max":2048},"javaPath":"","showSnapshots":false,"language":"ru","appearance":{"reduceMotion":true}});
        if let Some(settings) = self.data["settings"].as_object() {
            for (key, item) in settings {
                value[key] = item.clone();
            }
        }
        if let Some(settings) = self.data["userSettings"][self.nickname()].as_object() {
            for (key, item) in settings {
                value[key] = item.clone();
            }
        }
        value
    }
    pub fn set_settings(&mut self, settings: Value) -> Result<(), String> {
        self.replace_settings(settings);
        self.save()
    }
    fn replace_settings(&mut self, settings: Value) {
        let name = self.nickname().to_owned();
        if name.is_empty() {
            self.data["settings"] = settings;
        } else {
            if !self.data["userSettings"].is_object() {
                self.data["userSettings"] = json!({});
            }
            self.data["userSettings"][name] = settings;
        }
    }
    pub fn accounts(&self) -> Vec<Value> {
        self.data["savedAccounts"]
            .as_array()
            .cloned()
            .unwrap_or_default()
    }
    pub fn login(&mut self, account: Value) -> Result<(), String> {
        let mut list = self.accounts();
        list.retain(|a| a["nickname"] != account["nickname"]);
        list.insert(0, account.clone());
        list.truncate(8);
        self.data["savedAccounts"] = json!(list);
        self.data["lastSession"] = account;
        self.save()
    }
    pub fn instances(&self) -> Vec<Value> {
        self.data["buildInstances"][if self.nickname().is_empty() {
            "global"
        } else {
            self.nickname()
        }]
        .as_array()
        .cloned()
        .unwrap_or_default()
    }
    pub fn create_instance(
        &mut self,
        name: &str,
        version: &str,
        loader: &str,
    ) -> Result<(), String> {
        self.insert_instance(name, version, loader)?;
        self.save()
    }
    pub fn insert_instance(
        &mut self,
        name: &str,
        version: &str,
        loader: &str,
    ) -> Result<(), String> {
        if name.trim().is_empty()
            || !safe_name(version)
            || !matches!(loader, "vanilla" | "fabric" | "quilt")
        {
            return Err("Invalid instance settings".into());
        }
        let id = format!("inst_{}", crypto::random()?);
        let owner = if self.nickname().is_empty() {
            "global"
        } else {
            self.nickname()
        }
        .to_owned();
        let mut list = self.instances();
        list.insert(0,json!({"id":id,"name":name.trim(),"minecraftVersion":version,"loader":loader,"loaderVersion":"latest","source":"custom"}));
        if !self.data["buildInstances"].is_object() {
            self.data["buildInstances"] = json!({});
        }
        self.data["buildInstances"][owner] = json!(list);
        let mut settings = self.settings();
        settings["activeInstanceId"] = json!(id);
        self.replace_settings(settings);
        Ok(())
    }
    pub fn game_root(&self) -> PathBuf {
        if let Some(root) = self.data["gameStorageRoot"]
            .as_str()
            .filter(|r| Path::new(r).is_absolute())
        {
            return PathBuf::from(root);
        }
        self.folder.join("minecraft")
    }
    pub fn instance_root(&self, instance: &Value) -> Result<PathBuf, String> {
        let id = instance["id"].as_str().ok_or("Missing instance ID")?;
        if !id
            .bytes()
            .all(|c| c.is_ascii_alphanumeric() || c == b'_' || c == b'-')
            || id.is_empty()
        {
            return Err("Invalid instance ID".into());
        }
        if self.data["legacyGameInstance"].as_str() == Some(&format!("{}:{id}", self.nickname())) {
            return Ok(self.game_root());
        }
        safe_join(
            &self.game_root(),
            &format!(
                "instances/{}/{id}",
                &crypto::hash("SHA256", self.nickname().as_bytes())?[..24]
            ),
        )
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn paths_and_import_are_safe() {
        let folder =
            std::env::temp_dir().join(format!("unique-rust-test-{}", crypto::random().unwrap()));
        fs::create_dir_all(&folder).unwrap();
        let original=br#"{"lastSession":{"nickname":"Test"},"buildInstances":{"Test":[{"id":"one","name":"Original"}]},"unknown":{"preserve":true}}"#;
        fs::write(folder.join("launcher-data.json"), original).unwrap();
        let mut store = Store::open(folder.clone()).unwrap();
        assert!(store.imported);
        assert_eq!(store.instances().len(), 1);
        store.create_instance("New", "1.21.4", "fabric").unwrap();
        assert_eq!(store.instances().len(), 2);
        assert_eq!(store.data["unknown"]["preserve"], true);
        assert_eq!(
            fs::read(folder.join("launcher-data.json")).unwrap(),
            original
        );
        for invalid in [
            "../oops",
            "/absolute",
            "a/../../b",
            "a\\b",
            "CON.txt",
            "a/b.",
            "C:/Windows",
        ] {
            assert!(safe_join(&folder, invalid).is_err(), "{invalid}");
        }
        assert!(safe_join(&folder, "a/safe.jar")
            .unwrap()
            .starts_with(&folder));
        fs::write(folder.join("native-rust.json"), b"invalid").unwrap();
        assert!(Store::open(folder.clone()).is_err());
        fs::remove_dir_all(folder).unwrap();
    }
}
