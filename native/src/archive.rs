use crate::{
    net::{checkpoint, Cancel},
    storage,
};
use std::{
    fs,
    io::{Read, Seek, SeekFrom, Write},
    path::Path,
};
fn u16le(bytes: &[u8], at: usize) -> Result<u16, String> {
    Ok(u16::from_le_bytes(
        bytes
            .get(at..at + 2)
            .ok_or("Truncated ZIP")?
            .try_into()
            .unwrap(),
    ))
}
fn u32le(bytes: &[u8], at: usize) -> Result<u32, String> {
    Ok(u32::from_le_bytes(
        bytes
            .get(at..at + 4)
            .ok_or("Truncated ZIP")?
            .try_into()
            .unwrap(),
    ))
}
pub fn extract(
    file: &Path,
    target: &Path,
    cancel: &Cancel,
    filter: &dyn Fn(&str) -> bool,
) -> Result<(), String> {
    let mut file = fs::File::open(file).map_err(|e| e.to_string())?;
    let length = file.metadata().map_err(|e| e.to_string())?.len();
    let tail_size = length.min(65557) as usize;
    let mut tail = vec![0; tail_size];
    file.seek(SeekFrom::End(-(tail_size as i64)))
        .and_then(|_| file.read_exact(&mut tail))
        .map_err(|e| e.to_string())?;
    let end = tail
        .windows(4)
        .rposition(|w| w == b"PK\x05\x06")
        .ok_or("ZIP directory not found")?;
    if u16le(&tail, end + 4)? != 0 || u16le(&tail, end + 6)? != 0 {
        return Err("Multi-volume ZIP is unsupported".into());
    }
    let count = u16le(&tail, end + 10)? as usize;
    let directory = u32le(&tail, end + 16)? as u64;
    if count > 20000 || directory >= length {
        return Err("Invalid ZIP directory".into());
    }
    file.seek(SeekFrom::Start(directory))
        .map_err(|e| e.to_string())?;
    let mut total = 0u64;
    for _ in 0..count {
        checkpoint(cancel)?;
        let mut header = [0u8; 46];
        file.read_exact(&mut header).map_err(|e| e.to_string())?;
        if &header[..4] != b"PK\x01\x02" {
            return Err("Invalid ZIP entry".into());
        }
        let flags = u16le(&header, 8)?;
        let method = u16le(&header, 10)?;
        let packed = u32le(&header, 20)? as u64;
        let expected_crc = u32le(&header, 16)?;
        let unpacked = u32le(&header, 24)? as u64;
        let name_size = u16le(&header, 28)? as usize;
        let extra = u16le(&header, 30)? as i64;
        let comment = u16le(&header, 32)? as i64;
        let offset = u32le(&header, 42)? as u64;
        if name_size > 4096
            || flags & 1 != 0
            || !matches!(method, 0 | 8)
            || unpacked > 512 * 1024 * 1024
            || packed > length
        {
            return Err("Unsupported or excessive ZIP entry".into());
        }
        let mode = u32le(&header, 38)? >> 16;
        if mode & 0xf000 == 0xa000 {
            return Err("Links in archives are forbidden".into());
        }
        let mut name = vec![0; name_size];
        file.read_exact(&mut name).map_err(|e| e.to_string())?;
        let name = std::str::from_utf8(&name).map_err(|_| "ZIP file names must be UTF-8")?;
        file.seek(SeekFrom::Current(extra + comment))
            .map_err(|e| e.to_string())?;
        let next = file.stream_position().map_err(|e| e.to_string())?;
        let destination = storage::safe_join(target, name.trim_end_matches('/'))?;
        if name.ends_with('/') || !filter(name) {
            continue;
        }
        total += unpacked;
        if total > 2 * 1024 * 1024 * 1024 {
            return Err("Archive expands beyond 2 GiB".into());
        }
        file.seek(SeekFrom::Start(offset))
            .map_err(|e| e.to_string())?;
        let mut local = [0; 30];
        file.read_exact(&mut local).map_err(|e| e.to_string())?;
        if &local[..4] != b"PK\x03\x04" {
            return Err("Invalid local ZIP header".into());
        }
        file.seek(SeekFrom::Current(
            u16le(&local, 26)? as i64 + u16le(&local, 28)? as i64,
        ))
        .map_err(|e| e.to_string())?;
        fs::create_dir_all(destination.parent().unwrap()).map_err(|e| e.to_string())?;
        let temporary = destination.with_extension(format!("{}.tmp", crate::crypto::random()?));
        let result = (|| {
            let mut output = fs::OpenOptions::new()
                .create_new(true)
                .write(true)
                .open(&temporary)
                .map_err(|e| e.to_string())?;
            let input = (&mut file).take(packed);
            let mut decoder: Box<dyn Read> = if method == 8 {
                Box::new(flate2::read::DeflateDecoder::new(input))
            } else {
                Box::new(input)
            };
            let mut buffer = [0u8; 65536];
            let mut size = 0;
            let mut crc = crc32fast::Hasher::new();
            loop {
                checkpoint(cancel)?;
                let n = decoder.read(&mut buffer).map_err(|e| e.to_string())?;
                if n == 0 {
                    break;
                }
                size += n as u64;
                if size > unpacked {
                    return Err("ZIP entry expands beyond declared size".into());
                }
                output.write_all(&buffer[..n]).map_err(|e| e.to_string())?;
                crc.update(&buffer[..n]);
            }
            if size != unpacked {
                return Err("Truncated ZIP entry".into());
            }
            if crc.finalize() != expected_crc {
                return Err("ZIP entry failed CRC verification".into());
            }
            output.sync_all().map_err(|e| e.to_string())?;
            drop(output);
            storage::replace(&temporary, &destination)
        })();
        if temporary.exists() {
            let _ = fs::remove_file(&temporary);
        }
        result?;
        file.seek(SeekFrom::Start(next))
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}
