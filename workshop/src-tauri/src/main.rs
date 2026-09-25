#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

// Pip Workshop desktop shell: process runner, file access, and live Java diagnostics.
// Logic lives in plain functions so `cargo test` can exercise it without a window.

use serde::Serialize;
use serde_json::Value;
use std::collections::BTreeMap;
use std::fs;
use std::io::{self, BufRead, BufReader, Read, Write};
use std::path::{Path, PathBuf};
use std::process::{Child, ChildStdin, ChildStdout, Command, Stdio};
use std::sync::mpsc::{self, RecvTimeoutError};
use std::sync::{Arc, Mutex, MutexGuard};
use std::time::{Duration, Instant, SystemTime, UNIX_EPOCH};
use tauri::{AppHandle, Manager, RunEvent};

const TIME_LIMIT: &str = "Time limit reached. Check for an infinite loop.";
const OUTPUT_LIMIT: &str = "Output limit reached. Check for an accidental printing loop.";
const CANCELLED: &str = "Run cancelled.";

// ---------- processes ----------

#[derive(Serialize, Debug)]
struct RunResult {
    code: i32,
    stdout: String,
    stderr: String,
    error: String,
}

struct Run {
    pid: u32,
    reason: Mutex<String>,
}

impl Run {
    fn stop(&self, why: &str) {
        let mut reason = lock(&self.reason);
        if reason.is_empty() {
            *reason = why.into();
        }
        kill_tree(self.pid);
    }
}

static RUNS: Mutex<BTreeMap<String, Arc<Run>>> = Mutex::new(BTreeMap::new());

fn lock<T>(m: &Mutex<T>) -> MutexGuard<'_, T> {
    m.lock().unwrap_or_else(|e| e.into_inner())
}

#[cfg(unix)]
fn kill_tree(pid: u32) {
    // Children run in their own process group (process_group(0)), so -pid hits the whole tree.
    unsafe { libc::kill(-(pid as i32), libc::SIGKILL) };
}

#[cfg(windows)]
fn kill_tree(pid: u32) {
    let _ = hidden(&mut Command::new("taskkill")).args(["/PID", &pid.to_string(), "/T", "/F"]).status();
}

// No console window flash for child processes on Windows.
fn hidden(cmd: &mut Command) -> &mut Command {
    #[cfg(windows)]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x0800_0000);
    }
    cmd
}

fn io_err(e: io::Error, path: &str) -> String {
    match e.kind() {
        io::ErrorKind::NotFound => format!("ENOENT: {path}"),
        io::ErrorKind::AlreadyExists => "EEXIST".into(),
        _ => format!("{e}: {path}"),
    }
}

// Mirrors runProcess in extension/runner.js.
fn spawn_run(command: &str, args: &[String], cwd: Option<&str>, input: &str, timeout_ms: u64, max_output: usize, run_id: Option<&str>) -> Result<RunResult, String> {
    let mut cmd = Command::new(command);
    cmd.args(args).env("LC_ALL", "C").stdin(Stdio::piped()).stdout(Stdio::piped()).stderr(Stdio::piped());
    if let Some(dir) = cwd {
        cmd.current_dir(dir);
    }
    #[cfg(unix)]
    {
        use std::os::unix::process::CommandExt;
        cmd.process_group(0);
    }
    let mut child = hidden(&mut cmd).spawn().map_err(|e| io_err(e, &format!("spawn {command}")))?;
    let run = Arc::new(Run { pid: child.id(), reason: Mutex::new(String::new()) });
    if let Some(id) = run_id {
        lock(&RUNS).insert(id.into(), run.clone());
    }

    let (tx, rx) = mpsc::channel::<(bool, Option<Vec<u8>>)>();
    for (is_out, mut pipe) in [(true, Box::new(child.stdout.take().unwrap()) as Box<dyn Read + Send>), (false, Box::new(child.stderr.take().unwrap()))] {
        let tx = tx.clone();
        std::thread::spawn(move || {
            let mut buf = [0u8; 8192];
            loop {
                match pipe.read(&mut buf) {
                    Ok(0) | Err(_) => return tx.send((is_out, None)),
                    Ok(n) => {
                        let _ = tx.send((is_out, Some(buf[..n].to_vec())));
                    }
                }
            }
        });
    }
    let mut stdin = child.stdin.take().unwrap();
    let input = input.as_bytes().to_vec();
    std::thread::spawn(move || stdin.write_all(&input)); // dropping stdin closes it

    let mut deadline = Instant::now() + Duration::from_millis(timeout_ms);
    let (mut stdout, mut stderr, mut bytes, mut open) = (Vec::new(), Vec::new(), 0usize, 2);
    while open > 0 {
        match rx.recv_timeout(deadline.saturating_duration_since(Instant::now())) {
            Ok((is_out, Some(chunk))) => {
                let room = max_output.saturating_sub(bytes);
                bytes += chunk.len();
                let buf = if is_out { &mut stdout } else { &mut stderr };
                buf.extend_from_slice(&chunk[..room.min(chunk.len())]);
                if bytes > max_output {
                    run.stop(OUTPUT_LIMIT);
                }
            }
            Ok((_, None)) => open -= 1,
            Err(RecvTimeoutError::Timeout) => {
                run.stop(TIME_LIMIT);
                deadline = Instant::now() + Duration::from_secs(1); // re-kill until the pipes close
            }
            Err(RecvTimeoutError::Disconnected) => break,
        }
    }
    if let Some(id) = run_id {
        let mut runs = lock(&RUNS);
        if runs.get(id).is_some_and(|r| Arc::ptr_eq(r, &run)) {
            runs.remove(id);
        }
    }
    let status = child.wait().map_err(|e| e.to_string())?;
    let reason = lock(&run.reason).clone();
    let stderr = String::from_utf8_lossy(&stderr).into_owned();
    Ok(RunResult {
        code: if reason.is_empty() { status.code().unwrap_or(-1) } else { -1 },
        stdout: String::from_utf8_lossy(&stdout).into_owned(),
        error: if reason.is_empty() { stderr.clone() } else { reason },
        stderr,
    })
}

#[tauri::command]
async fn run_process(command: String, args: Vec<String>, cwd: Option<String>, input: String, timeout_ms: u64, max_output: usize, run_id: Option<String>) -> Result<RunResult, String> {
    tauri::async_runtime::spawn_blocking(move || spawn_run(&command, &args, cwd.as_deref(), &input, timeout_ms, max_output, run_id.as_deref()))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
fn kill_process(run_id: String) {
    if let Some(run) = lock(&RUNS).get(&run_id) {
        run.stop(CANCELLED);
    }
}

// ---------- files ----------

#[tauri::command]
fn fs_read(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| io_err(e, &path))
}

#[tauri::command]
fn fs_write(path: String, contents: String, create_new: bool) -> Result<(), String> {
    let result = if create_new {
        fs::OpenOptions::new().write(true).create_new(true).open(&path).and_then(|mut f| f.write_all(contents.as_bytes()))
    } else {
        fs::write(&path, contents)
    };
    result.map_err(|e| io_err(e, &path))
}

#[tauri::command]
fn fs_mkdir(path: String) -> Result<(), String> {
    fs::create_dir_all(&path).map_err(|e| io_err(e, &path))
}

#[tauri::command]
fn fs_remove(path: String) -> Result<(), String> {
    let result = match fs::symlink_metadata(&path) {
        Ok(m) if m.is_dir() => fs::remove_dir_all(&path),
        Ok(_) => fs::remove_file(&path),
        Err(e) => Err(e),
    };
    match result {
        Err(e) if e.kind() != io::ErrorKind::NotFound => Err(io_err(e, &path)),
        _ => Ok(()),
    }
}

#[tauri::command]
fn fs_rename(from: String, to: String) -> Result<(), String> {
    fs::rename(&from, &to).map_err(|e| io_err(e, &from))
}

#[tauri::command]
fn fs_exists(path: String) -> bool {
    Path::new(&path).exists()
}

#[tauri::command]
fn fs_mkdtemp(prefix: String) -> Result<String, String> {
    let chars = b"abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    for attempt in 0u64..100 {
        let mut seed = SystemTime::now().duration_since(UNIX_EPOCH).unwrap().as_nanos() as u64 ^ (std::process::id() as u64) << 32 ^ attempt.wrapping_mul(0x9E37_79B9_7F4A_7C15);
        let tag: String = (0..6).map(|_| { seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407); chars[(seed >> 33) as usize % chars.len()] as char }).collect();
        let dir = format!("{prefix}{tag}");
        match fs::create_dir(&dir) {
            Ok(()) => return Ok(dir),
            Err(e) if e.kind() == io::ErrorKind::AlreadyExists => continue,
            Err(e) => return Err(io_err(e, &dir)),
        }
    }
    Err(format!("EEXIST: {prefix}"))
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct Paths {
    app_data: String,
    resources: String,
    temp: String,
    platform: &'static str,
    home: String,
}

#[tauri::command]
fn paths(app: AppHandle) -> Result<Paths, String> {
    let data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&data).map_err(|e| e.to_string())?;
    let resources = app.path().resource_dir().map_err(|e| e.to_string())?;
    let home = app.path().home_dir().map_err(|e| e.to_string())?;
    Ok(Paths {
        home: home.to_string_lossy().into_owned(),
        app_data: data.to_string_lossy().into_owned(),
        resources: resources.to_string_lossy().into_owned(),
        temp: std::env::temp_dir().to_string_lossy().into_owned(),
        platform: match std::env::consts::OS {
            "macos" => "darwin",
            "windows" => "win32",
            os => os,
        },
    })
}

// ---------- live diagnostics ----------

struct Daemon {
    home: String,
    child: Child,
    stdin: ChildStdin,
    stdout: BufReader<ChildStdout>,
}

impl Drop for Daemon {
    fn drop(&mut self) {
        let _ = self.child.kill();
        let _ = self.child.wait();
    }
}

// ponytail: one global daemon and lock, requests queue behind each other; a hung javac blocks
// later requests until the app restarts. Add a read timeout if that ever shows up.
static DIAG: Mutex<Option<Daemon>> = Mutex::new(None);

fn mtime(p: &Path) -> Option<SystemTime> {
    fs::metadata(p).and_then(|m| m.modified()).ok()
}

fn start_daemon(diag_src: &Path, class_dir: &Path, java_home: &str) -> Result<Daemon, String> {
    let bin = Path::new(java_home).join("bin");
    let exe = std::env::consts::EXE_SUFFIX;
    let (java, javac) = (bin.join(format!("java{exe}")), bin.join(format!("javac{exe}")));
    if !java.is_file() || !javac.is_file() {
        return Err(format!("Live error checking needs a JDK with bin/java and bin/javac. None found in {java_home}."));
    }
    let class = class_dir.join("DiagD.class");
    if !mtime(&class).zip(mtime(diag_src)).is_some_and(|(c, s)| c >= s) {
        fs::create_dir_all(class_dir).map_err(|e| e.to_string())?;
        // --release 11 so one compiled class also runs if the learner later switches to an older JDK.
        let out = hidden(&mut Command::new(&javac)).args(["--release", "11", "-d"]).arg(class_dir).arg(diag_src).output().map_err(|e| format!("Could not start javac: {e}"))?;
        if !out.status.success() {
            return Err(format!("Could not compile DiagD.java: {}", String::from_utf8_lossy(&out.stderr).trim()));
        }
    }
    let mut child = hidden(&mut Command::new(&java))
        .args(["-XX:+UseSerialGC", "-XX:TieredStopAtLevel=1", "-Xmx256m", "-cp"])
        .arg(class_dir)
        .arg("DiagD")
        .stdin(Stdio::piped())
        .stdout(Stdio::piped())
        .stderr(Stdio::null())
        .spawn()
        .map_err(|e| format!("Could not start java: {e}"))?;
    Ok(Daemon {
        home: java_home.into(),
        stdin: child.stdin.take().unwrap(),
        stdout: BufReader::new(child.stdout.take().unwrap()),
        child,
    })
}

// `offset` None asks for diagnostics, Some(cursor) for completions (UTF-16 index, as JS strings count).
fn diag_request(diag_src: &Path, class_dir: &Path, java_home: &str, source_root: &str, rel_path: &str, source: &str, offset: Option<usize>) -> Result<Value, String> {
    if source_root.contains('\n') || rel_path.contains('\n') {
        return Err("Paths must not contain line breaks.".into());
    }
    let mut slot = lock(&DIAG);
    let alive = match slot.as_mut() {
        Some(d) => d.home == java_home && matches!(d.child.try_wait(), Ok(None)),
        None => false,
    };
    if !alive {
        *slot = None;
        *slot = Some(start_daemon(diag_src, class_dir, java_home)?);
    }
    let d = slot.as_mut().unwrap();
    let reply = (|| -> io::Result<String> {
        match offset {
            None => write!(d.stdin, "D\n{source_root}\n{rel_path}\n{}\n", source.len())?,
            Some(o) => write!(d.stdin, "C\n{source_root}\n{rel_path}\n{}\n{o}\n", source.len())?,
        }
        d.stdin.write_all(source.as_bytes())?;
        d.stdin.flush()?;
        let mut line = String::new();
        if d.stdout.read_line(&mut line)? == 0 {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "the checker process exited"));
        }
        Ok(line)
    })();
    match reply {
        Ok(line) => serde_json::from_str(&line).map_err(|e| e.to_string()),
        Err(e) => {
            *slot = None; // restart on the next request
            Err(format!("Live error checking stopped: {e}"))
        }
    }
}

async fn daemon(app: AppHandle, java_home: String, source_root: String, rel_path: String, source: String, offset: Option<usize>) -> Result<Value, String> {
    let diag_src: PathBuf = app.path().resource_dir().map_err(|e| e.to_string())?.join("DiagD.java");
    let class_dir = app.path().app_data_dir().map_err(|e| e.to_string())?.join("diag");
    tauri::async_runtime::spawn_blocking(move || diag_request(&diag_src, &class_dir, &java_home, &source_root, &rel_path, &source, offset))
        .await
        .map_err(|e| e.to_string())?
}

#[tauri::command]
async fn diagnose(app: AppHandle, java_home: String, source_root: String, rel_path: String, source: String) -> Result<Value, String> {
    daemon(app, java_home, source_root, rel_path, source, None).await
}

#[tauri::command]
async fn complete(app: AppHandle, java_home: String, source_root: String, rel_path: String, source: String, offset: usize) -> Result<Value, String> {
    daemon(app, java_home, source_root, rel_path, source, Some(offset)).await
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![run_process, kill_process, fs_read, fs_write, fs_mkdir, fs_remove, fs_rename, fs_exists, fs_mkdtemp, paths, diagnose, complete])
        .build(tauri::generate_context!())
        .expect("failed to start Pip Workshop")
        .run(|_, event| {
            if let RunEvent::Exit = event {
                for run in lock(&RUNS).values() {
                    run.stop(CANCELLED);
                }
                *lock(&DIAG) = None;
            }
        });
}

#[cfg(test)]
mod tests {
    use super::*;

    fn run(cmd: &str, args: &[&str], input: &str, timeout_ms: u64, max: usize) -> RunResult {
        let args: Vec<String> = args.iter().map(|s| s.to_string()).collect();
        spawn_run(cmd, &args, None, input, timeout_ms, max, Some("t")).unwrap()
    }

    #[test]
    fn echoes_stdin() {
        let r = run("cat", &[], "hello\n", 5000, 65536);
        assert_eq!((r.code, r.stdout.as_str(), r.error.as_str()), (0, "hello\n", ""));
    }

    #[test]
    fn times_out() {
        let t = Instant::now();
        let r = run("sh", &["-c", "sleep 30"], "", 300, 65536);
        assert_eq!((r.code, r.error.as_str()), (-1, TIME_LIMIT));
        assert!(t.elapsed() < Duration::from_secs(5));
    }

    #[test]
    fn caps_output() {
        let r = run("yes", &[], "", 5000, 1000);
        assert_eq!((r.code, r.stdout.len(), r.error.as_str()), (-1, 1000, OUTPUT_LIMIT));
    }

    #[test]
    fn cancels_by_run_id() {
        let t = std::thread::spawn(|| spawn_run("sleep", &["30".into()], None, "", 20000, 100, Some("cancel-me")).unwrap());
        std::thread::sleep(Duration::from_millis(300));
        kill_process("cancel-me".into());
        let r = t.join().unwrap();
        assert_eq!((r.code, r.error.as_str()), (-1, CANCELLED));
    }

    #[test]
    fn missing_command_is_enoent() {
        let err = spawn_run("/no/such/binary", &[], None, "", 1000, 100, None).unwrap_err();
        assert!(err.starts_with("ENOENT"), "{err}");
    }

    fn find_jdk() -> Option<String> {
        let bundled = concat!(env!("CARGO_MANIFEST_DIR"), "/../runtime/jdk").to_string();
        let system = Command::new("/usr/libexec/java_home").output().ok().map(|o| String::from_utf8_lossy(&o.stdout).trim().to_string());
        [Some(bundled), system].into_iter().flatten().find(|h| Path::new(h).join("bin/javac").is_file())
    }

    #[test]
    fn diagnoses_student_file() {
        let Some(home) = find_jdk() else { return eprintln!("no JDK found, skipping") };
        let root = PathBuf::from(fs_mkdtemp(std::env::temp_dir().join("pip-diag-").to_string_lossy().into_owned()).unwrap());
        let pkg = root.join("pip/lessons/hello");
        fs::create_dir_all(&pkg).unwrap();
        fs::write(pkg.join("Robot.java"), "package pip.lessons.hello;\npublic class Robot { public int x() { return 1; } }\n").unwrap();
        let src = concat!(env!("CARGO_MANIFEST_DIR"), "/../desktop/DiagD.java");
        let classes = root.join("classes");
        let check = |code: &str| diag_request(Path::new(src), &classes, &home, &root.to_string_lossy(), "pip/lessons/hello/Student.java", code, None).unwrap();

        let bad = check("package pip.lessons.hello;\n\npublic class Student {\n  void go() { int total = \"x\"; }\n}\n");
        let diags = bad["diagnostics"].as_array().unwrap();
        assert_eq!(diags.len(), 1, "{bad}");
        assert_eq!((diags[0]["line"].as_i64(), diags[0]["severity"].as_str()), (Some(4), Some("ERROR")));
        assert!(diags[0]["message"].as_str().unwrap().contains("incompatible types"), "{bad}");

        // Sibling Robot.java resolves through -sourcepath.
        let good = check("package pip.lessons.hello;\n\npublic class Student {\n  int go() { return new Robot().x(); }\n}\n");
        assert_eq!(good["diagnostics"].as_array().unwrap().len(), 0, "{good}");
        fs_remove(root.to_string_lossy().into_owned()).unwrap();
    }

    #[test]
    fn completes_members() {
        let Some(home) = find_jdk() else { return eprintln!("no JDK found, skipping") };
        let root = PathBuf::from(fs_mkdtemp(std::env::temp_dir().join("pip-complete-").to_string_lossy().into_owned()).unwrap());
        let pkg = root.join("pip/lessons/drive");
        fs::create_dir_all(&pkg).unwrap();
        fs::write(pkg.join("Robot.java"), "package pip.lessons.drive;\npublic class Robot { public void setPower(double left, double right) {} }\n").unwrap();
        let src = concat!(env!("CARGO_MANIFEST_DIR"), "/../desktop/DiagD.java");
        let classes = root.join("classes");
        // Cursor at the end of `body`, followed by the rest of the method.
        let labels = |body: &str| -> Vec<String> {
            let code = format!("package pip.lessons.drive;\nimport java.util.*;\npublic class Student {{\n  public static void main(String[] args) {{\n    {body}");
            let full = format!("{code}\n  }}\n}}\n");
            let v = diag_request(Path::new(src), &classes, &home, &root.to_string_lossy(), "pip/lessons/drive/Student.java", &full, Some(code.encode_utf16().count())).unwrap();
            v["items"].as_array().unwrap().iter().map(|i| i["label"].as_str().unwrap().to_string()).collect()
        };
        let has = |l: &[String], n: &str| l.iter().any(|x| x == n);

        let robot = labels("Robot robot = new Robot(); robot.");
        assert!(has(&robot, "setPower"), "{robot:?}");
        let text = labels("\"abc\".");
        assert!(has(&text, "length") && has(&text, "charAt") && !has(&text, "nextInt"), "{text:?}");
        let math = labels("double m = Math.");
        assert!(has(&math, "max") && has(&math, "sqrt"), "{math:?}");
        let scanner = labels("Scanner console = new Scanner(System.in); console.");
        assert!(has(&scanner, "nextInt"), "{scanner:?}");
        fs_remove(root.to_string_lossy().into_owned()).unwrap();
    }
}
