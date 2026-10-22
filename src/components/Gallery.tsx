import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Screenshot } from '../data'
import { Ext, Icon, I } from './bits'

const BY: Record<string, string> = {
  noa: '任天堂美服 eShop', steam: 'Steam', eu: '任天堂欧服', nintendo_sg: '任天堂新加坡',
  bing: '网页图片搜索', web: '游戏媒体网站（图片搜索）', x: 'X', wiki: 'Wikipedia',
}
export const shotSource = (by: string) => BY[by] || by

function usePreload(shots: Screenshot[], index: number) {
  useEffect(() => {
    for (const d of [-1, 1, 2, -2]) {
      const s = shots[(index + d + shots.length) % shots.length]
      if (s) { const im = new Image(); im.referrerPolicy = 'no-referrer'; im.src = s.path; if (s.thumb) { const t = new Image(); t.src = s.thumb } }
    }
  }, [shots, index])
}

/** Mature multi-image viewer: featured stage + side chevrons + synced thumb strip. */
export function Gallery({ shots, onExpand }: { shots: Screenshot[]; onExpand?: (i: number) => void }) {
  const [i, setI] = useState(0)
  const strip = useRef<HTMLDivElement>(null)
  const touch = useRef<number | null>(null)
  const n = shots.length
  const cur = shots[i] || shots[0]
  const ar = cur?.w && cur?.h ? cur.w / cur.h : 16 / 9
  usePreload(shots, i)

  const go = useCallback((d: number) => {
    setI(x => (x + d + n) % n)
  }, [n])

  useEffect(() => { setI(0) }, [shots])
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${i}"]`)?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [i])

  if (!cur) return null

  return (
    <div className="rounded-2xl bg-black/35 ring-1 ring-white/[.07] overflow-hidden">
      {/* Featured stage */}
      <div
        className="relative group/stage select-none"
        onTouchStart={e => { touch.current = e.touches[0].clientX }}
        onTouchEnd={e => {
          if (touch.current === null) return
          const dx = e.changedTouches[0].clientX - touch.current
          touch.current = null
          if (Math.abs(dx) > 48) go(dx < 0 ? 1 : -1)
        }}
      >
        <div className="relative w-full bg-[#07090c]" style={{ aspectRatio: String(ar) }}>
          <AnimatePresence initial={false} mode="sync">
            <motion.img
              key={cur.path}
              src={cur.path} referrerPolicy="no-referrer" onError={e => { const t = e.currentTarget; const f = cur.thumb; if (f && !t.src.endsWith(f)) t.src = f }}
              alt={`截图 ${i + 1}`}
              draggable={false}
              decoding="async"
              width={cur.w}
              height={cur.h}
              className="absolute inset-0 w-full h-full object-contain"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>
          {/* soft side peeks */}
          <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-black/50 to-transparent opacity-80" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-black/50 to-transparent opacity-80" />
        </div>

        {n > 1 && (
          <>
            <button type="button" aria-label="上一张" onClick={() => go(-1)}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/30 hover:bg-jblue hover:ring-jblue/60 transition shadow-lg opacity-90 group-hover/stage:opacity-100">
              <Icon d={I.chevL} size={18} />
            </button>
            <button type="button" aria-label="下一张" onClick={() => go(1)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center rounded-full bg-black/70 text-white ring-1 ring-white/30 hover:bg-jblue hover:ring-jblue/60 transition shadow-lg opacity-90 group-hover/stage:opacity-100">
              <Icon d={I.chev} size={18} />
            </button>
          </>
        )}

        <div className="absolute top-2.5 left-3 flex items-center gap-2">
          <span className="font-mono text-[12px] tabular-nums px-2 py-0.5 rounded-md bg-black/75 text-white ring-1 ring-white/20">{i + 1} / {n}</span>
        </div>
        <div className="absolute top-2.5 right-3 flex items-center gap-2">
          {onExpand && (
            <button type="button" onClick={() => onExpand(i)} title="全屏查看"
              className="h-8 px-2.5 rounded-md bg-black/75 text-white text-[12px] ring-1 ring-white/25 hover:bg-white/20 transition inline-flex items-center gap-1">
              全屏
            </button>
          )}
        </div>
        <div className="absolute bottom-2.5 left-3 right-3 flex items-end justify-between gap-3 pointer-events-none">
          <span className="text-[11.5px] text-white/90 px-2 py-0.5 rounded bg-black/65 ring-1 ring-white/15">{shotSource(cur.by)} · {cur.w}×{cur.h}</span>
          <span className="pointer-events-auto">
            <Ext href={cur.src} className="!no-underline"><span className="inline-flex items-center gap-1 h-7 px-2.5 rounded-md bg-black/70 text-[11.5px] text-white ring-1 ring-white/25 hover:bg-jblue transition">来源<Icon d={I.link} size={12} /></span></Ext>
          </span>
        </div>
      </div>

      {/* Thumb strip */}
      {n > 1 && (
        <div className="relative px-2.5 py-2.5 border-t border-white/[.06] bg-black/25">
          <div ref={strip} className="scroll flex gap-2 overflow-x-auto scroll-smooth snap-x pb-0.5">
            {shots.map((sh, idx) => (
              <button key={sh.path} type="button" data-i={idx} onClick={() => setI(idx)} title={`第 ${idx + 1} 张`}
                className={`relative shrink-0 snap-start w-[96px] aspect-video rounded-lg overflow-hidden transition ring-2 ${idx === i ? 'ring-jblue opacity-100' : 'ring-white/10 opacity-55 hover:opacity-100 hover:ring-white/30'}`}>
                <img src={sh.thumb || sh.path} alt="" loading="lazy" decoding="async" className="w-full h-full object-cover" />
                <span className="absolute bottom-0.5 left-0.5 px-1 rounded bg-black/70 text-[9px] text-white font-mono">{idx + 1}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

/** Optional fullscreen lightbox — same polish as stage. */
export function Lightbox({ shots, index, onClose, onStep }: { shots: Screenshot[]; index: number; onClose: () => void; onStep: (d: number) => void }) {
  const sh = shots[index]
  const strip = useRef<HTMLDivElement>(null)
  const touch = useRef<number | null>(null)
  usePreload(shots, index)
  useEffect(() => {
    strip.current?.querySelector<HTMLElement>(`[data-i="${index}"]`)?.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
  }, [index])
  if (!sh) return null
  const ar = sh.w && sh.h ? sh.w / sh.h : 16 / 9
  return (
    <motion.div className="fixed inset-0 z-50 flex flex-col bg-black/96 backdrop-blur-md text-white" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}
      onTouchStart={e => { touch.current = e.touches[0].clientX }}
      onTouchEnd={e => { if (touch.current === null) return; const dx = e.changedTouches[0].clientX - touch.current; touch.current = null; if (Math.abs(dx) > 50) onStep(dx < 0 ? 1 : -1) }}>
      <div className="flex items-center justify-between px-6 py-3.5 shrink-0" onClick={e => e.stopPropagation()}>
        <div className="flex items-baseline gap-3 text-[14px]">
          <span className="font-mono font-semibold tabular-nums">{index + 1} <span className="text-white/55">/ {shots.length}</span></span>
          <span>{shotSource(sh.by)}</span>
          <span className="font-mono text-[13px] text-white/85">{sh.w}×{sh.h}</span>
        </div>
        <div className="flex gap-2">
          <button title="上一张 (←)" onClick={() => onStep(-1)} className="w-10 h-10 grid place-items-center rounded-full bg-white/25 hover:bg-white/40 ring-1 ring-white/35 transition"><Icon d={I.chevL} size={18} /></button>
          <button title="下一张 (→)" onClick={() => onStep(1)} className="w-10 h-10 grid place-items-center rounded-full bg-white/25 hover:bg-white/40 ring-1 ring-white/35 transition"><Icon d={I.chev} size={18} /></button>
          <button title="关闭 (Esc)" onClick={onClose} className="w-10 h-10 grid place-items-center rounded-full bg-white/25 hover:bg-jred ring-1 ring-white/35 transition"><Icon d={I.x} size={18} /></button>
        </div>
      </div>
      <div className="relative flex-1 min-h-0 flex items-center justify-center px-14 pb-2" onClick={e => e.stopPropagation()}>
        <button aria-label="上一张" onClick={() => onStep(-1)} className="absolute left-3 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/20 hover:bg-white/35 ring-1 ring-white/25 transition"><Icon d={I.chevL} size={22} /></button>
        <div className="relative max-w-full max-h-full rounded-xl overflow-hidden bg-white/[.04] shadow-2xl" style={{ aspectRatio: String(ar), width: `min(100%, calc((100vh - 210px) * ${ar}))` }}>
          <AnimatePresence initial={false} mode="sync">
            <motion.img key={sh.path} src={sh.path} referrerPolicy="no-referrer" onError={e => { const t = e.currentTarget; const f = sh.thumb; if (f && !t.src.endsWith(f)) t.src = f }} alt={`截图 ${index + 1}`} draggable={false} decoding="async"
              className="absolute inset-0 w-full h-full object-contain select-none"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }} />
          </AnimatePresence>
        </div>
        <button aria-label="下一张" onClick={() => onStep(1)} className="absolute right-3 top-1/2 -translate-y-1/2 w-12 h-12 grid place-items-center rounded-full bg-white/20 hover:bg-white/35 ring-1 ring-white/25 transition"><Icon d={I.chev} size={22} /></button>
      </div>
      <div className="shrink-0 px-6 pb-5 pt-1 flex items-center gap-4" onClick={e => e.stopPropagation()}>
        <Ext href={sh.src} className="shrink-0 !no-underline"><span className="inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-white/25 hover:bg-jblue ring-1 ring-white/40 text-[13.5px] font-medium transition">查看来源页面<Icon d={I.link} size={14} /></span></Ext>
        <div ref={strip} className="scroll flex gap-2 overflow-x-auto flex-1 py-1">
          {shots.map((x, idx) => (
            <button key={x.path} data-i={idx} onClick={() => onStep(idx - index)} title={`第 ${idx + 1} 张`}
              className={`shrink-0 w-[120px] aspect-video rounded-md overflow-hidden ring-2 transition ${idx === index ? 'ring-jblue opacity-100' : 'ring-transparent opacity-50 hover:opacity-100'}`}>
              <img src={x.thumb || x.path} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
        <span className="shrink-0 text-[12px] text-white/80 hidden md:block">← → 切换 · Esc 关闭</span>
      </div>
    </motion.div>
  )
}
