import { useState } from 'react'
import { Game, hash } from '../data'
import { fullCover } from '../covers'

const PALETTES = [['#2a1215', '#ff4b3e'], ['#0c2230', '#18c0f0'], ['#10272a', '#1fb5bc'], ['#2b2510', '#f3db74'], ['#1b1730', '#9b8cff'], ['#22161f', '#ff7ab6']]

/** Placeholder art for games without a cover: typographic, colour from a stable hash of the name. */
export function Placeholder({ g, big = false }: { g: Game; big?: boolean }) {
  const n = g._name || g.原始名称
  const [bg, fg] = PALETTES[hash(n) % PALETTES.length]
  const glyphs = [...n.replace(/[\s:：·・\-—_()（）《》【】\[\]!！?？.,，、0-9]/g, '')].slice(0, 2).join('') || n.slice(0, 2)
  return (
    <div className="absolute inset-0 overflow-hidden" style={{ background: `radial-gradient(120% 90% at 0% 0%, ${fg}33, transparent 60%), linear-gradient(160deg, ${bg}, #0b0d10)` }}>
      <div className="absolute inset-0 opacity-[.07]" style={{ backgroundImage: `repeating-linear-gradient(135deg, ${fg} 0 1px, transparent 1px 9px)` }} />
      <div className={`absolute left-[8%] bottom-[6%] font-cjk-display leading-none select-none whitespace-nowrap ${big ? 'text-[4.6rem]' : 'text-[3.6rem]'}`} style={{ color: fg, opacity: .85, textShadow: `0 0 24px ${fg}55` }}>{glyphs}</div>
      <div className={`absolute right-[7%] top-[7%] font-mono ${big ? 'text-sm' : 'text-[10px]'} tracking-widest`} style={{ color: fg, opacity: .6 }}>NO.{String(g.序号).padStart(4, '0')}</div>
      <div className={`absolute left-[8%] right-[8%] top-[18%] ${big ? 'text-lg' : 'text-[12px]'} leading-snug text-white/75 line-clamp-3`}>{n}</div>
    </div>
  )
}

export function CoverImg({ g, full = false, className = '' }: { g: Game; full?: boolean; className?: string }) {
  const [ok, setOk] = useState(false)
  const [src, setSrc] = useState<string | null>(() => (full && fullCover(g)) || g.thumb || null)
  if (!src) return <Placeholder g={g} big={full} />
  return (
    <>
      {!ok && <div className="absolute inset-0 skeleton" />}
      <img src={src} alt="" loading={full ? 'eager' : 'lazy'} decoding="async" fetchPriority={full ? 'high' : undefined} draggable={false}
        onLoad={() => setOk(true)}
        onError={() => { if (src !== g.thumb && g.thumb) setSrc(g.thumb); else setSrc(null) }}
        className={`cv ${ok ? 'ok' : ''} absolute inset-0 w-full h-full object-cover ${className}`} />
    </>
  )
}
