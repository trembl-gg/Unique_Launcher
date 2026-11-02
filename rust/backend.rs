use crate::{protocol, HostEvent};
use serde_json::Value;
#[cfg(windows)]
use std::os::windows::process::CommandExt;
use std::{
    env, fs,
    io::{BufRead, BufReader, Write},
    path::{Path, PathBuf},
    process::{Child, Command, Stdio},
    sync::{
        atomic::{AtomicBool, Ordering},
        mpsc::{sync_channel, SyncSender},
        Arc,
    },
    thread,
};
use tao::event_loop::EventLoopProxy;

pub fn project_root() -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Some(root) = env::var_os("UNIQUE_WEBVIEW2_ROOT") {
        candidates.push(PathBuf::from(root));
    }
    if let Ok(exe) = env::current_exe() {
        if let Some(dir) = exe.parent() {
            candidates.extend(dir.ancestors().map(Path::to_path_buf));
        }
    }
    if let Ok(cwd) = env::current_dir() {
        candidates.push(cwd);
    }
    candidates
        .into_iter()
        .find(|dir| dir.join("main.js").is_file() && dir.join("renderer/index.html").is_file())
        .ok_or_else(|| "Launcher resources (main.js, renderer/index.html) were not found.".into())
}

fn node(root: &Path) -> Result<PathBuf, String> {
    let mut candidates = Vec::new();
    if let Some(path) = env::var_os("UNIQUE_NODE_PATH") {
        candidates.push(PathBuf::from(path));
    }
    candidates.push(root.join("node/node.exe"));
    if let Some(paths) = env::var_os("PATH") {
        candidates.extend(env::split_paths(&paths).map(|p| p.join("node.exe")));
    }
    candidates
        .into_iter()
        .find(|path| path.is_file())
        .ok_or_else(|| "node.exe was not found. Install Node.js or set UNIQUE_NODE_PATH.".into())
}

pub struct Backend {
    child: Child,
    input: SyncSender<Vec<u8>>,
    pub ready: Arc<AtomicBool>,
    pub migrating: Arc<AtomicBool>,
    #[cfg(windows)]
    _job: crate::native::ProcessJob,
}

impl Backend {
    pub fn start(root: &Path, proxy: EventLoopProxy<HostEvent>) -> Result<Self, String> {
        let log_dir = crate::native::data_dir().join("logs");
        fs::create_dir_all(&log_dir).map_err(|e| e.to_string())?;
        let log = fs::File::create(log_dir.join("rust-backend.log")).map_err(|e| e.to_string())?;
        let mut command = Command::new(node(root)?);
        command
            .arg("--optimize-for-size")
            .arg(root.join("webview2/node-backend.js"))
            .current_dir(root)
            .env("UNIQUE_WEBVIEW2_ROOT", root)
            .env("UNIQUE_BACKEND_TRANSPORT", "stdio")
            .stdin(Stdio::piped())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped());
        #[cfg(windows)]
        command.creation_flags(0x08000000); // CREATE_NO_WINDOW
        let mut child = command.spawn().map_err(|e| e.to_string())?;
        #[cfg(windows)]
        let job = match crate::native::ProcessJob::new(&child) {
            Ok(job) => job,
            Err(error) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(error);
            }
        };
        let mut stdin = child.stdin.take().ok_or("Missing backend input pipe")?;
        let stdout = child.stdout.take().ok_or("Missing backend output pipe")?;
        let stderr = child.stderr.take().ok_or("Missing backend error pipe")?;
        let ready = Arc::new(AtomicBool::new(false));
        let migrating = Arc::new(AtomicBool::new(false));
        let ready_reader = ready.clone();
        let migration_reader = migrating.clone();
        let (input, requests) = sync_channel::<Vec<u8>>(128);
        let writer_proxy = proxy.clone();
        thread::spawn(move || {
            for message in requests {
                if stdin
                    .write_all(&message)
                    .and_then(|_| stdin.write_all(b"\n"))
                    .and_then(|_| stdin.flush())
                    .is_err()
                {
                    let _ = writer_proxy.send_event(HostEvent::BackendStopped);
                    return;
                }
            }
        });
        thread::spawn(move || {
            let mut log = log;
            for line in BufReader::new(stderr).lines().map_while(Result::ok) {
                let _ = writeln!(log, "{line}");
            }
        });
        thread::spawn(move || {
            for line in BufReader::new(stdout).lines().map_while(Result::ok) {
                if line == "UNIQUE_STORAGE_COPY_START" {
                    migration_reader.store(true, Ordering::Release);
                }
                if line == "UNIQUE_STORAGE_COPY_END" {
                    migration_reader.store(false, Ordering::Release);
                }
                if let Some(message) = protocol::decode(&line) {
                    if message["type"] == "ready" {
                        ready_reader.store(true, Ordering::Release);
                    }
                    if proxy.send_event(HostEvent::Message(message)).is_err() {
                        return;
                    }
                }
            }
            let _ = proxy.send_event(HostEvent::BackendStopped);
        });
        Ok(Self {
            child,
            input,
            ready,
            migrating,
            #[cfg(windows)]
            _job: job,
        })
    }

    pub fn invoke(&mut self, message: &Value) -> Result<(), String> {
        let bytes = serde_json::to_vec(message).map_err(|e| e.to_string())?;
        if bytes.len() > 50 * 1024 * 1024 {
            return Err("Request body is too large.".into());
        }
        self.input.try_send(bytes).map_err(|e| e.to_string())
    }
}

impl Drop for Backend {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}
