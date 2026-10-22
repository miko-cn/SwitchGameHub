import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Game, gameEn } from '../data'
import { fullCover } from '../covers'
import { ScoreBadge, Icon, I } from './bits'

const DUR = 7000
export function Hero({ items, onOpen }: { items: Game[]; onOpen: (id: number) => void }) {
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  useEffect(() => { if (paused || items.length < 2) return; const t = setTimeout(() => setI(x => (x + 1) % items.length), DUR); return () => clearTimeout(t) }, [i, paused, items.length])
  if (!items.length) return null
  const g = items[i % items.length]
  const img = fullCover(g) || g.thumb!
  return (
    <section className="relative h-[340px] rounded-[22px] overflow-hidden ring-1 ring-white/[.06] bg-panel" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.div key={g.序号} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .7, ease: [.2, .8, .2, 1] }}>
          <div className="absolute inset-0 bg-cover bg-center blur-2xl opacity-60 kenburns" style={{ backgroundImage: `url("${img}")` }} />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,#0a0c0f_0%,rgba(10,12,15,.9)_38%,rgba(10,12,15,.35)_70%,rgba(10,12,15,.7)_100%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#0a0c0f,transparent_45%)]" />
          <motion.div className="absolute right-[14%] top-1/2 w-[250px] h-[250px] -translate-y-1/2 rounded-[18px] overflow-hidden shadow-[0_30px_60px_-20px_rgba(0,0,0,.9)] ring-1 ring-white/10"
            initial={{ x: 60, rotate: 4, opacity: 0 }} animate={{ x: 0, rotate: -2, opacity: 1 }} transition={{ duration: .8, ease: [.2, .8, .2, 1], delay: .1 }}>
            <img src={img} onError={e => { (e.target as HTMLImageElement).src = g.thumb! }} className="w-full h-full object-cover" alt="" draggable={false} />
          </motion.div>
          <div className="absolute left-10 top-0 bottom-0 flex flex-col justify-center max-w-[48%]">
            <motion.div initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .15, duration: .5 }}
              className="flex items-center gap-2 text-[11px] tracking-[.25em] font-semibold text-sub">
              <span className="w-6 h-[3px] rounded-full bg-[linear-gradient(90deg,var(--color-jred)_50%,var(--color-jblue)_50%)]" />今日精选 · NO.{String(g.序号).padStart(4, '0')}
            </motion.div>
            <motion.h1 initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .22, duration: .55 }}
              className="font-cjk-display text-[44px] leading-[1.05] mt-3 text-white line-clamp-2">{g._name}</motion.h1>
            {gameEn(g) && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .32 }} className="text-sub text-sm mt-2 truncate">{gameEn(g)}</motion.div>}
            <motion.div initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: .36 }} className="flex flex-wrap items-center gap-2 mt-4">
              {g.critic && <><ScoreBadge s={g.critic.score} /><span className="text-[11px] text-sub mr-2 leading-tight">{g.critic.by}<br />{g.critic.platform}</span></>}
              {g.user && <span className="chip">👍 {g.user.pct}% · {g.user.desc}</span>}
              {g.year && <span className="chip font-mono">{g.year}</span>}
              {(g.genres || []).slice(0, 2).map(x => <span key={x} className="chip">{x}</span>)}
            </motion.div>
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .45 }} className="text-[13.5px] leading-relaxed text-fg/70 mt-4 line-clamp-3">{g.summary}</motion.p>
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .5 }} onClick={() => onOpen(g.序号)}
              className="mt-5 self-start h-10 px-5 rounded-full bg-white text-ink font-semibold text-sm flex items-center gap-2 hover:bg-jblue hover:text-ink active:scale-[.97] transition-all">
              查看详情 <Icon d={I.chev} size={16} />
            </motion.button>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="absolute right-6 bottom-5 flex items-center gap-2 z-10">
        <button className="w-8 h-8 grid place-items-center rounded-full bg-white/5 hover:bg-white/15 text-sub hover:text-white transition" onClick={() => setI(x => (x - 1 + items.length) % items.length)}><Icon d={I.chevL} size={16} /></button>
        {items.map((_, j) => (
          <button key={j} onClick={() => setI(j)} className={`relative h-1.5 rounded-full overflow-hidden transition-all duration-300 ${j === i ? 'w-10 bg-white/15' : 'w-3 bg-white/20 hover:bg-white/40'}`}>
            {j === i && <span key={i + String(paused)} className="absolute inset-0 origin-left bg-white" style={{ animation: paused ? 'none' : `progress ${DUR}ms linear both`, transform: paused ? 'scaleX(1)' : undefined }} />}
          </button>
        ))}
        <button className="w-8 h-8 grid place-items-center rounded-full bg-white/5 hover:bg-white/15 text-sub hover:text-white transition" onClick={() => setI(x => (x + 1) % items.length)}><Icon d={I.chev} size={16} /></button>
      </div>
    </section>
  )
}
