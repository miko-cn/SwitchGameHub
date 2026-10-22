/**
 * Userdata export/import with versioned format + migration chain.
 * On-disk and exported JSON share the same schema (see USERDATA_SCHEMA.md).
 */

export const APP_ID = 'switch-library' as const
export const APP_VERSION = '1.1.3'
/** Integer schema version of the JSON we write today. Bump when Entry / UserData shape changes. */
export const FORMAT_VERSION = 3
/** Highest format_version this build can migrate from / write. Imports with a higher number get best-effort + warning. */
export const FORMAT_VERSION_MAX_KNOWN = 3

export type Status = '' | 'want' | 'playing' | 'played' | 'done' | 'shelved'
export const STATUS_KEYS: Exclude<Status, ''>[] = ['want', 'playing', 'played', 'done', 'shelved']
export const STATUS_LABEL: Record<string, string> = {
  want: '想玩', playing: '在玩', played: '已玩', done: '已通关', shelved: '搁置',
}

/** Known fields of one game's user record. Unknown keys are preserved for forward-compat. */
/** Manual price correction; overrides catalogue display only (never written back to games.json). */
export interface PriceOverride {
  launch_cny?: number | null
  lowest_cny?: number | null
  note?: string
  updated?: number
}

export interface Entry {
  status?: Status
  fav?: boolean
  rating?: number
  note?: string
  tags?: string[]
  /** User-corrected launch / 史低 CNY amounts shown in the detail price card. */
  price_override?: PriceOverride
  updated: number
  [extra: string]: unknown
}

export interface UserData {
  format_version: number
  app_version: string
  app: typeof APP_ID
  entries: Record<string, Entry>
  meta?: Record<string, unknown>
  /** Present only in files written by exportJSON (not in the live on-disk store). */
  exported_at?: string
  /** Catch-all for future top-level fields. */
  [extra: string]: unknown
}

export type ImportMode = 'merge' | 'replace'
export type DetectedKind = 'current' | 'v2-early' | 'legacy-web' | 'newer' | 'unknown'

export interface ImportResult {
  count: number
  kind: string
  format_version: number | 'legacy-web'
  mode: ImportMode
  /** Chinese message when the file is newer than this app (best-effort import). */
  warning?: string
  migrations: string[]
}

export class ImportError extends Error {
  constructor(message: string) { super(message); this.name = 'ImportError' }
}

const STATUS_SET = new Set<string>(STATUS_KEYS)
const STATUS_ALIASES: Record<string, Status> = {
  want: 'want', wishlist: 'want', want_to_play: 'want', '想玩': 'want',
  playing: 'playing', in_progress: 'playing', '在玩': 'playing',
  played: 'played', finished_partial: 'played', '已玩': 'played',
  done: 'done', completed: 'done', cleared: 'done', '已通关': 'done',
  shelved: 'shelved', dropped: 'shelved', on_hold: 'shelved', '搁置': 'shelved',
}

export function emptyUserData(): UserData {
  return { format_version: FORMAT_VERSION, app_version: APP_VERSION, app: APP_ID, entries: {} }
}

export function isEmptyEntry(e: Entry): boolean {
  const po = e.price_override
  const hasPrice = !!(po && (typeof po.launch_cny === 'number' || typeof po.lowest_cny === 'number' || (po.note && String(po.note).trim())))
  return !e.status && !e.fav && !(typeof e.rating === 'number' && e.rating > 0)
    && !(e.note && String(e.note).trim()) && !(e.tags && e.tags.length) && !hasPrice
}

/** Normalize one entry: coerce types, map status aliases, clamp rating 1–10, keep unknown keys. */
export function normalizeEntry(raw: unknown, now = Date.now()): Entry | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const e: Entry = { updated: typeof r.updated === 'number' ? r.updated : now }
  // preserve unknown keys first, then overwrite known ones
  for (const [k, v] of Object.entries(r)) {
    if (['status', 'fav', 'rating', 'note', 'tags', 'updated', 'price_override'].includes(k)) continue
    e[k] = v
  }
  if (r.status != null && r.status !== '') {
    const s = String(r.status)
    const mapped = STATUS_SET.has(s) ? (s as Status) : STATUS_ALIASES[s]
    if (mapped) e.status = mapped
    // unknown status strings: drop (don't crash); they are not preserved as status
  }
  if (typeof r.fav === 'boolean') e.fav = r.fav
  else if (r.fav === 1 || r.fav === '1' || r.fav === 'true' || r.fav === '是') e.fav = true
  if (typeof r.rating === 'number' && Number.isFinite(r.rating)) {
    e.rating = Math.max(0, Math.min(10, Math.round(r.rating)))
    if (e.rating === 0) delete e.rating
  } else if (typeof r.rating === 'string' && /^\d+(\.\d+)?$/.test(r.rating)) {
    const n = Math.round(parseFloat(r.rating))
    if (n >= 1 && n <= 10) e.rating = n
  }
  if (typeof r.note === 'string') e.note = r.note
  if (Array.isArray(r.tags)) e.tags = [...new Set(r.tags.map(t => String(t).trim()).filter(Boolean))]
  else if (typeof r.tags === 'string' && r.tags.trim()) e.tags = r.tags.split(/[,，;；|/]/).map(t => t.trim()).filter(Boolean)
  if (r.price_override && typeof r.price_override === 'object') {
    const po = r.price_override as Record<string, unknown>
    const out: PriceOverride = {}
    if (typeof po.launch_cny === 'number' && Number.isFinite(po.launch_cny) && po.launch_cny >= 0) out.launch_cny = Math.round(po.launch_cny * 100) / 100
    else if (po.launch_cny === null) out.launch_cny = null
    if (typeof po.lowest_cny === 'number' && Number.isFinite(po.lowest_cny) && po.lowest_cny >= 0) out.lowest_cny = Math.round(po.lowest_cny * 100) / 100
    else if (po.lowest_cny === null) out.lowest_cny = null
    if (typeof po.note === 'string' && po.note.trim()) out.note = po.note.trim()
    if (typeof po.updated === 'number') out.updated = po.updated
    if (Object.keys(out).length) e.price_override = out
  }
  return isEmptyEntry(e) && Object.keys(e).every(k => k === 'updated') ? null : e
}

function migrateLegacyMarks(marks: Record<string, unknown>): { entries: Record<string, Entry>; note: string } {
  const entries: Record<string, Entry> = {}
  const now = Date.now()
  for (const [k, raw] of Object.entries(marks)) {
    if (!/^\d+$/.test(k) || !raw || typeof raw !== 'object') continue
    const m = raw as Record<string, unknown>
    const e: Entry = { updated: now }
    // priority: played > want (old tool allowed both checkboxes)
    if (m.played) e.status = 'played'
    else if (m.want) e.status = 'want'
    if (m.fav) e.fav = true
    // forward-compat: if legacy somehow has rating/note/tags, keep them
    const n = normalizeEntry({ ...m, status: e.status, fav: e.fav, updated: now }, now)
    if (n && !isEmptyEntry(n)) entries[k] = n
  }
  return { entries, note: 'legacy-web → v2：played/want → status，fav 保留' }
}

/** Detect format and return a migrated UserData-shaped payload (not yet applied to the store). */
export function parseAndMigrate(text: string): {
  data: UserData
  kind: DetectedKind
  kindLabel: string
  format_version: number | 'legacy-web'
  migrations: string[]
  warning?: string
} {
  let raw: unknown
  try { raw = JSON.parse(text) } catch { throw new ImportError('不是合法的 JSON 文件') }
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new ImportError('无法识别的文件：根节点必须是对象')

  const d = raw as Record<string, unknown>
  const migrations: string[] = []

  // --- legacy-web: { version:1, marks:{...} } or bare marks map ---
  const looksLegacy = (d.marks && typeof d.marks === 'object' && !Array.isArray(d.marks))
    || (d.version === 1 && !d.entries)
    || (!('entries' in d) && !('format_version' in d) && Object.keys(d).length > 0 && Object.keys(d).every(k => /^\d+$/.test(k) || k === 'version'))
  if (looksLegacy && !d.entries) {
    const marks = (d.marks && typeof d.marks === 'object' ? d.marks : d) as Record<string, unknown>
    // bare object of numeric keys only
    if (d.marks || Object.keys(marks).some(k => /^\d+$/.test(k))) {
      const { entries, note } = migrateLegacyMarks(d.marks ? marks : Object.fromEntries(Object.entries(marks).filter(([k]) => /^\d+$/.test(k))))
      migrations.push(note)
      return {
        data: { format_version: FORMAT_VERSION, app_version: APP_VERSION, app: APP_ID, entries, meta: { imported_from: 'legacy-web' } },
        kind: 'legacy-web', kindLabel: '旧版网页工具标记（legacy-web）',
        format_version: 'legacy-web', migrations,
      }
    }
  }

  if (!(d.entries && typeof d.entries === 'object' && !Array.isArray(d.entries))) {
    throw new ImportError('无法识别的文件：缺少 entries，也不是旧版 switch-marks.json')
  }

  const fvRaw = d.format_version ?? d.version
  let fv = typeof fvRaw === 'number' ? fvRaw : typeof fvRaw === 'string' && /^\d+$/.test(fvRaw) ? parseInt(fvRaw, 10) : 2
  let kind: DetectedKind = 'current'
  let kindLabel = '本应用备份'
  let warning: string | undefined

  if (d.format_version == null && d.version === 2) {
    kind = 'v2-early'
    kindLabel = '本应用早期备份（version:2 → format_version:2）'
    migrations.push('v2-early：补齐 format_version / app_version 字段名')
  }

  if (fv > FORMAT_VERSION_MAX_KNOWN) {
    kind = 'newer'
    kindLabel = `较新版本的备份（format_version ${fv}）`
    warning = `此备份来自更新的应用（format_version ${fv}，当前应用只完整支持到 ${FORMAT_VERSION_MAX_KNOWN}）。已尽量导入已知字段，未知字段会原样保留；部分新功能的数据可能无法显示。`
    migrations.push(`newer→v${FORMAT_VERSION}：尽最大努力读取已知字段，保留未知字段`)
  } else if (fv < 2) {
    // reserved for future: v1 with entries (none shipped); treat as needing migration to 2
    migrations.push(`v${fv} → v2：规范化条目字段`)
    kindLabel = `旧版备份（format_version ${fv}）`
  } else if (fv === 2) {
    // v2 → v3: additive only (Entry.price_override). Nothing to rewrite; 1.1.x builds keep the field as an unknown key.
    migrations.push('v2 → v3：新增可选 price_override（价格手动更正），原有字段不变')
    if (kind === 'current') kindLabel = '本应用备份（format_version 2）'
  } else if (kind === 'current') {
    kindLabel = '本应用备份'
  }

  // Migration chain: legacy-web → 2 → 3. v3 only adds Entry.price_override, so normalize covers it.
  const srcEntries = d.entries as Record<string, unknown>
  const entries: Record<string, Entry> = {}
  const now = Date.now()
  for (const [k, v] of Object.entries(srcEntries)) {
    if (!/^\d+$/.test(k)) continue
    const n = normalizeEntry(v, now)
    if (n) entries[k] = n
  }
  if (fv < 2) migrations.push('条目：status 别名映射、rating 限制为 1–10、tags 去重')

  // Preserve unknown top-level keys for forward-compat (except we overwrite the canonical ones)
  const reserved = new Set(['format_version', 'version', 'app_version', 'app', 'entries', 'meta', 'exported_at', 'marks'])
  const data: UserData = {
    format_version: FORMAT_VERSION,
    app_version: APP_VERSION,
    app: APP_ID,
    entries,
    meta: {
      ...(typeof d.meta === 'object' && d.meta && !Array.isArray(d.meta) ? d.meta as Record<string, unknown> : {}),
      ...(kind === 'newer' ? { imported_newer_format: fv } : {}),
    },
  }
  for (const [k, v] of Object.entries(d)) {
    if (reserved.has(k)) continue
    data[k] = v
  }

  return { data, kind, kindLabel, format_version: kind === 'newer' ? fv : FORMAT_VERSION, migrations, warning }
}

export function buildExport(data: UserData): string {
  const out: UserData = {
    ...data,
    format_version: FORMAT_VERSION,
    app_version: APP_VERSION,
    app: APP_ID,
    exported_at: new Date().toISOString(),
    entries: data.entries,
  }
  // drop the old `version` field if present so exports are unambiguous
  delete (out as Record<string, unknown>).version
  return JSON.stringify(out, null, 2)
}

export function mergeEntries(current: Record<string, Entry>, incoming: Record<string, Entry>, mode: ImportMode): { entries: Record<string, Entry>; count: number } {
  const entries: Record<string, Entry> = mode === 'replace' ? {} : { ...current }
  let count = 0
  for (const [k, e] of Object.entries(incoming)) {
    const cur = entries[k]
    if (!cur) { entries[k] = e; count++; continue }
    // merge: incoming wins on scalar fields that are set; tags union; notes concatenate unique lines
    const tags = [...new Set([...(cur.tags || []), ...(e.tags || [])])]
    const notes = [cur.note, e.note].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i)
    const merged: Entry = {
      ...cur,
      ...e,
      fav: e.fav || cur.fav || undefined,
      status: e.status || cur.status || undefined,
      rating: e.rating ?? cur.rating,
      tags: tags.length ? tags : undefined,
      note: notes.length ? notes.join('\n') : undefined,
      updated: Math.max(cur.updated || 0, e.updated || 0),
    }
    // re-copy unknown keys from both
    for (const src of [cur, e]) for (const [kk, vv] of Object.entries(src)) {
      if (['status', 'fav', 'rating', 'note', 'tags', 'updated'].includes(kk)) continue
      if (!(kk in merged) || src === e) merged[kk] = vv
    }
    entries[k] = merged
    count++
  }
  return { entries, count }
}

export function exportCSV(entries: Record<string, Entry>, nameOf: (id: string) => string): string {
  const esc = (s: unknown) => `"${String(s ?? '').replace(/"/g, '""')}"`
  const rows = Object.entries(entries).sort((a, b) => +a[0] - +b[0]).map(([k, e]) =>
    [k, esc(nameOf(k)), STATUS_LABEL[e.status || ''] || '', e.fav ? '是' : '', e.rating ?? '', esc((e.tags || []).join('|')), esc(e.note), e.updated || ''].join(','))
  return '\ufeff序号,名称,状态,收藏,我的评分,标签,笔记,更新时间\n' + rows.join('\n')
}
