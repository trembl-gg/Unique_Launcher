use serde_json::{json, Value};
use std::os::windows::io::AsRawHandle;

fn browser_url(payload: &Value) -> Result<url::Url, String> {
    payload
        .as_str()
        .and_then(|text| url::Url::parse(text).ok())
        .filter(|url| matches!(url.scheme(), "http" | "https") && url.host_str().is_some())
        .ok_or_else(|| "Only HTTP and HTTPS browser URLs are allowed.".into())
}

pub fn open_external(payload: &Value) -> Result<Value, String> {
    let url = browser_url(payload)?;
    let wide: Vec<u16> = url.as_str().encode_utf16().chain(Some(0)).collect();
    let result = unsafe {
        windows::Win32::UI::Shell::ShellExecuteW(
            None,
            windows::core::w!("open"),
            PCWSTR(wide.as_ptr()),
            None,
            None,
            windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL,
        )
    };
    if result.0 as isize <= 32 {
        return Err(format!(
            "Cannot open the default browser (Windows error {}).",
            result.0 as isize
        ));
    }
    Ok(json!(true))
}
pub fn open_directory(payload: &Value) -> Result<Value, String> {
    let path = payload.as_str().filter(|path| !path.contains('\0')).ok_or("Invalid folder path")?;
    if !std::path::Path::new(path).is_absolute() || !std::path::Path::new(path).is_dir() { return Err("Folder does not exist.".into()); }
    let wide: Vec<u16> = path.encode_utf16().chain(Some(0)).collect();
    let result = unsafe { windows::Win32::UI::Shell::ShellExecuteW(None, windows::core::w!("open"), PCWSTR(wide.as_ptr()), None, None, windows::Win32::UI::WindowsAndMessaging::SW_SHOWNORMAL) };
    if result.0 as isize <= 32 { return Err(format!("Cannot open folder (Windows error {}).", result.0 as isize)); }
    Ok(json!(true))
}
use std::{
    path::PathBuf,
    process::Child,
    time::{Duration, Instant},
};
use tao::{platform::windows::WindowExtWindows, window::Window};
use windows::{
    core::PCWSTR,
    Win32::{
        Foundation::{CloseHandle, HANDLE, HWND},
        Graphics::Gdi::{EnumDisplaySettingsW, DEVMODEW, ENUM_CURRENT_SETTINGS},
        Media::Audio::{
            eConsole, eRender, Endpoints::IAudioMeterInformation, IMMDeviceEnumerator,
            MMDeviceEnumerator,
        },
        System::{
            Com::{CoCreateInstance, CLSCTX_ALL},
            JobObjects::{
                AssignProcessToJobObject, CreateJobObjectW, JobObjectExtendedLimitInformation,
                SetInformationJobObject, JOBOBJECT_EXTENDED_LIMIT_INFORMATION,
                JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE,
            },
            SystemInformation::{
                GetPhysicallyInstalledSystemMemory, GlobalMemoryStatusEx, MEMORYSTATUSEX,
            },
        },
        UI::WindowsAndMessaging::{
            GetWindowDisplayAffinity, SetWindowDisplayAffinity, WINDOW_DISPLAY_AFFINITY,
        },
    },
};

pub fn data_dir() -> PathBuf {
    std::env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .unwrap_or_else(std::env::temp_dir)
        .join("UNIQUE LAUNCHER")
}

pub fn hardware(window: &Window) -> Value {
    let mut memory = MEMORYSTATUSEX {
        dwLength: std::mem::size_of::<MEMORYSTATUSEX>() as u32,
        ..Default::default()
    };
    let memory_ok = unsafe { GlobalMemoryStatusEx(&mut memory) }.is_ok();
    let total = memory_ok.then_some(memory.ullTotalPhys / 1048576);
    let available = memory_ok.then_some(memory.ullAvailPhys / 1048576);
    let mut installed = 0;
    let installed = if unsafe { GetPhysicallyInstalledSystemMemory(&mut installed) }.is_ok() {
        Some(installed / 1024)
    } else {
        total
    };
    let monitor = window.current_monitor();
    let device: Vec<u16> = monitor
        .as_ref()
        .and_then(|m| m.name())
        .unwrap_or_default()
        .encode_utf16()
        .chain(Some(0))
        .collect();
    let mut mode = DEVMODEW {
        dmSize: std::mem::size_of::<DEVMODEW>() as u16,
        ..Default::default()
    };
    let hz =
        unsafe { EnumDisplaySettingsW(PCWSTR(device.as_ptr()), ENUM_CURRENT_SETTINGS, &mut mode) }
            .as_bool()
            .then_some(mode.dmDisplayFrequency)
            .filter(|hz| *hz > 1);
    json!({"refreshRate":hz,
        "monitorName":monitor.and_then(|m| m.name()), "totalMemoryMb":total,
        "installedMemoryMb":installed, "availableMemoryMb":available,
        "maxGameMemoryMb":total.map(memory_budget)})
}

fn memory_budget(total: u64) -> u64 {
    let reserve = (total / 4).clamp(1024, 2048);
    (total.saturating_sub(reserve) / 256 * 256).max(1024)
}

fn hwnd(window: &Window) -> HWND {
    HWND(window.hwnd() as *mut _)
}

pub fn streamer_mode(window: &Window, enabled: bool) -> Value {
    let window = hwnd(window);
    let mut previous = 0;
    if let Err(error) = unsafe { GetWindowDisplayAffinity(window, &mut previous) } {
        return json!({"success":false,"error":error.to_string()});
    }
    if let Err(error) = unsafe {
        SetWindowDisplayAffinity(
            window,
            WINDOW_DISPLAY_AFFINITY(if enabled { 0x11 } else { 0 }),
        )
    } {
        return json!({"success":false,"enabled":previous != 0,"error":error.to_string()});
    }
    let result = std::fs::create_dir_all(data_dir()).and_then(|_| {
        std::fs::write(
            data_dir().join("streamer-mode.txt"),
            if enabled { "1" } else { "0" },
        )
    });
    if let Err(error) = result {
        let _ = unsafe { SetWindowDisplayAffinity(window, WINDOW_DISPLAY_AFFINITY(previous)) };
        return json!({"success":false,"enabled":previous != 0,"error":error.to_string()});
    }
    json!({"success":true,"enabled":enabled})
}

pub fn restore_streamer_mode(window: &Window) {
    if std::fs::read_to_string(data_dir().join("streamer-mode.txt")).is_ok_and(|v| v.trim() == "1")
    {
        let result = streamer_mode(window, true);
        if result["success"] != true {
            eprintln!("Streamer mode: {}", result["error"]);
        }
    }
}

#[derive(Default)]
pub struct AudioMeter {
    meter: Option<IAudioMeterInformation>,
    refreshed: Option<Instant>,
}
impl AudioMeter {
    pub fn read(&mut self) -> Result<Value, String> {
        let result = (|| -> windows::core::Result<f32> {
            if self.meter.is_none()
                || self
                    .refreshed
                    .is_none_or(|t| t.elapsed() > Duration::from_secs(3))
            {
                self.meter = None;
                let enumerator: IMMDeviceEnumerator =
                    unsafe { CoCreateInstance(&MMDeviceEnumerator, None, CLSCTX_ALL)? };
                let device = unsafe { enumerator.GetDefaultAudioEndpoint(eRender, eConsole)? };
                self.meter = Some(unsafe { device.Activate(CLSCTX_ALL, None)? });
                self.refreshed = Some(Instant::now());
            }
            unsafe { self.meter.as_ref().unwrap().GetPeakValue() }
        })();
        match result {
            Ok(value) => Ok(json!(value.clamp(0.0, 1.0))),
            Err(error) => {
                self.meter = None;
                Err(error.to_string())
            }
        }
    }
    pub fn stop(&mut self) {
        self.meter = None;
        self.refreshed = None;
    }
}

pub fn choose_file(options: &Value) -> Value {
    let mut dialog = rfd::FileDialog::new();
    if let Some(filters) = options["filters"].as_array() {
        for filter in filters {
            let extensions: Vec<&str> = filter["extensions"]
                .as_array()
                .into_iter()
                .flatten()
                .filter_map(Value::as_str)
                .collect();
            if !extensions.is_empty() {
                dialog = dialog.add_filter(filter["name"].as_str().unwrap_or("Files"), &extensions);
            }
        }
    }
    path_result(dialog.pick_file())
}

pub fn path_result(path: Option<PathBuf>) -> Value {
    path.map(|path| json!({"path":path,"name":path.file_name().map(|s| s.to_string_lossy()),
        "ext":path.extension().map(|s| format!(".{}", s.to_string_lossy().to_lowercase())).unwrap_or_default()})).unwrap_or(Value::Null)
}

pub struct ProcessJob(HANDLE);
impl ProcessJob {
    pub fn new(child: &Child) -> Result<Self, String> {
        unsafe {
            let job = Self(CreateJobObjectW(None, None).map_err(|e| e.to_string())?);
            let mut info = JOBOBJECT_EXTENDED_LIMIT_INFORMATION::default();
            info.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
            SetInformationJobObject(
                job.0,
                JobObjectExtendedLimitInformation,
                &info as *const _ as *const _,
                std::mem::size_of_val(&info) as u32,
            )
            .map_err(|e| e.to_string())?;
            AssignProcessToJobObject(job.0, HANDLE(child.as_raw_handle()))
                .map_err(|e| e.to_string())?;
            Ok(job)
        }
    }
}
impl Drop for ProcessJob {
    fn drop(&mut self) {
        let _ = unsafe { CloseHandle(self.0) };
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn invalid_folder_paths_are_rejected_before_opening() {
        for invalid in [json!(null), json!("relative/path"), json!("C:\\missing-unique-folder-qa\\"), json!("C:\\Windows\0hidden")] {
            assert!(open_directory(&invalid).is_err());
        }
    }
    #[test]
    fn browser_urls_preserve_oauth_query_and_reject_other_protocols() {
        let url = "https://login.microsoftonline.com/authorize?client_id=test&state=a_b&code_challenge=123";
        assert_eq!(browser_url(&json!(url)).unwrap().as_str(), url);
        for invalid in [
            "file:///C:/secret.txt",
            "javascript:alert(1)",
            "ms-settings:privacy",
            "not a URL",
        ] {
            assert!(browser_url(&json!(invalid)).is_err());
        }
    }
    #[test]
    fn memory_reserves_os_space_without_underflow() {
        assert_eq!(memory_budget(8192), 6144);
        assert_eq!(memory_budget(16384), 14336);
        assert_eq!(memory_budget(512), 1024);
    }
    #[test]
    fn cancelled_picker_returns_null() {
        assert!(path_result(None).is_null());
    }
}
