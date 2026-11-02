use crate::{crypto, storage};
use serde_json::Value;
use std::{
    ffi::c_void,
    fs,
    io::Write,
    path::Path,
    ptr,
    sync::{
        atomic::{AtomicBool, Ordering},
        Arc,
    },
};
use windows::{
    core::{w, PCWSTR},
    Win32::Networking::WinHttp::*,
};
pub type Cancel = Arc<AtomicBool>;
pub fn checkpoint(cancel: &Cancel) -> Result<(), String> {
    if cancel.load(Ordering::Relaxed) {
        Err("Operation cancelled by user".into())
    } else {
        Ok(())
    }
}
fn wide(value: &str) -> Vec<u16> {
    value.encode_utf16().chain(Some(0)).collect()
}
struct Handle(*mut c_void);
impl Handle {
    fn new(value: *mut c_void) -> Result<Self, String> {
        if value.is_null() {
            Err(windows::core::Error::from_win32().to_string())
        } else {
            Ok(Self(value))
        }
    }
}
impl Drop for Handle {
    fn drop(&mut self) {
        unsafe {
            let _ = WinHttpCloseHandle(self.0);
        }
    }
}
pub struct Response {
    request: Handle,
    _connection: Handle,
    _session: Handle,
    pub status: u32,
    pub total: u64,
}
impl Response {
    pub fn open(method: &str, address: &str, body: &[u8], headers: &str) -> Result<Self, String> {
        let url = url::Url::parse(address).map_err(|e| e.to_string())?;
        if url.scheme() != "https" || !url.username().is_empty() || url.password().is_some() {
            return Err("Only HTTPS downloads are allowed".into());
        }
        let host = wide(url.host_str().ok_or("URL has no host")?);
        let verb = wide(method);
        let object = wide(&format!(
            "{}{}",
            url.path(),
            url.query().map(|q| format!("?{q}")).unwrap_or_default()
        ));
        unsafe {
            let session = Handle::new(WinHttpOpen(
                w!("Unique-Launcher-Native/1.0.0"),
                WINHTTP_ACCESS_TYPE_AUTOMATIC_PROXY,
                None,
                None,
                0,
            ))?;
            WinHttpSetTimeouts(session.0, 10000, 15000, 20000, 20000).map_err(|e| e.to_string())?;
            let connection = Handle::new(WinHttpConnect(
                session.0,
                PCWSTR(host.as_ptr()),
                url.port_or_known_default().unwrap_or(443),
                0,
            ))?;
            let request = Handle::new(WinHttpOpenRequest(
                connection.0,
                PCWSTR(verb.as_ptr()),
                PCWSTR(object.as_ptr()),
                None,
                None,
                ptr::null(),
                WINHTTP_FLAG_SECURE,
            ))?;
            // WinHTTP's secure redirect policy rejects HTTPS to HTTP downgrades.
            let headers: Vec<u16> = headers.encode_utf16().collect();
            WinHttpSendRequest(
                request.0,
                Some(&headers),
                if body.is_empty() {
                    None
                } else {
                    Some(body.as_ptr().cast())
                },
                body.len() as u32,
                body.len() as u32,
                0,
            )
            .map_err(|e| e.to_string())?;
            WinHttpReceiveResponse(request.0, ptr::null_mut()).map_err(|e| e.to_string())?;
            let mut status = 0u32;
            let mut size = 4;
            WinHttpQueryHeaders(
                request.0,
                WINHTTP_QUERY_STATUS_CODE | WINHTTP_QUERY_FLAG_NUMBER,
                None,
                Some((&mut status as *mut u32).cast()),
                &mut size,
                ptr::null_mut(),
            )
            .map_err(|e| e.to_string())?;
            let mut length = [0u16; 64];
            let mut size = 128;
            let total = if WinHttpQueryHeaders(
                request.0,
                WINHTTP_QUERY_CONTENT_LENGTH,
                None,
                Some(length.as_mut_ptr().cast()),
                &mut size,
                ptr::null_mut(),
            )
            .is_ok()
            {
                String::from_utf16_lossy(&length[..(size as usize / 2).min(63)])
                    .trim_matches('\0')
                    .parse()
                    .unwrap_or(0)
            } else {
                0
            };
            Ok(Self {
                request,
                _connection: connection,
                _session: session,
                status,
                total,
            })
        }
    }
    pub fn read(&self, buffer: &mut [u8]) -> Result<usize, String> {
        let mut read = 0;
        unsafe {
            WinHttpReadData(
                self.request.0,
                buffer.as_mut_ptr().cast(),
                buffer.len() as u32,
                &mut read,
            )
            .map_err(|e| e.to_string())?;
        }
        Ok(read as usize)
    }
    pub fn bytes(&self, limit: usize) -> Result<Vec<u8>, String> {
        let mut result = Vec::new();
        let mut buffer = [0u8; 32768];
        loop {
            let n = self.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            if result.len() + n > limit {
                return Err("Server response exceeds size limit".into());
            }
            result.extend_from_slice(&buffer[..n]);
        }
        Ok(result)
    }
}
pub fn json(method: &str, url: &str, body: &[u8], headers: &str) -> Result<Value, String> {
    let response = Response::open(method, url, body, headers)?;
    if !(200..300).contains(&response.status) {
        return Err(format!(
            "HTTP {} ({})",
            response.status,
            url::Url::parse(url)
                .map(|u| u.host_str().unwrap_or("").to_owned())
                .unwrap_or_default()
        ));
    }
    serde_json::from_slice(&response.bytes(16 * 1024 * 1024)?)
        .map_err(|e| format!("Invalid server JSON: {e}"))
}
pub fn get_json(url: &str) -> Result<Value, String> {
    json("GET", url, &[], "Accept: application/json\r\n")
}
pub fn post_json(url: &str, value: &Value) -> Result<Value, String> {
    json(
        "POST",
        url,
        &serde_json::to_vec(value).map_err(|e| e.to_string())?,
        "Content-Type: application/json\r\n",
    )
}
pub fn form(url: &str, values: &[(&str, &str)]) -> Result<Value, String> {
    let body = url::form_urlencoded::Serializer::new(String::new())
        .extend_pairs(values.iter().copied())
        .finish();
    json(
        "POST",
        url,
        body.as_bytes(),
        "Content-Type: application/x-www-form-urlencoded\r\n",
    )
}
pub fn download(
    url: &str,
    path: &Path,
    expected_hash: &str,
    expected_size: u64,
    cancel: &Cancel,
    progress: &dyn Fn(u64, u64),
) -> Result<(), String> {
    checkpoint(cancel)?;
    if path.is_file()
        && (expected_size == 0
            || fs::metadata(path).map_err(|e| e.to_string())?.len() == expected_size)
        && !expected_hash.is_empty()
        && crypto::file_hash(
            if expected_hash.len() == 40 {
                "SHA1"
            } else {
                "SHA256"
            },
            path,
        )? == expected_hash
    {
        return Ok(());
    }
    fs::create_dir_all(path.parent().ok_or("Missing download directory")?)
        .map_err(|e| e.to_string())?;
    let partial = path.with_extension(format!("{}.part", crypto::random()?));
    let result = (|| {
        let response = Response::open("GET", url, &[], "")?;
        if response.status != 200 {
            return Err(format!("Download failed: HTTP {}", response.status));
        }
        if expected_size > 0 && response.total > 0 && expected_size != response.total {
            return Err("Download size does not match manifest".into());
        }
        let mut file = fs::OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&partial)
            .map_err(|e| e.to_string())?;
        let mut buffer = [0u8; 65536];
        let mut received = 0;
        loop {
            checkpoint(cancel)?;
            let n = response.read(&mut buffer)?;
            if n == 0 {
                break;
            }
            received += n as u64;
            if received > 4 * 1024 * 1024 * 1024 || (expected_size > 0 && received > expected_size)
            {
                return Err("Download exceeds expected size".into());
            }
            file.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
            progress(
                received,
                if expected_size > 0 {
                    expected_size
                } else {
                    response.total
                },
            );
        }
        file.sync_all().map_err(|e| e.to_string())?;
        drop(file);
        if expected_size > 0 && received != expected_size {
            return Err("Download was interrupted".into());
        }
        if !expected_hash.is_empty()
            && crypto::file_hash(
                if expected_hash.len() == 40 {
                    "SHA1"
                } else {
                    "SHA256"
                },
                &partial,
            )? != expected_hash
        {
            return Err("Downloaded file failed integrity verification".into());
        }
        checkpoint(cancel)?;
        storage::replace(&partial, path)
    })();
    if partial.exists() {
        let _ = fs::remove_file(partial);
    }
    result
}
