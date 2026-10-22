use serde::Serialize;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

const USERDATA: &str = "userdata.json";

fn data_dir(app: &AppHandle) -> Result<PathBuf, String> {
    let d = app.path().app_data_dir().map_err(|e| e.to_string())?;
    fs::create_dir_all(&d).map_err(|e| e.to_string())?;
    Ok(d)
}

/// Optional full-resolution covers folder. Looked up (first hit wins):
/// 1. $SWITCHLIB_COVERS  2. <app data dir>/covers  3. <exe dir>/covers  4. <exe dir>/../share/switch-library/covers
fn find_covers(app: &AppHandle) -> Option<PathBuf> { find_folder(app, "SWITCHLIB_COVERS", "covers") }

/// Optional full-size screenshot pack (same lookup order, folder name "screenshots", env $SWITCHLIB_SCREENSHOTS).
fn find_screenshots(app: &AppHandle) -> Option<PathBuf> { find_folder(app, "SWITCHLIB_SCREENSHOTS", "screenshots") }

fn find_folder(app: &AppHandle, env: &str, name: &str) -> Option<PathBuf> {
    let mut c: Vec<PathBuf> = vec![];
    if let Ok(p) = std::env::var(env) { c.push(PathBuf::from(p)); }
    if let Ok(d) = data_dir(app) { c.push(d.join(name)); }
    if let Ok(exe) = std::env::current_exe() {
        if let Some(dir) = exe.parent() {
            c.push(dir.join(name));
            c.push(dir.join("../share/switch-library").join(name));
        }
    }
    // AppImage: next to the .AppImage file itself
    if let Ok(ai) = std::env::var("APPIMAGE") { if let Some(dir) = Path::new(&ai).parent() { c.push(dir.join(name)); } }
    c.into_iter().find(|p| p.is_dir() && fs::read_dir(p).map(|mut r| r.next().is_some()).unwrap_or(false))
        .and_then(|p| p.canonicalize().ok())
}

#[derive(Serialize)]
struct Paths { data_dir: String, userdata_file: String, covers_dir: Option<String>, screenshots_dir: Option<String> }

#[tauri::command]
fn data_paths(app: AppHandle) -> Result<Paths, String> {
    let d = data_dir(&app)?;
    let covers = find_covers(&app);
    if let Some(cv) = &covers {
        let _ = app.asset_protocol_scope().allow_directory(cv, true);
    }
    let shots = find_screenshots(&app);
    if let Some(sd) = &shots {
        let _ = app.asset_protocol_scope().allow_directory(sd, true);
    }
    Ok(Paths {
        userdata_file: d.join(USERDATA).to_string_lossy().into_owned(),
        data_dir: d.to_string_lossy().into_owned(),
        covers_dir: covers.map(|p| p.to_string_lossy().into_owned()),
        screenshots_dir: shots.map(|p| p.to_string_lossy().into_owned()),
    })
}

#[tauri::command]
fn load_userdata(app: AppHandle) -> Result<Option<String>, String> {
    let f = data_dir(&app)?.join(USERDATA);
    if !f.exists() { return Ok(None); }
    fs::read_to_string(&f).map(Some).map_err(|e| e.to_string())
}

/// Atomic write: tmp file + rename; previous version kept as userdata.json.bak
#[tauri::command]
fn save_userdata(app: AppHandle, json: String) -> Result<(), String> {
    serde_json::from_str::<serde_json::Value>(&json).map_err(|e| format!("invalid json: {e}"))?;
    let d = data_dir(&app)?;
    let f = d.join(USERDATA);
    let tmp = d.join("userdata.json.tmp");
    fs::write(&tmp, json.as_bytes()).map_err(|e| e.to_string())?;
    if f.exists() { let _ = fs::copy(&f, d.join("userdata.json.bak")); }
    fs::rename(&tmp, &f).map_err(|e| e.to_string())
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> { fs::read_to_string(path).map_err(|e| e.to_string()) }

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> { fs::write(path, contents).map_err(|e| e.to_string()) }

#[tauri::command]
fn open_data_dir(app: AppHandle) -> Result<(), String> {
    let d = data_dir(&app)?;
    app.opener().open_path(d.to_string_lossy(), None::<&str>).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![data_paths, load_userdata, save_userdata, read_text_file, write_text_file, open_data_dir])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
