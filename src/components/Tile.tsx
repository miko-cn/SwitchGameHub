import { memo } from 'react'
import { Game, gameEn } from '../data'
import { Entry, STATUS } from '../store'
import { CoverImg } from './Cover'
import { ScoreBadge } from './bits'

function TileImpl({ g, e, onOpen, delay = 0 }: { g: Game; e?: Entry; onOpen: (id: number) => void; delay?: number }) {
  const st = e?.status ? STATUS.find(s => s.k === e.status) : null
  return (
    <div className="tile rise cursor-pointer" style={{ animationDelay: `${delay}ms` }} tabIndex={0} data-id={g.序号}
      onClick={() => onOpen(g.序号)} onKeyDown={ev => { if (ev.key === 'Enter') onOpen(g.序号) }}>
      <div className="cover joy-ring relative aspect-square rounded-[14px]">
        <div className="absolute inset-0 rounded-[14px] overflow-hidden bg-panel ring-1 ring-white/5">
          <CoverImg g={g} />
          <div className="absolute inset-x-0 top-0 h-14 bg-gradient-to-b from-black/55 to-transparent pointer-events-none" />
          {st && <span className="absolute left-2 top-2 chip !h-[1.3rem] !text-[11px] font-semibold !border-0 backdrop-blur-md" style={{ background: 'rgb(10 12 15 / .72)', color: st.color }}>
            <i className="w-1.5 h-1.5 rounded-full" style={{ background: st.color }} />{st.label}</span>}
          {e?.fav && <span className="absolute right-2 top-2 text-jred drop-shadow-[0_0_8px_rgba(255,75,62,.7)]" title="收藏">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-7.5-4.6-10-9.5C.4 8.3 2.3 4.5 6 4.1c2.2-.2 3.7 1 4.6 2.3.4.6 1.3.6 1.7 0 .9-1.3 2.4-2.5 4.6-2.3 3.7.4 5.6 4.2 4 7.4C19.5 16.4 12 21 12 21z" /></svg></span>}
          {g.critic && <div className="absolute left-2 bottom-2 flex items-center gap-1" title={`${g.critic.by} · ${g.critic.platform || '未注明平台'}`}><ScoreBadge s={g.critic.score} small />{g.critic.platform && !/switch/i.test(g.critic.platform) && <span className="chip !h-[18px] !px-1.5 !text-[9.5px] !border-0" style={{ background: 'rgb(10 12 15 / .72)' }}>{/steam|pc/i.test(g.critic.platform) ? 'PC' : '他平台'}</span>}</div>}
          {e?.rating ? <span className="absolute right-2 bottom-2 chip !h-[1.3rem] !border-0 font-mono !text-[11px] backdrop-blur-md" style={{ background: 'rgb(10 12 15 / .72)', color: 'var(--color-sun)' }}>★ {e.rating}</span> : null}
          <div className="reveal absolute inset-x-0 bottom-0 p-2.5 pt-10 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
            <div className="flex flex-wrap gap-1 pl-10">
              {g.user && <span className="chip !h-5 !text-[10.5px]">👍 {g.user.pct}%</span>}
              {g.year && <span className="chip !h-5 !text-[10.5px] font-mono">{g.year}</span>}
              {g.confidence === 'low' && <span className="chip !h-5 !text-[10.5px] conf-low">需核对</span>}
              {g.confidence === 'none' && <span className="chip !h-5 !text-[10.5px]">暂无资料</span>}
              {g.语言标注 && <span className="chip !h-5 !text-[10.5px]">{g.语言标注}</span>}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-2.5 px-0.5">
        <div className="text-[13.5px] font-medium leading-tight truncate text-fg/95">{g._name}</div>
        <div className="text-[11px] leading-tight truncate text-dim mt-1">{gameEn(g) || <span className="font-mono">#{g.序号}</span>}</div>
      </div>
    </div>
  )
}
export const Tile = memo(TileImpl, (a, b) => a.g === b.g && a.e === b.e && a.onOpen === b.onOpen && a.delay === b.delay)
