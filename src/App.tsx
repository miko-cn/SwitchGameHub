import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Game, hasData, loadGames } from './data'
import { STATUS, Status, allTags, initStore, useUserdata } from './store'
import { initCovers } from './covers'
import { Grid } from './components/Grid'
import { Hero } from './components/Hero'
import { Detail } from './components/Detail'
import { DataDialog } from './components/DataDialog'
import { Tile } from './components/Tile'
import { Icon, I } from './components/bits'

type View = { k: 'all' } | { k: 'fav' } | { k: 'status'; s: Exclude<Status, ''> } | { k: 'marked' } | { k: 'top' } | { k: 'check' } | { k: 'nodata' } | { k: 'genre'; v: string } | { k: 'tag'; v: string }
const vKey = (v: View) => JSON.stringify(v)
const SORTS: [string, string][] = [['idx', '清单顺序'], ['score', '媒体评分'], ['user', '玩家好评率'], ['mine', '我的评分'], ['recent', '最近标记'], ['year', '发售年份'], ['name', '名称']]
interface F { lang: string; conf: string; has: string; y1: string; y2: string; smin: string; mine: string }
const F0: F = { lang: '', conf: '', has: '', y1: '', y2: '', smin: '', mine: '' }

function dayShuffle<T>(a: T[]): T[] { const d = new Date(); let s = d.getFullYear() * 400 + d.getMonth() * 32 + d.getDate(); const r = () => (s = (s * 9301 + 49297) % 233280) / 233280; return a.map(x => [r(), x] as const).sort((p, q) => p[0] - q[0]).map(x => x[1]) }

export default function App() {
  const [games, setGames] = useState<Game[] | null>(null)
  const [err, setErr] = useState('')
  const ud = useUserdata()
  const [view, setView] = useState<View>({ k: 'all' })
  const [q, setQ] = useState(''); const dq = useDeferredValue(q)
  const dud = useDeferredValue(ud)
  const [sort, setSort] = useState('idx')
  const [f, setF] = useState<F>(F0)
  const [showF, setShowF] = useState(false)
  const [dense, setDense] = useState(() => localStorage.getItem('density') === 'dense')
  const [openId, setOpenId] = useState<number | null>(null)
  const [dataOpen, setDataOpen] = useState(false)
  const [toastMsg, setToast] = useState<{ t: string; k: number } | null>(null)
  const [genresMore, setGenresMore] = useState(false)
  const scroll = useRef<HTMLDivElement>(null)
  const search = useRef<HTMLInputElement>(null)
  const toast = useCallback((t: string) => setToast({ t, k: Date.now() }), [])

  useEffect(() => { Promise.all([loadGames(), initStore(), initCovers()]).then(([g]) => setGames(g)).catch(e => setErr(String(e))) }, [])
  useEffect(() => { if (!toastMsg) return; const t = setTimeout(() => setToast(null), 3200); return () => clearTimeout(t) }, [toastMsg])
  useEffect(() => { localStorage.setItem('density', dense ? 'dense' : '') }, [dense])
  useEffect(() => {
    const k = (e: KeyboardEvent) => { const t = e.target as HTMLElement; if ((e.key === '/' || (e.key === 'k' && (e.ctrlKey || e.metaKey))) && t.tagName !== 'INPUT' && t.tagName !== 'TEXTAREA') { e.preventDefault(); search.current?.focus() } }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [])
  // deep link for screenshots/tests: #open=123
  useEffect(() => { if (!games) return; const h = () => { if (location.hash.startsWith('#open=')) setOpenId(parseInt(location.hash.slice(6), 10)) }; h(); window.addEventListener('hashchange', h); return () => window.removeEventListener('hashchange', h) }, [games])

  const byId = useMemo(() => new Map((games || []).map(g => [g.序号, g])), [games])
  const genres = useMemo(() => { const m = new Map<string, number>(); games?.forEach(g => g.genres?.forEach(x => { if (x === '独立游戏') return; m.set(x, (m.get(x) || 0) + 1) })); return [...m.entries()].filter(x => x[1] >= 8).sort((a, b) => b[1] - a[1]) }, [games])
  const langs = useMemo(() => [...new Set((games || []).map(g => g.语言标注).filter(Boolean))], [games])
  const tags = useMemo(() => allTags(), [ud])
  const counts = useMemo(() => {
    const c: Record<string, number> = { fav: 0, marked: 0 }; STATUS.forEach(s => c[s.k] = 0)
    Object.values(ud.entries).forEach(e => { if (e.fav) c.fav++; if (e.status) c[e.status]++; c.marked++ }); return c
  }, [ud])

  const list = useMemo(() => {
    if (!games) return []
    const words = dq.trim().toLowerCase().split(/\s+/).filter(Boolean)
    const y1 = +f.y1 || 0, y2 = +f.y2 || 9999, sm = +f.smin || 0, mm = +f.mine || 0
    const E = dud.entries
    const out = games.filter(g => {
      const e = E[String(g.序号)]
      switch (view.k) {
        case 'fav': if (!e?.fav) return false; break
        case 'status': if (e?.status !== view.s) return false; break
        case 'marked': if (!e) return false; break
        case 'top': if (!(g.critic && g.critic.score >= 85)) return false; break
        case 'check': if (!(g.confidence === 'low' || g.confidence === 'medium')) return false; break
        case 'nodata': if (hasData(g)) return false; break
        case 'genre': if (!g.genres?.includes(view.v)) return false; break
        case 'tag': if (!e?.tags?.includes(view.v)) return false; break
      }
      if (words.length && !words.every(w => g._hay!.includes(w) || (e?.note || '').toLowerCase().includes(w) || (e?.tags || []).some(t => t.toLowerCase().includes(w)))) return false
      if (f.lang && (f.lang === '__none' ? g.语言标注 : g.语言标注 !== f.lang)) return false
      if (f.conf && g.confidence !== f.conf) return false
      if (f.has === 'score' && !g.critic || f.has === 'user' && !g.user || f.has === 'cover' && !g.thumb || f.has === 'summary' && !g.summary || f.has === 'nocover' && g.thumb) return false
      if ((f.y1 || f.y2) && (!g.year || g.year < y1 || g.year > y2)) return false
      if (sm && !(g.critic && g.critic.score >= sm)) return false
      if (mm && !((e?.rating || 0) >= mm)) return false
      return true
    })
    const sc = (g: Game) => g.critic ? g.critic.score : -1, us = (g: Game) => g.user ? g.user.pct : -1
    const mine = (g: Game) => E[String(g.序号)]?.rating || 0, upd = (g: Game) => E[String(g.序号)]?.updated || 0
    const cmp: Record<string, (a: Game, b: Game) => number> = {
      idx: (a, b) => a.序号 - b.序号, score: (a, b) => sc(b) - sc(a) || us(b) - us(a), user: (a, b) => us(b) - us(a) || (b.user?.total || 0) - (a.user?.total || 0),
      mine: (a, b) => mine(b) - mine(a) || sc(b) - sc(a), recent: (a, b) => upd(b) - upd(a) || a.序号 - b.序号, year: (a, b) => (b.year || 0) - (a.year || 0), name: (a, b) => a._name!.localeCompare(b._name!, 'zh-CN'),
    }
    return out.sort(cmp[sort])
  }, [games, view, dq, f, sort, dud])

  const listKey = vKey(view) + dq + JSON.stringify(f) + sort
  useEffect(() => { scroll.current?.scrollTo({ top: 0 }) }, [listKey])
  const heroItems = useMemo(() => games ? dayShuffle(games.filter(g => g.thumb && g.summary && g.summary_lang !== 'en' && g.confidence === 'high' && ((g.critic?.score || 0) >= 82 || (g.user?.pct || 0) >= 92))).slice(0, 6) : [], [games])
  const playing = useMemo(() => games ? games.filter(g => ud.entries[String(g.序号)]?.status === 'playing').sort((a, b) => (ud.entries[String(b.序号)]?.updated || 0) - (ud.entries[String(a.序号)]?.updated || 0)) : [], [games, ud])
  const step = useCallback((d: number) => setOpenId(id => { if (id == null || !list.length) return id; const i = list.findIndex(g => g.序号 === id); return list[(i + d + list.length) % list.length].序号 }), [list])
  const openRandom = () => { if (list.length) setOpenId(list[Math.floor(Math.random() * list.length)].序号) }
  const nf = Object.values(f).filter(Boolean).length
  const home = view.k === 'all' && !dq && !nf

  const title = view.k === 'all' ? '全部游戏' : view.k === 'fav' ? '收藏' : view.k === 'status' ? STATUS.find(s => s.k === view.s)!.label : view.k === 'marked' ? '我标记过的' : view.k === 'top' ? '高分佳作' : view.k === 'check' ? '待核对' : view.k === 'nodata' ? '暂无资料' : view.k === 'genre' ? view.v : '#' + view.v
  const stat = useMemo(() => games ? { all: games.length, data: games.filter(hasData).length, score: games.filter(g => g.critic).length, cover: games.filter(g => g.thumb).length } : null, [games])

  if (err) return <div className="p-10 text-jred">资料加载失败：{err}</div>
  return (
    <div className="atmos grain h-full flex">
      {/* sidebar */}
      <aside className="relative z-10 w-[232px] shrink-0 h-full flex flex-col bg-ink2/80 border-r border-white/[.05]">
        <div className="px-5 pt-6 pb-5 flex items-center gap-3">
          <div className="flex gap-[3px]"><span className="w-[13px] h-[30px] rounded-l-[8px] rounded-r-[3px] bg-jred shadow-[0_0_14px_rgba(255,75,62,.45)]" /><span className="w-[13px] h-[30px] rounded-r-[8px] rounded-l-[3px] bg-jblue shadow-[0_0_14px_rgba(24,192,240,.45)]" /></div>
          <div><div className="font-cjk-display text-[19px] leading-none">Switch 游戏库</div><div className="text-[10px] tracking-[.3em] text-dim mt-1.5 font-mono">{stat ? `${stat.all} TITLES` : 'LOADING'}</div></div>
        </div>
        <nav className="scroll flex-1 overflow-y-auto px-3 pb-4 text-[13.5px]">
          <Group t="游戏库" />
          <Nav on={view.k === 'all'} onClick={() => setView({ k: 'all' })} icon={I.grid} n={stat?.all}>全部游戏</Nav>
          <Nav on={view.k === 'fav'} onClick={() => setView({ k: 'fav' })} icon={I.heart} n={counts.fav} dot="var(--color-jred)">收藏</Nav>
          {STATUS.map(s => <Nav key={s.k} on={view.k === 'status' && view.s === s.k} onClick={() => setView({ k: 'status', s: s.k })} n={counts[s.k]} dot={s.color}>{s.label}</Nav>)}
          <Group t="发现" />
          <Nav on={view.k === 'top'} onClick={() => setView({ k: 'top' })} icon={I.star}>高分佳作 <span className="text-dim text-[11px]">85+</span></Nav>
          <Nav on={view.k === 'check'} onClick={() => setView({ k: 'check' })} icon={I.warn}>待核对资料</Nav>
          <Nav on={view.k === 'nodata'} onClick={() => setView({ k: 'nodata' })} icon={I.data} n={stat ? stat.all - stat.data : 0}>暂无资料</Nav>
          {tags.length > 0 && <><Group t="我的标签" />{tags.slice(0, 14).map(([t, n]) => <Nav key={t} on={view.k === 'tag' && view.v === t} onClick={() => setView({ k: 'tag', v: t })} icon={I.tag} n={n}>{t}</Nav>)}</>}
          <Group t="类型" />
          {(genresMore ? genres : genres.slice(0, 10)).map(([gname, n]) => <Nav key={gname} on={view.k === 'genre' && view.v === gname} onClick={() => setView({ k: 'genre', v: gname })} n={n} small>{gname}</Nav>)}
          {genres.length > 10 && <button onClick={() => setGenresMore(x => !x)} className="ml-3 mt-1 text-[12px] text-dim hover:text-fg">{genresMore ? '收起' : `更多类型（${genres.length - 10}）`}</button>}
        </nav>
        <div className="p-3 border-t border-white/[.05]">
          <button onClick={() => setDataOpen(true)} className="w-full h-10 rounded-xl flex items-center gap-2.5 px-3 text-[13px] text-sub hover:text-fg hover:bg-white/[.05] transition">
            <Icon d={I.data} size={16} />数据与备份<span className="ml-auto font-mono text-[11px] text-dim">{counts.marked}</span></button>
        </div>
      </aside>

      {/* main */}
      <div ref={scroll} data-main className="scroll relative z-10 flex-1 h-full overflow-y-auto">
        <div className="px-8 pb-16 max-w-[1680px] mx-auto">
          <header className="sticky top-0 z-20 -mx-8 px-8 pt-5 pb-4 bg-[linear-gradient(180deg,#0a0c0f_70%,rgba(10,12,15,0))]">
            <div className="flex items-center gap-3">
              <div className="relative flex-1 max-w-[520px]">
                <Icon d={I.search} size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim" />
                <input ref={search} value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Escape') { setQ(''); (e.target as HTMLInputElement).blur() } }}
                  placeholder="搜索游戏名、英文名、开发商、标签、笔记…" className="w-full h-10 pl-10 pr-12 rounded-full bg-panel ring-1 ring-white/[.07] focus:ring-2 focus:ring-jblue/60 outline-none text-[13.5px] placeholder:text-dim transition" />
                {q ? <button onClick={() => setQ('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-dim hover:text-fg"><Icon d={I.x} size={15} /></button> : <span className="kbd absolute right-3.5 top-1/2 -translate-y-1/2">/</span>}
              </div>
              <button onClick={() => setShowF(x => !x)} className={`h-10 px-4 rounded-full flex items-center gap-2 text-[13px] ring-1 transition ${showF || nf ? 'bg-white text-ink ring-white' : 'bg-panel ring-white/[.07] text-sub hover:text-fg'}`}>
                <Icon d={I.filter} size={15} />筛选{nf ? <span className="w-5 h-5 rounded-full bg-jred text-white text-[11px] grid place-items-center">{nf}</span> : null}</button>
              <div className="relative">
                <select value={sort} onChange={e => setSort(e.target.value)} className="appearance-none h-10 pl-9 pr-4 rounded-full bg-panel ring-1 ring-white/[.07] text-[13px] text-sub hover:text-fg outline-none cursor-pointer">
                  {SORTS.map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                <Icon d={I.sort} size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dim pointer-events-none" />
              </div>
              <div className="ml-auto flex items-center gap-2">
                <button title="随便来一个" onClick={openRandom} className="h-10 w-10 grid place-items-center rounded-full bg-panel ring-1 ring-white/[.07] text-sub hover:text-jblue hover:rotate-12 transition"><Icon d={I.shuffle} size={16} /></button>
                <div className="h-10 p-1 rounded-full bg-panel ring-1 ring-white/[.07] flex">
                  {[[false, '大'], [true, '小']].map(([d, l]) => <button key={String(d)} onClick={() => setDense(d as boolean)} className={`relative w-9 rounded-full text-[12px] ${dense === d ? 'text-ink' : 'text-sub'}`}>
                    {dense === d && <motion.span layoutId="dens" className="absolute inset-0 rounded-full bg-white" transition={{ type: 'spring', stiffness: 500, damping: 35 }} />}<span className="relative">{l as string}</span></button>)}
                </div>
              </div>
            </div>
            <AnimatePresence initial={false}>
              {showF && <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .25, ease: [.2, .8, .2, 1] }} className="overflow-hidden">
                <div className="flex flex-wrap items-end gap-3 pt-4">
                  <Sel l="语言标注" v={f.lang} set={v => setF({ ...f, lang: v })} o={[['', '全部'], ['__none', '无标注'], ...langs.map(x => [x, x] as [string, string])]} />
                  <Sel l="资料匹配度" v={f.conf} set={v => setF({ ...f, conf: v })} o={[['', '全部'], ['high', '高'], ['medium', '中'], ['low', '低'], ['none', '未匹配']]} />
                  <Sel l="包含" v={f.has} set={v => setF({ ...f, has: v })} o={[['', '不限'], ['score', '有媒体评分'], ['user', '有玩家评价'], ['cover', '有封面'], ['nocover', '无封面'], ['summary', '有简介']]} />
                  <Num l="年份从" v={f.y1} set={v => setF({ ...f, y1: v })} ph="2017" /><Num l="到" v={f.y2} set={v => setF({ ...f, y2: v })} ph="2026" />
                  <Num l="媒体评分 ≥" v={f.smin} set={v => setF({ ...f, smin: v })} ph="80" />
                  <Num l="我的评分 ≥" v={f.mine} set={v => setF({ ...f, mine: v })} ph="7" />
                  {nf > 0 && <button onClick={() => setF(F0)} className="h-9 px-3 text-[12.5px] text-jred hover:underline">清空筛选</button>}
                </div>
              </motion.div>}
            </AnimatePresence>
          </header>

          {!games ? <Loading /> : <>
            {home && <div className="mb-8 rise"><Hero items={heroItems} onOpen={setOpenId} /></div>}
            {home && playing.length > 0 && <section className="mb-9 rise" style={{ animationDelay: '80ms' }}>
              <H t="继续游玩" sub={`${playing.length} 个在玩`} />
              <div className="grid gap-5" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(150px,1fr))' }}>{playing.slice(0, 8).map(g => <Tile key={g.序号} g={g} e={ud.entries[String(g.序号)]} onOpen={setOpenId} />)}</div>
            </section>}
            {home && stat && <div className="flex flex-wrap gap-x-8 gap-y-2 mb-7 text-[12px] text-sub rise" style={{ animationDelay: '120ms' }}>
              {[['已匹配资料', stat.data], ['媒体评分', stat.score], ['封面', stat.cover], ['我的记录', counts.marked]].map(([k, v]) => <div key={k as string}><b className="font-display text-[20px] text-fg mr-1.5 tabular-nums">{v}</b>{k}</div>)}
            </div>}
            <H t={title} sub={`${list.length} 个游戏`} />
            {list.length ? <Grid list={list} ud={ud} scrollRef={scroll} onOpen={setOpenId} minW={dense ? 138 : 182} listKey={listKey} />
              : <div className="py-24 text-center text-sub"><div className="font-cjk-display text-3xl text-dim mb-2">空空如也</div>{view.k === 'all' ? '换个关键词或者清空筛选试试' : '这里还没有游戏。打开任意游戏，在右侧「我的记录」里标记吧。'}</div>}
          </>}
        </div>
      </div>

      <AnimatePresence>{openId != null && byId.get(openId) && <Detail key="d" g={byId.get(openId)!} onClose={() => setOpenId(null)} onStep={step} />}</AnimatePresence>
      <AnimatePresence>{dataOpen && games && <DataDialog games={games} onClose={() => setDataOpen(false)} toast={toast} />}</AnimatePresence>
      <AnimatePresence>{toastMsg && <motion.div key={toastMsg.k} initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[70] px-5 py-3 rounded-full bg-white text-ink text-[13px] font-medium shadow-2xl max-w-[80vw] truncate">{toastMsg.t}</motion.div>}</AnimatePresence>
    </div>
  )
}

const Group = ({ t }: { t: string }) => <div className="text-[10.5px] tracking-[.24em] text-dim font-semibold px-3 mt-5 mb-1.5">{t}</div>
function Nav({ on, onClick, icon, n, dot, small, children }: { on: boolean; onClick: () => void; icon?: string; n?: number; dot?: string; small?: boolean; children: React.ReactNode }) {
  return <button onClick={onClick} className={`relative w-full flex items-center gap-2.5 px-3 ${small ? 'h-8 text-[12.5px]' : 'h-9'} rounded-[10px] transition-colors ${on ? 'text-white' : 'text-sub hover:text-fg hover:bg-white/[.04]'}`}>
    {on && <motion.span layoutId="nav-on" className="absolute inset-0 rounded-[10px] bg-white/[.08] ring-1 ring-white/[.08]" transition={{ type: 'spring', stiffness: 500, damping: 38 }}>
      <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[linear-gradient(180deg,var(--color-jred)_50%,var(--color-jblue)_50%)]" /></motion.span>}
    <span className="relative w-4 grid place-items-center">{icon ? <Icon d={icon} size={15} /> : dot ? <i className="w-2 h-2 rounded-full" style={{ background: dot }} /> : <i className="w-1 h-1 rounded-full bg-white/25" />}</span>
    <span className="relative truncate text-left flex-1">{children}</span>
    {n ? <span className="relative font-mono text-[11px] text-dim">{n}</span> : null}
  </button>
}
const H = ({ t, sub }: { t: string; sub?: string }) => <div className="flex items-baseline gap-3 mb-5"><h2 className="font-cjk-display text-[26px] leading-none">{t}</h2>{sub && <span className="text-[12px] text-dim font-mono">{sub}</span>}</div>
function Sel({ l, v, set, o }: { l: string; v: string; set: (v: string) => void; o: [string, string][] }) {
  return <label className="flex flex-col gap-1.5 text-[11px] text-dim">{l}<select value={v} onChange={e => set(e.target.value)} className="h-9 px-3 rounded-lg bg-panel ring-1 ring-white/[.07] text-[13px] text-fg outline-none min-w-[120px]">{o.map(([k, t]) => <option key={k} value={k}>{t}</option>)}</select></label>
}
function Num({ l, v, set, ph }: { l: string; v: string; set: (v: string) => void; ph: string }) {
  return <label className="flex flex-col gap-1.5 text-[11px] text-dim">{l}<input value={v} onChange={e => set(e.target.value.replace(/\D/g, ''))} placeholder={ph} className="h-9 w-24 px-3 rounded-lg bg-panel ring-1 ring-white/[.07] text-[13px] text-fg outline-none focus:ring-jblue/60 placeholder:text-dim/60" /></label>
}
function Loading() {
  return <div className="grid gap-[22px]" style={{ gridTemplateColumns: 'repeat(auto-fill,minmax(182px,1fr))' }}>{Array.from({ length: 18 }, (_, i) => <div key={i}><div className="aspect-square rounded-[14px] skeleton" /><div className="h-3 w-3/4 mt-3 rounded skeleton" /></div>)}</div>
}
