import { ReactNode } from 'react'
import { CONF_LABEL, Conf, hostOf } from '../data'
import { openUrl } from '../platform'

export function scoreColor(s: number) { return s >= 85 ? '#1fb5bc' : s >= 75 ? '#8fd0a0' : s >= 65 ? '#f3db74' : '#ff8a7a' }
export function ScoreBadge({ s, small = false }: { s: number; small?: boolean }) {
  const c = scoreColor(s)
  return <span className={`inline-grid place-items-center font-display font-bold tabular-nums rounded-[8px] ${small ? 'w-8 h-[22px] text-[12.5px]' : 'w-12 h-9 text-lg'}`}
    style={{ background: 'rgb(10 12 15 / .78)', color: c, boxShadow: `inset 0 0 0 1.5px ${c}` }}>{Math.round(s)}</span>
}
export function Ext({ href, children, className = '' }: { href?: string | null; children: ReactNode; className?: string }) {
  if (!href) return <>{children}</>
  return <a href={href} onClick={e => { e.preventDefault(); e.stopPropagation(); openUrl(href) }} title={href}
    className={`underline decoration-white/15 underline-offset-[3px] hover:decoration-jblue hover:text-jblue transition-colors ${className}`}>{children}</a>
}
export function SrcTag({ url, conf }: { url?: string | null; conf?: Conf | null }) {
  if (!url && !conf) return null
  return <span className="inline-flex items-center gap-1.5 text-[11px] text-dim ml-2 align-middle">
    {url && <Ext href={url}>{hostOf(url)}</Ext>}
    {conf && <span className={`conf-${conf}`}>· 匹配{CONF_LABEL[conf]}</span>}
  </span>
}
export function Icon({ d, size = 18, className = '' }: { d: string; size?: number; className?: string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" className={className}><path d={d} /></svg>
}
export const I = {
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  heart: 'M12 20s-7-4.4-9.3-9C1.2 8 3 4.6 6.4 4.3c2-.2 3.4.9 4.2 2.1.4.6 1.2.6 1.6 0 .8-1.2 2.2-2.3 4.2-2.1 3.4.3 5.2 3.7 3.7 6.7C19 15.6 12 20 12 20z',
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14zM20 20l-4-4',
  filter: 'M4 6h16M7 12h10M10 18h4',
  x: 'M6 6l12 12M18 6L6 18',
  star: 'M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.9l-5.2 2.7 1-5.8L3.5 9.7l5.9-.9z',
  data: 'M4 7c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 7v10c0 1.7 3.6 3 8 3s8-1.3 8-3V7M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3',
  chev: 'M9 6l6 6-6 6', chevL: 'M15 6l-6 6 6 6',
  tag: 'M3 12V4h8l9 9-8 8zM7.5 7.5h.01',
  link: 'M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1',
  warn: 'M12 4l9 16H3zM12 10v4M12 17h.01',
  shuffle: 'M4 7h3c5 0 5 10 10 10h3M4 17h3c1.6 0 2.7-1 3.6-2.4M20 7h-3c-1.6 0-2.7 1-3.6 2.4M17 4l3 3-3 3M17 14l3 3-3 3',
  play: 'M8 5l11 7-11 7z',
  sort: 'M7 4v16M3 16l4 4 4-4M17 20V4M13 8l4-4 4 4',
}
