use std::{fs::File, io::Read, path::Path};
use windows::{core::PCWSTR, Win32::Security::Cryptography::*};

pub fn random() -> Result<String, String> {
    let mut bytes = [0u8; 24];
    unsafe {
        BCryptGenRandom(None, &mut bytes, BCRYPT_USE_SYSTEM_PREFERRED_RNG)
            .ok()
            .map_err(|e| e.to_string())?;
    }
    Ok(hex(&bytes))
}
pub fn hex(bytes: &[u8]) -> String {
    bytes.iter().map(|b| format!("{b:02x}")).collect()
}
pub struct Digest {
    algorithm: BCRYPT_ALG_HANDLE,
    hash: BCRYPT_HASH_HANDLE,
    buffer: Vec<u8>,
    length: usize,
}
impl Digest {
    pub fn new(name: &str) -> Result<Self, String> {
        let wide: Vec<u16> = name.encode_utf16().chain(Some(0)).collect();
        unsafe {
            let mut algorithm = BCRYPT_ALG_HANDLE::default();
            BCryptOpenAlgorithmProvider(
                &mut algorithm,
                PCWSTR(wide.as_ptr()),
                None,
                BCRYPT_OPEN_ALGORITHM_PROVIDER_FLAGS(0),
            )
            .ok()
            .map_err(|e| e.to_string())?;
            let mut result = Self {
                algorithm,
                hash: BCRYPT_HASH_HANDLE::default(),
                buffer: Vec::new(),
                length: 0,
            };
            let mut size = [0u8; 4];
            let mut used = 0;
            BCryptGetProperty(
                algorithm.into(),
                BCRYPT_OBJECT_LENGTH,
                Some(&mut size),
                &mut used,
                0,
            )
            .ok()
            .map_err(|e| e.to_string())?;
            result.buffer.resize(u32::from_ne_bytes(size) as usize, 0);
            BCryptGetProperty(
                algorithm.into(),
                BCRYPT_HASH_LENGTH,
                Some(&mut size),
                &mut used,
                0,
            )
            .ok()
            .map_err(|e| e.to_string())?;
            result.length = u32::from_ne_bytes(size) as usize;
            BCryptCreateHash(
                algorithm,
                &mut result.hash,
                Some(&mut result.buffer),
                None,
                0,
            )
            .ok()
            .map_err(|e| e.to_string())?;
            Ok(result)
        }
    }
    pub fn update(&self, bytes: &[u8]) -> Result<(), String> {
        unsafe {
            BCryptHashData(self.hash, bytes, 0)
                .ok()
                .map_err(|e| e.to_string())
        }
    }
    pub fn finish(self) -> Result<Vec<u8>, String> {
        let mut bytes = vec![0; self.length];
        unsafe {
            BCryptFinishHash(self.hash, &mut bytes, 0)
                .ok()
                .map_err(|e| e.to_string())?;
        }
        Ok(bytes)
    }
}
impl Drop for Digest {
    fn drop(&mut self) {
        unsafe {
            let _ = BCryptDestroyHash(self.hash);
            let _ = BCryptCloseAlgorithmProvider(self.algorithm, 0);
        }
    }
}
pub fn hash(name: &str, bytes: &[u8]) -> Result<String, String> {
    let digest = Digest::new(name)?;
    digest.update(bytes)?;
    Ok(hex(&digest.finish()?))
}
pub fn file_hash(name: &str, file: &Path) -> Result<String, String> {
    let mut file = File::open(file).map_err(|e| e.to_string())?;
    let digest = Digest::new(name)?;
    let mut buffer = [0u8; 65536];
    loop {
        let count = file.read(&mut buffer).map_err(|e| e.to_string())?;
        if count == 0 {
            break;
        }
        digest.update(&buffer[..count])?;
    }
    Ok(hex(&digest.finish()?))
}
pub fn offline_uuid(name: &str) -> Result<String, String> {
    let digest = Digest::new("MD5")?;
    digest.update(format!("OfflinePlayer:{name}").as_bytes())?;
    let mut bytes = digest.finish()?;
    bytes[6] = bytes[6] & 15 | 48;
    bytes[8] = bytes[8] & 63 | 128;
    Ok(hex(&bytes))
}
pub fn base64url(bytes: &[u8]) -> String {
    const TABLE: &[u8] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
    let mut output = String::new();
    for chunk in bytes.chunks(3) {
        let value = ((chunk[0] as u32) << 16)
            | ((chunk.get(1).copied().unwrap_or(0) as u32) << 8)
            | chunk.get(2).copied().unwrap_or(0) as u32;
        for i in 0..chunk.len() + 1 {
            output.push(TABLE[((value >> (18 - i * 6)) & 63) as usize] as char);
        }
    }
    output
}
pub fn protect(secret: &str) -> Result<String, String> {
    let input = CRYPT_INTEGER_BLOB {
        cbData: secret.len() as u32,
        pbData: secret.as_ptr() as *mut u8,
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptProtectData(
            &input,
            windows::core::w!("Unique Launcher Native"),
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|e| e.to_string())?;
        let result = format!(
            "dpapi:{}",
            hex(std::slice::from_raw_parts(
                output.pbData,
                output.cbData as usize
            ))
        );
        let _ = windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(
            output.pbData.cast(),
        )));
        Ok(result)
    }
}
pub fn unprotect(secret: &str) -> Result<String, String> {
    let Some(secret) = secret.strip_prefix("dpapi:") else {
        return Ok(secret.into());
    };
    if secret.len() % 2 != 0
        || secret.len() > 1024 * 1024
        || !secret.bytes().all(|b| b.is_ascii_hexdigit())
    {
        return Err("Invalid protected token".into());
    }
    let mut bytes = (0..secret.len())
        .step_by(2)
        .map(|i| u8::from_str_radix(&secret[i..i + 2], 16))
        .collect::<Result<Vec<_>, _>>()
        .map_err(|_| "Invalid protected token")?;
    let input = CRYPT_INTEGER_BLOB {
        cbData: bytes.len() as u32,
        pbData: bytes.as_mut_ptr(),
    };
    let mut output = CRYPT_INTEGER_BLOB::default();
    unsafe {
        CryptUnprotectData(
            &input,
            None,
            None,
            None,
            None,
            CRYPTPROTECT_UI_FORBIDDEN,
            &mut output,
        )
        .map_err(|_| {
            "Не удалось расшифровать аккаунт Windows. Войдите в аккаунт заново.".to_owned()
        })?;
        let result = String::from_utf8(
            std::slice::from_raw_parts(output.pbData, output.cbData as usize).to_vec(),
        )
        .map_err(|e| e.to_string());
        let _ = windows::Win32::Foundation::LocalFree(Some(windows::Win32::Foundation::HLOCAL(
            output.pbData.cast(),
        )));
        result
    }
}
#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn known_hashes_and_offline_identity() {
        assert_eq!(
            hash("SHA1", b"abc").unwrap(),
            "a9993e364706816aba3e25717850c26c9cd0d89d"
        );
        assert_eq!(
            hash("SHA256", b"abc").unwrap(),
            "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
        );
        assert_eq!(
            offline_uuid("Notch").unwrap(),
            "b50ad385829d3141a2167e7d7539ba7f"
        );
        assert_eq!(base64url(b"foobar"), "Zm9vYmFy");
        assert_ne!(random().unwrap(), random().unwrap());
        let encrypted = protect("secret-token").unwrap();
        assert!(!encrypted.contains("secret-token"));
        assert_eq!(unprotect(&encrypted).unwrap(), "secret-token");
    }
}
