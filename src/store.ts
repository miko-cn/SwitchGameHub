import { useSyncExternalStore } from 'react'
import { loadUserdata, saveUserdata } from './platform'
import {
  APP_ID, APP_VERSION, Entry, FORMAT_VERSION, ImportMode, ImportResult, Status, UserData,
  buildExport, emptyUserData, exportCSV, isEmptyEntry, mergeEntries, parseAndMigrate,
} from './userdata'

export type { Status, Entry, UserData, ImportMode, ImportResult }
export { APP_VERSION, FORMAT_VERSION, STATUS_KEYS, exportCSV } from './userdata'
export { ImportError } from './userdata'

export const STATUS: { k: Exclude<Status, ''>; label: string; color: string }[] = [
  { k: 'want', label: '想玩', color: 'var(--c-want)' },
  { k: 'playing', label: '在玩', color: 'var(--c-playing)' },
  { k: 'played', label: '已玩', color: 'var(--c-played)' },
  { k: 'done', label: '已通关', color: 'var(--c-done)' },
  { k: 'shelved', label: '搁置', color: 'var(--c-shelved)' },
]
export const STATUS_LABEL: Record<string, string> = Object.fromEntries(STATUS.map(s => [s.k, s.label]))

let data: UserData = emptyUserData()
let ver = 0
const subs = new Set<() => void>()
const emit = () => { ver++; subs.forEach(f => f()) }
let saveTimer: ReturnType<typeof setTimeout> | undefined
let lastError: string | null = null

function persist(delay = 0) {
  clearTimeout(saveTimer)
  const run = () => saveUserdata(JSON.stringify(data, null, 2)).then(() => { lastError = null }).catch(e => { lastError = String(e); console.error(e) })
  if (delay) saveTimer = setTimeout(run, delay); else run()
}
export const flush = () => { if (saveTimer) { clearTimeout(saveTimer); saveTimer = undefined; return saveUserdata(JSON.stringify(data, null, 2)) } }
export const saveError = () => lastError

/** Upgrade on-disk userdata (may still be the early {version:2,entries} shape) into the canonical form. */
function hydrate(raw: unknown): UserData {
  if (!raw || typeof raw !== 'object') return emptyUserData()
  try {
    const { data: migrated } = parseAndMigrate(JSON.stringify(raw))
    return migrated
  } catch {
    const d = raw as Record<string, unknown>
    if (d.entries && typeof d.entries === 'object') {
      return {
        format_version: FORMAT_VERSION, app_version: APP_VERSION, app: APP_ID,
        entries: d.entries as Record<string, Entry>,
        meta: typeof d.meta === 'object' && d.meta ? d.meta as Record<string, unknown> : undefined,
      }
    }
    return emptyUserData()
  }
}

export async function initStore() {
  try {
    const raw = await loadUserdata()
    if (raw) data = hydrate(JSON.parse(raw))
  } catch (e) { console.error('userdata load failed', e) }
  emit()
}

export function update(id: number, patch: Partial<Entry>, delay = 0) {
  const k = String(id)
  const e: Entry = { ...(data.entries[k] || { updated: 0 }), ...patch, updated: Date.now() }
  const entries = { ...data.entries }
  if (isEmptyEntry(e)) delete entries[k]; else entries[k] = e
  data = { ...data, entries }
  emit(); persist(delay)
}

export function useUserdata() { useSyncExternalStore(cb => { subs.add(cb); return () => subs.delete(cb) }, () => ver); return data }
export const getEntry = (id: number): Entry | undefined => data.entries[String(id)]
export const allTags = () => {
  const m = new Map<string, number>()
  Object.values(data.entries).forEach(e => e.tags?.forEach(t => m.set(t, (m.get(t) || 0) + 1)))
  return [...m.entries()].sort((a, b) => b[1] - a[1])
}

export function exportJSON(): string { return buildExport(data) }

export function importJSON(text: string, mode: ImportMode = 'merge'): ImportResult {
  const parsed = parseAndMigrate(text)
  const { entries, count } = mergeEntries(data.entries, parsed.data.entries, mode)
  data = {
    ...data,
    ...Object.fromEntries(Object.entries(parsed.data).filter(([k]) => !['entries', 'format_version', 'app_version', 'app', 'exported_at'].includes(k))),
    format_version: FORMAT_VERSION,
    app_version: APP_VERSION,
    app: APP_ID,
    entries,
    meta: { ...(data.meta || {}), ...(parsed.data.meta || {}) },
  }
  emit(); persist()
  return {
    count, kind: parsed.kindLabel, format_version: parsed.format_version, mode,
    warning: parsed.warning, migrations: parsed.migrations,
  }
}

/** Peek at a file without applying — used by the UI to show a confirmation for replace / newer-format warnings. */
export function inspectImport(text: string) { return parseAndMigrate(text) }
