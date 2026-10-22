// Bridge to the Tauri backend; falls back to localStorage when running in a plain browser (dev / screenshots).
import { invoke, convertFileSrc } from '@tauri-apps/api/core'

export const isTauri = typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
const LS = 'switchlib_userdata_v2'

export interface Paths { data_dir: string; userdata_file: string; covers_dir: string | null; screenshots_dir?: string | null }

export async function loadUserdata(): Promise<string | null> {
  if (isTauri) return await invoke<string | null>('load_userdata')
  return localStorage.getItem(LS)
}
export async function saveUserdata(json: string): Promise<void> {
  if (isTauri) { await invoke('save_userdata', { json }); return }
  localStorage.setItem(LS, json)
}
export async function getPaths(): Promise<Paths | null> {
  if (!isTauri) return null
  return await invoke<Paths>('data_paths')
}
export function fileUrl(path: string) { return convertFileSrc(path) }

export async function openUrl(url: string) {
  if (isTauri) { const { openUrl } = await import('@tauri-apps/plugin-opener'); await openUrl(url); return }
  window.open(url, '_blank', 'noopener')
}
export async function openDataDir() { if (isTauri) await invoke('open_data_dir') }

export async function exportText(defaultName: string, text: string): Promise<string | null> {
  if (isTauri) {
    const { save } = await import('@tauri-apps/plugin-dialog')
    const p = await save({ defaultPath: defaultName, filters: [{ name: defaultName.endsWith('.csv') ? 'CSV' : 'JSON', extensions: [defaultName.split('.').pop()!] }] })
    if (!p) return null
    await invoke('write_text_file', { path: p, contents: text })
    return p
  }
  const a = document.createElement('a')
  a.href = URL.createObjectURL(new Blob([text], { type: 'application/octet-stream' })); a.download = defaultName; a.click()
  return defaultName
}
export async function importText(): Promise<string | null> {
  if (isTauri) {
    const { open } = await import('@tauri-apps/plugin-dialog')
    const p = await open({ multiple: false, filters: [{ name: 'JSON', extensions: ['json'] }] })
    if (!p || Array.isArray(p)) return null
    return await invoke<string>('read_text_file', { path: p })
  }
  return new Promise(res => {
    const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'
    i.onchange = () => { const f = i.files?.[0]; if (!f) return res(null); f.text().then(res) }
    i.click()
  })
}
