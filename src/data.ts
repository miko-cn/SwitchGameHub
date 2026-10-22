export interface Score { score: number; by: string; platform?: string; src?: string }
export interface UserScore { pct: number; total: number; desc?: string; by: string; platform?: string; src?: string }
export type Conf = 'high' | 'medium' | 'low' | 'none'
export interface PriceEntry {
  region: string; currency: string; amount: number; by: string; label?: string; src?: string
  media?: string; tax_included?: boolean; free?: boolean
}
export interface PriceCny {
  amount: number; from_region: string; from_currency: string; from_amount: number
  rate: number; rate_date: string; rate_src: string; note?: string
}
export interface Lowest {
  kind: 'switch' | 'steam'; store: string; amount: number; currency: string; region: string
  date?: string; date_note?: string; regular?: number; history_from?: string; save_pct?: number
  nsuid?: string; appid?: string; src: string; src_name?: string; store_url?: string
  confidence: string; match?: string; note?: string
  cny?: number; rate?: number; rate_date?: string; rate_src?: string
}
export interface LowestMissing {
  reason: string; label: string
}
export interface Screenshot { path: string; thumb?: string; file?: string; remote?: string; url: string; src: string; by: string; w: number; h: number; ar?: number }
export interface Game {
  序号: number; 原始名称: string; 中文名: string; 英文名: string; 语言标注: string; 备注: string
  title_zh?: string; title_en?: string; year?: number | null; release_date?: string | null; year_is_switch?: boolean
  genres?: string[]; genres_raw?: string[]; developers?: string[]; publishers?: string[]
  critic?: Score | null; critic_alt?: Score | null; user?: UserScore | null
  summary?: string | null; summary_en?: string; summary_lang?: string; summary_src?: string; summary_note?: string
  cover?: string | null; cover_src?: string; links?: { name: string; url: string }[]
  confidence: Conf; match_note?: string; match_uncertain?: boolean
  sources?: Record<string, string>; source_conf?: Record<string, string>
  thumb?: string | null; thumb_ar?: number
  screenshots?: Screenshot[]
  prices?: PriceEntry[]
  price_cny?: PriceCny | null
  lowest?: Lowest | null
  lowest_missing?: LowestMissing | null
  // derived
  _hay?: string; _name?: string
}

export const CONF_LABEL: Record<string, string> = { high: '高', medium: '中', low: '低', none: '未匹配' }
export const SRC_NAME: Record<string, string> = {
  wikidata: 'Wikidata', wikidata_r2: 'Wikidata（二轮）', steam: 'Steam', steam_r2: 'Steam（二轮）', gamersky: '游民星空',
  noa: '任天堂美服', eu: '任天堂欧服', jp: '任天堂日服', hk: '任天堂香港', metacritic: 'Metacritic', igdb: 'IGDB',
}

export const gameName = (g: Game) => g.中文名 || g.title_zh || g.英文名 || g.title_en || g.原始名称
export const gameEn = (g: Game) => {
  const e = g.title_en || g.英文名 || ''
  return e && e !== gameName(g) ? e : ''
}
export const hasData = (g: Game) => g.confidence !== 'none'

export async function loadGames(): Promise<Game[]> {
  const r = await fetch('data/games.json')
  const games: Game[] = await r.json()
  for (const g of games) {
    g._name = gameName(g)
    g._hay = [g.原始名称, g.中文名, g.英文名, g.title_zh, g.title_en, ...(g.developers || []), ...(g.publishers || []), ...(g.genres || []), String(g.序号)]
      .filter(Boolean).join(' ').toLowerCase()
  }
  return games
}

/** Which source key a URL belongs to, so a field can show that source's match confidence. */
export function sourceKeyOf(url?: string | null, g?: Game): string | null {
  if (!url) return null
  const u = url.toLowerCase()
  const pick = (a: string, b: string) => (g?.source_conf?.[a] ? a : g?.source_conf?.[b] ? b : a)
  if (u.includes('wikidata.org')) return pick('wikidata', 'wikidata_r2')
  if (u.includes('steampowered.com')) return pick('steam', 'steam_r2')
  if (u.includes('metacritic.com')) return 'metacritic'
  if (u.includes('gamersky.com')) return 'gamersky'
  if (u.includes('store-jp.nintendo') || u.includes('nintendo.co.jp')) return 'jp'
  if (u.includes('nintendo.com/hk') || u.includes('nintendo.com.hk')) return 'hk'
  if (u.includes('nintendo.com/us') || u.includes('nintendo.com/en-us')) return 'noa'
  if (u.includes('nintendo.com/en-gb') || u.includes('nintendo.com/eu') || u.includes('nintendo.co.uk') || u.includes('nintendo.com/de')) return 'eu'
  if (u.includes('igdb.com')) return 'igdb'
  return null
}
export function confOf(url: string | null | undefined, g: Game): Conf | null {
  const k = sourceKeyOf(url, g)
  const c = k ? g.source_conf?.[k] : null
  return (c as Conf) || null
}
export const hostOf = (u?: string) => { try { return u ? new URL(u).hostname.replace(/^www\./, '') : '' } catch { return '' } }

/** deterministic small hash for placeholder colours */
export function hash(s: string) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
