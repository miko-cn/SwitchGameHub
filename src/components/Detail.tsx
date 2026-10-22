import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Gallery, Lightbox, shotSource } from './Gallery'
import { CONF_LABEL, Conf, Game, SRC_NAME, confOf, gameEn, hostOf } from '../data'
import { STATUS, allTags, update, useUserdata, flush } from '../store'
import type { PriceOverride } from '../userdata'
import { CoverImg } from './Cover'
import { Ext, Icon, I, ScoreBadge, SrcTag, scoreColor } from './bits'
import { fullCover, resolveShots } from '../covers'

export function Detail({ g, onClose, onStep }: { g: Game; onClose: () => void; onStep: (d: number) => void }) {
  const sheet = useRef<HTMLDivElement>(null)
  const [lb, setLb] = useState<number | null>(null)
  const shots = useMemo(() => resolveShots(g.screenshots || []), [g])
  useEffect(() => { sheet.current?.scrollTo({ top: 0 }); const m = /[&?]shot=(\d+)/.exec(location.hash); setLb(m && shots[+m[1]] ? +m[1] : null) }, [g.序号]) // eslint-disable-line
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement; if (t.tagName === 'TEXTAREA' || t.tagName === 'INPUT') { if (e.key === 'Escape') t.blur(); return }
      if (lb !== null) {
        if (e.key === 'Escape') { setLb(null); return }
        if (e.key === 'ArrowRight') { setLb(i => (i === null ? 0 : (i + 1) % shots.length)); return }
        if (e.key === 'ArrowLeft') { setLb(i => (i === null ? 0 : (i - 1 + shots.length) % shots.length)); return }
        return
      }
      if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') onStep(1); if (e.key === 'ArrowLeft') onStep(-1)
    }
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k)
  }, [onClose, onStep, lb, shots.length])
  const s = g.sources || {}
  const img = fullCover(g) || g.thumb
  const uncertain = !!g.match_uncertain || g.confidence === 'low'
  const confWarn = g.confidence === 'none' && !g.summary
    ? { c: 'conf-none', t: '暂未找到可靠的公开资料。这里只显示你原始清单里的信息。' }
    : uncertain
      ? { c: 'conf-low', t: '匹配可能有误差：以下资料由双向译名检索补全，可能对不上这款游戏，请核对。' }
      : g.confidence === 'medium'
        ? { c: 'conf-medium', t: '中等匹配度：名称相近但不完全一致，建议核对。' }
        : null

  return (
    <motion.div className="fixed inset-0 z-40 flex items-center justify-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .2 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div ref={sheet} className="scroll relative w-full max-w-[1120px] max-h-full overflow-y-auto rounded-[22px] bg-ink2 ring-1 ring-white/[.08] shadow-[0_40px_120px_-20px_rgba(0,0,0,.9)]"
        initial={{ y: 30, scale: .975, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: 20, scale: .98, opacity: 0 }} transition={{ type: 'spring', stiffness: 380, damping: 34 }}>
        {/* header */}
        <div className="relative h-[300px] overflow-hidden">
          {img ? <div className="absolute inset-0 bg-cover bg-center scale-125 blur-3xl opacity-55" style={{ backgroundImage: `url("${img}")` }} />
            : <div className="absolute inset-0 bg-[radial-gradient(80%_120%_at_0%_0%,rgba(255,75,62,.18),transparent_60%),radial-gradient(80%_120%_at_100%_0%,rgba(24,192,240,.16),transparent_60%)]" />}
          <div className="absolute inset-0 bg-[linear-gradient(0deg,#0f1216_0%,rgba(15,18,22,.55)_55%,rgba(15,18,22,.2)_100%)]" />
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            <button title="上一个 (←)" onClick={() => onStep(-1)} className="w-9 h-9 grid place-items-center rounded-full bg-black/40 hover:bg-white/15 backdrop-blur transition"><Icon d={I.chevL} size={16} /></button>
            <button title="下一个 (→)" onClick={() => onStep(1)} className="w-9 h-9 grid place-items-center rounded-full bg-black/40 hover:bg-white/15 backdrop-blur transition"><Icon d={I.chev} size={16} /></button>
            <button title="关闭 (Esc)" onClick={onClose} className="w-9 h-9 grid place-items-center rounded-full bg-black/40 hover:bg-jred backdrop-blur transition"><Icon d={I.x} size={16} /></button>
          </div>
          <div className="absolute left-8 bottom-6 right-8 flex items-end gap-7">
            <motion.div key={g.序号} initial={{ y: 20, opacity: 0, rotate: -3 }} animate={{ y: 0, opacity: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 24 }}
              className="relative shrink-0 w-[210px] h-[210px] rounded-[18px] overflow-hidden ring-1 ring-white/10 shadow-[0_24px_50px_-16px_rgba(0,0,0,.9)] bg-panel">
              <CoverImg key={g.序号} g={g} full />
            </motion.div>
            <div className="min-w-0 pb-1">
              <div className="font-mono text-[11px] tracking-widest text-sub">NO.{String(g.序号).padStart(4, '0')}{g.语言标注 && <span className="chip ml-2 !font-sans">{g.语言标注}</span>}</div>
              <h2 className="font-cjk-display text-[38px] leading-[1.08] mt-2 text-white">{g._name}</h2>
              {gameEn(g) && <div className="text-sub mt-1.5 text-[15px]">{gameEn(g)}<SrcTag url={s.title_en} conf={confOf(s.title_en, g)} /></div>}
              <div className="flex flex-wrap gap-1.5 mt-3">
                {uncertain && <span className="chip chip-warn font-sans">数据可能有误差</span>}
                {g.year && <span className="chip font-mono">{g.release_date || g.year}{g.year_is_switch ? ' · Switch 版发售' : ' · 非 Switch 版或未注明平台'}</span>}
                {(g.genres || []).map(x => <span key={x} className="chip">{x}</span>)}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-[minmax(0,1fr)_330px] gap-8 px-8 pb-10 pt-4">
          <div className="min-w-0">
            {confWarn && <div className={`flex gap-2.5 items-start text-[13px] rounded-xl px-4 py-3 mb-5 bg-white/[.03] ring-1 ring-current/20 ${confWarn.c}`}>
              <Icon d={I.warn} size={16} className="mt-0.5 shrink-0" /><div>{confWarn.t}{g.match_note && <div className="text-sub mt-1">{g.match_note}</div>}</div></div>}

            {(g.critic || g.critic_alt || g.user) && <div className="grid grid-cols-3 gap-3 mb-6">
              {[g.critic, g.critic_alt].filter(Boolean).map((c, i) => c && (
                <div key={i} className="rounded-2xl bg-panel ring-1 ring-white/[.05] p-4">
                  <div className="font-display text-[34px] font-bold leading-none tabular-nums" style={{ color: scoreColor(c.score) }}>{Math.round(c.score)}<span className="text-sm text-dim font-medium">/100</span></div>
                  <div className="text-[12.5px] mt-2 text-fg/85">{c.by}</div>
                  <div className="text-[11px] text-dim mt-0.5">{c.platform || '未注明平台'}</div>
                  <div className="mt-2"><SrcTag url={c.src} conf={confOf(c.src, g)} /></div>
                </div>))}
              {g.user && <div className="rounded-2xl bg-panel ring-1 ring-white/[.05] p-4">
                <div className="font-display text-[34px] font-bold leading-none tabular-nums" style={{ color: scoreColor(g.user.pct) }}>{g.user.pct}<span className="text-sm text-dim font-medium">% 好评</span></div>
                <div className="text-[12.5px] mt-2 text-fg/85">{g.user.desc} · {g.user.total.toLocaleString()} 条</div>
                <div className="text-[11px] text-dim mt-0.5">{g.user.by} · {g.user.platform}</div>
                <div className="mt-2"><SrcTag url={g.user.src} conf={confOf(g.user.src, g)} /></div>
              </div>}
            </div>}

{shots.length > 0 && <Section title={`截图 · ${shots.length} 张`}>
              <Gallery shots={shots} onExpand={setLb} />
              <p className="text-[11.5px] text-sub mt-1.5">左右切换浏览 · 点「全屏」放大 · 来源：{[...new Set(shots.map(x => shotSource(x.by)))].join('、')}</p>
            </Section>}

            <Section title="简介">
              {g.summary ? <>
                <p className="text-[14.5px] leading-[1.85] text-fg/85 whitespace-pre-line select-text">{g.summary}</p>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-dim flex-wrap">
                  {uncertain && <span className="chip chip-warn font-sans">匹配可能有误差</span>}
                  {g.summary_lang === 'en' && <span className="chip">英文原文</span>}
                  {g.summary_lang === 'zh-tr' && <span className="chip">译自英文来源</span>}
                  {g.summary_lang === 'zh-core' && <span className="chip">核心玩法说明</span>}
                  <SrcTag url={g.summary_src || s.summary} conf={confOf(g.summary_src || s.summary, g)} />
                </div>
                {g.summary_note && <p className="text-[11px] text-sub mt-1 font-sans">{g.summary_note}</p>}
                {g.summary_en && <details className="mt-3 group"><summary className="text-[12px] text-sub cursor-pointer hover:text-fg">查看英文原文</summary><p className="text-[13px] leading-relaxed text-fg/70 mt-2 select-text">{g.summary_en}</p></details>}
              </> : <div>
                <p className="text-sub text-sm font-sans">暂无简介。{g.summary_note === '未找到公开简介' ? '公开来源未检索到可用介绍。' : (g.summary_note || '')}</p>
              </div>}
            </Section>

            

            

{(g.developers?.length || g.publishers?.length) ? <Section title="制作信息">
              <KV k="开发商" v={g.developers?.join('、')} u={s.developers} g={g} />
              <KV k="发行商" v={g.publishers?.join('、')} u={s.publishers} g={g} />
              {g.year && <KV k="发售" v={`${g.release_date || g.year}${g.year_is_switch ? '（Switch 版）' : '（非 Switch 版或未注明平台）'}`} u={s.year} g={g} />}
              {g.genres?.length ? <KV k="类型" v={g.genres.join('、')} u={s.genres} g={g} /> : null}
            </Section> : null}

            {g.links?.length ? <Section title="外部页面">
              <div className="flex flex-wrap gap-2">{g.links.map(l => (
                <Ext key={l.url} href={l.url} className="!no-underline"><span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-white/[.05] hover:bg-white/[.1] ring-1 ring-white/[.06] text-[12.5px] transition">{l.name}<Icon d={I.link} size={13} /></span></Ext>))}</div>
            </Section> : null}

            <Section title="资料来源与匹配度">
              <KV k="原始名称" v={`#${g.序号} ${g.原始名称}`} />
              {g.备注 && <KV k="备注" v={g.备注} />}
              <KV k="整体匹配度" v={<span className={`conf-${g.confidence}`}>{CONF_LABEL[g.confidence]}{g.match_uncertain ? ' · 可能有误差' : ''}</span>} />
              {g.source_conf && Object.keys(g.source_conf).length > 0 && <div className="flex gap-3 py-2 text-[13px] border-t border-white/[.05]"><span className="w-24 shrink-0 text-dim">各来源</span>
                <div className="flex flex-wrap gap-1.5">{Object.entries(g.source_conf).map(([k, v]) => <span key={k} className={`chip conf-${v}`}>{SRC_NAME[k] || k} · {CONF_LABEL[v] || v}</span>)}</div></div>}
              {g.cover_src && <KV k="封面" v={hostOf(g.cover_src)} u={g.cover_src} g={g} />}
            </Section>
          </div>
          <div className="self-start flex flex-col gap-4 min-w-0">
            <PricePanel g={g} />
            <MyPanel g={g} />
          </div>
        </div>
      </motion.div>
      <AnimatePresence>{lb !== null && shots[lb] && <Lightbox shots={shots} index={lb} onClose={() => setLb(null)} onStep={d => setLb(i => (i === null ? 0 : (i + d + shots.length) % shots.length))} />}</AnimatePresence>
    </motion.div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mb-7"><h3 className="text-[11px] font-semibold tracking-[.22em] text-dim mb-3 flex items-center gap-2"><span className="w-3 h-[2px] bg-white/20" />{title}</h3>{children}</section>
}

const CUR: Record<string, string> = { HKD: 'HK$', USD: 'US$', EUR: '€', JPY: 'JP¥', GBP: '£', CNY: '¥' }
const REG: Record<string, string> = { HK: '港服 eShop', JP: '日服 eShop', US: '美服 eShop', EU: '欧服 eShop', UK: '英服 eShop', Steam: 'Steam' }
const AREA: Record<string, string> = { HK: '港区', JP: '日区', US: '美区', EU: '欧区', UK: '英区' }
function money(amount: number, currency: string) {
  const sym = CUR[currency] || (currency + ' ')
  const n = currency === 'JPY' ? Math.round(amount).toLocaleString('zh-CN') : amount.toLocaleString('zh-CN', { minimumFractionDigits: amount % 1 ? 2 : 0, maximumFractionDigits: 2 })
  return `${sym}${n}`
}
const yuan = (n: number) => n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

function SrcLink({ href, label }: { href?: string; label: string }) {
  if (!href) return null
  return <Ext href={href} className="!no-underline"><span title={`来源：${label}\n${href}`} className="inline-flex items-center justify-center w-6 h-6 rounded-full text-dim hover:text-fg hover:bg-white/[.08] transition"><Icon d={I.link} size={12.5} /></span></Ext>
}

const PENCIL = 'M4 20h4L19 9l-4-4L4 16zM14 6l4 4'

function PricePanel({ g }: { g: Game }) {
  const ud = useUserdata()
  const e = ud.entries[String(g.序号)]
  const po = e?.price_override
  const [edit, setEdit] = useState(false)
  useEffect(() => setEdit(false), [g.序号])
  const prices = g.prices || []
  const cny = g.price_cny || null
  const lo = g.lowest || null
  const primary = (cny && prices.find(p => p.region === cny.from_region)) || prices[0]
  const free = !cny && prices.some(p => p.free)
  const launchOv = typeof po?.launch_cny === 'number'
  const lowOv = typeof po?.lowest_cny === 'number'
  const launch = launchOv ? po!.launch_cny! : cny?.amount
  const low = lowOv ? po!.lowest_cny! : lo?.cny
  const edited = launchOv || lowOv
  const hasAny = launch != null || low != null || free
  const steam = lo?.kind === 'steam' && !lowOv
  const pct = launch && low != null && low < launch ? Math.round((1 - low / launch) * 100) : undefined
  const area = lo ? (AREA[lo.region] || lo.region) : ''

  const launchTip = launchOv ? `手动更正${cny ? `\n目录值：¥${yuan(cny.amount)}` : ''}${po?.note ? `\n说明：${po.note}` : ''}`
    : cny ? (cny.from_currency === 'CNY' ? `${REG[cny.from_region] || cny.from_region} 人民币标价`
      : `原价 ${money(cny.from_amount, cny.from_currency)}（${REG[cny.from_region] || cny.from_region}）\n1 ${cny.from_currency} = ${cny.rate} CNY · ${cny.rate_date}\n汇率来源：ECB / frankfurter.app`) : ''
  const lowTip = lowOv ? `手动更正${lo?.cny != null ? `\n目录值：¥${yuan(lo.cny)}` : ''}${po?.note ? `\n说明：${po.note}` : ''}`
    : lo ? [steam ? 'PC 版 Steam 史低，仅作参考，不是 Switch 价格' : `Nintendo eShop ${area}史低`,
      `原币 ${money(lo.amount, lo.currency)}${lo.regular ? `（原价 ${money(lo.regular, lo.currency)}）` : ''}`,
      lo.rate ? `1 ${lo.currency} = ${lo.rate} CNY · ${lo.rate_date}` : '',
      lo.date ? `${lo.date_note || '日期'}：${lo.date}` : '',
      lo.history_from ? `价格记录始于 ${lo.history_from}` : '',
      `来源：${lo.src_name || hostOf(lo.src)}${lo.match ? ' · ' + lo.match : ''}`].filter(Boolean).join('\n') : ''

  return (
    <section className="rounded-2xl bg-panel ring-1 ring-white/[.06] p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,var(--color-teal),var(--color-jblue))]" />
      <div className="flex items-center justify-between gap-2">
        <h3 className="font-cjk-display text-lg">价格</h3>
        <div className="flex items-center gap-1.5">
          {edited && !edit && <span className="chip !h-6 !text-[11px] !bg-sun/10 !border-sun/30 text-sun">已手动更正</span>}
          <button onClick={() => setEdit(v => !v)} title={edit ? '取消' : '手动更正价格'}
            className={`w-7 h-7 grid place-items-center rounded-full ring-1 transition active:scale-95 ${edit ? 'ring-white/25 text-fg bg-white/[.06]' : 'ring-white/10 text-sub hover:text-fg hover:ring-white/25'}`}>
            <Icon d={edit ? I.x : PENCIL} size={13} />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {edit ? <PriceEdit key="edit" id={g.序号} po={po} catLaunch={cny?.amount} catLow={lo?.cny} onDone={() => setEdit(false)} />
          : <motion.div key="view" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}>
            {!hasAny && <p className="mt-4 text-[12.5px] text-dim">暂无可信的价格数据。可点右上角手动补充。</p>}

            {(launch != null || free) && <div className="price-row mt-4">
              <span className="price-label">发售价</span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1.5" title={launchTip}>
                  {free && launch == null ? <span className="price-num text-[26px] text-white">免费</span> : <>
                    <span className="price-num text-[26px] text-white"><span className="price-yen">¥</span>{yuan(launch!)}</span>
                  </>}
                </div>
                <div className="price-meta">
                  {launchOv ? <>手动更正{cny && <> · 目录 ¥{yuan(cny.amount)}</>}</>
                    : cny ? (cny.from_currency === 'CNY' ? <>{REG[cny.from_region] || cny.from_region} · 人民币标价</>
                      : <>约合 · {REG[cny.from_region] || cny.from_region}{primary?.tax_included ? '（含税）' : ''} · {cny.rate_date} 汇率<br />非国行官方定价</>) : '目录标价'}
                  {!launchOv && primary?.src && <SrcLink href={primary.src} label={`${REG[primary.region] || primary.region} 目录标价`} />}
                </div>
              </div>
            </div>}

            {low != null && <div className={`price-row ${launch != null || free ? 'mt-4 pt-4 border-t border-white/[.06]' : 'mt-4'}`}>
              <span className="price-label">史低</span>
              <div className="min-w-0">
                <div className="flex items-baseline gap-2" title={lowTip}>
                  <span className={`price-num text-[22px] ${steam ? 'text-sub' : 'text-teal'}`}><span className="price-yen">¥</span>{yuan(low)}</span>
                  {pct != null && pct > 0 && <motion.span initial={{ scale: .85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: .15, type: 'spring', stiffness: 380, damping: 22 }}
                    className={`chip !h-[22px] !text-[11px] font-semibold tabular-nums ${steam ? '' : '!bg-jred/12 !border-jred/30 text-[#ff8a80]'}`}>省 {pct}%</motion.span>}
                </div>
                <div className="flex flex-wrap items-center gap-1.5 mt-2">
                  {lowOv ? <span className="chip !h-[22px] !text-[10.5px] !bg-sun/10 !border-sun/30 text-sun">手动更正{lo?.cny != null ? ` · 目录 ¥${yuan(lo.cny)}` : ''}</span>
                    : steam ? <span title={'PC 版 Steam 价格（美区 USD），仅作参考，不代表 Switch 版价格。\n' + (lo?.note || '')} className="chip !h-[22px] !text-[10.5px] text-dim cursor-help">Steam 参考 · PC</span>
                      : lo && <span title={lowTip} className="chip !h-[22px] !text-[10.5px] text-sub cursor-help">eShop 史低 · {area}{lo.date ? ` · ${lo.date}` : ''}</span>}
                  {!lowOv && lo?.src && <SrcLink href={lo.src} label={`${lo.src_name || ''} 价格历史`} />}
                </div>
                {launch && low < launch && <div className="mt-3 h-[3px] rounded-full bg-white/[.06] overflow-hidden">
                  <motion.div className={`h-full rounded-full ${steam ? 'bg-white/25' : 'bg-gradient-to-r from-teal to-jblue'}`}
                    initial={{ width: '100%' }} animate={{ width: `${Math.max(4, (low / launch) * 100)}%` }} transition={{ duration: .7, delay: .1, ease: [.22, 1, .36, 1] }} />
                </div>}
              </div>
            </div>}

            {hasAny && low == null && <div className="price-row mt-4 pt-4 border-t border-white/[.06]">
              <span className="price-label">史低</span>
              <div className="min-w-0">
                <span className="text-[12px] text-dim">暂无史低</span>
                {g.lowest_missing?.label && <div className="price-meta mt-1">{g.lowest_missing.label}</div>}
              </div>
            </div>}
          </motion.div>}
      </AnimatePresence>
    </section>
  )
}

function PriceEdit({ id, po, catLaunch, catLow, onDone }: { id: number; po?: PriceOverride; catLaunch?: number; catLow?: number; onDone: () => void }) {
  const [a, setA] = useState(po?.launch_cny != null ? String(po.launch_cny) : '')
  const [b, setB] = useState(po?.lowest_cny != null ? String(po.lowest_cny) : '')
  const [n, setN] = useState(po?.note || '')
  const num = (v: string) => { const x = parseFloat(v.replace(/[¥,\s]/g, '')); return Number.isFinite(x) && x >= 0 ? Math.round(x * 100) / 100 : undefined }
  const save = () => {
    const out: PriceOverride = { updated: Date.now() }
    const la = num(a), lb = num(b)
    if (la != null) out.launch_cny = la
    if (lb != null) out.lowest_cny = lb
    if (n.trim()) out.note = n.trim()
    update(id, { price_override: (la != null || lb != null || n.trim()) ? out : undefined }); flush(); onDone()
  }
  const reset = () => { update(id, { price_override: undefined }); flush(); onDone() }
  const field = (label: string, v: string, set: (s: string) => void, ph?: number) => (
    <label className="price-row items-center mt-3">
      <span className="price-label">{label}</span>
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-dim price-num text-[13px]">¥</span>
        <input inputMode="decimal" value={v} onChange={ev => set(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') save() }}
          placeholder={ph != null ? yuan(ph) : '未填写'}
          className="price-num w-full h-9 pl-7 pr-3 rounded-lg bg-black/30 ring-1 ring-white/[.08] focus:ring-jblue/60 outline-none text-[14px] placeholder:text-dim transition" />
      </div>
    </label>)
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: .2 }}>
      <p className="text-[11.5px] text-sub mt-3 leading-relaxed">只保存在本机「我的记录」，不改动游戏库；留空则使用目录价。</p>
      {field('发售价', a, setA, catLaunch)}
      {field('史低', b, setB, catLow)}
      <label className="price-row items-center mt-3">
        <span className="price-label">说明</span>
        <input value={n} onChange={ev => setN(ev.target.value)} placeholder="可选，如：国行实体价"
          className="w-full h-9 px-3 rounded-lg bg-black/30 ring-1 ring-white/[.08] focus:ring-jblue/60 outline-none text-[13px] placeholder:text-dim transition" />
      </label>
      <div className="flex justify-end gap-2 mt-4">
        {po && <button onClick={reset} className="h-8 px-3 rounded-lg text-[12.5px] text-sub hover:text-fg ring-1 ring-white/[.08] transition">恢复目录价</button>}
        <button onClick={save} className="h-8 px-4 rounded-lg text-[12.5px] font-semibold bg-jblue text-ink hover:brightness-110 active:scale-95 transition">保存</button>
      </div>
    </motion.div>
  )
}

function KV({ k, v, u, g }: { k: string; v?: React.ReactNode; u?: string; g?: Game }) {
  if (!v) return null
  return <div className="flex gap-3 py-2 text-[13px] border-t border-white/[.05] first:border-0"><span className="w-24 shrink-0 text-dim">{k}</span>
    <span className="min-w-0 text-fg/85 select-text">{v}{u && g && <SrcTag url={u} conf={confOf(u, g) as Conf | null} />}</span></div>
}

function MyPanel({ g }: { g: Game }) {
  const ud = useUserdata()
  const e = ud.entries[String(g.序号)]
  const [note, setNote] = useState(e?.note || '')
  const [tag, setTag] = useState('')
  const [hover, setHover] = useState(0)
  useEffect(() => { setNote(ud.entries[String(g.序号)]?.note || ''); setTag('') }, [g.序号]) // eslint-disable-line
  const id = g.序号
  const tags = e?.tags || []
  const addTag = (t: string) => { t = t.trim(); if (!t || tags.includes(t)) return; update(id, { tags: [...tags, t] }); setTag('') }
  const sugg = allTags().map(x => x[0]).filter(t => !tags.includes(t) && (!tag || t.includes(tag))).slice(0, 8)
  const rating = e?.rating || 0
  return (
    <aside className="rounded-2xl bg-panel ring-1 ring-white/[.06] p-5 relative overflow-hidden">
      <div className="absolute inset-x-0 top-0 h-[3px] bg-[linear-gradient(90deg,var(--color-jred)_50%,var(--color-jblue)_50%)]" />
      <div className="flex items-center justify-between">
        <h3 className="font-cjk-display text-lg">我的记录</h3>
        <button onClick={() => update(id, { fav: !e?.fav })} className={`h-8 px-3 rounded-full flex items-center gap-1.5 text-[12.5px] ring-1 transition active:scale-95 ${e?.fav ? 'bg-jred/15 ring-jred/50 text-jred' : 'ring-white/10 text-sub hover:text-fg hover:ring-white/25'}`}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill={e?.fav ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8"><path d={I.heart} /></svg>{e?.fav ? '已收藏' : '收藏'}
        </button>
      </div>

      <Label>游玩状态</Label>
      <div className="grid grid-cols-3 gap-1.5">
        {STATUS.map(s => {
          const on = e?.status === s.k
          return <button key={s.k} onClick={() => update(id, { status: on ? '' : s.k })} data-status={s.k}
            className={`relative h-9 rounded-lg text-[13px] transition active:scale-95 ${on ? 'font-semibold text-ink' : 'bg-white/[.04] text-sub hover:bg-white/[.08] hover:text-fg'}`}>
            {on && <motion.span layoutId="st-pill" className="absolute inset-0 rounded-lg" style={{ background: s.color }} transition={{ type: 'spring', stiffness: 500, damping: 36 }} />}
            <span className="relative">{s.label}</span></button>
        })}
        {e?.status && <button onClick={() => update(id, { status: '' })} className="h-9 rounded-lg text-[12px] text-dim hover:text-fg bg-transparent ring-1 ring-white/[.06]">清除</button>}
      </div>

      <Label>我的评分 {rating ? <span className="text-sun font-mono ml-1">{rating}/10</span> : <span className="text-dim ml-1">未评分</span>}</Label>
      <div className="flex gap-1" onMouseLeave={() => setHover(0)}>
        {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
          <button key={n} onMouseEnter={() => setHover(n)} onClick={() => update(id, { rating: n === rating ? 0 : n })} title={`${n} 分`}
            className="flex-1 h-7 rounded-[5px] transition-all duration-150"
            style={{ background: n <= (hover || rating) ? `color-mix(in srgb, var(--color-sun) ${55 + n * 4.5}%, transparent)` : 'rgb(255 255 255 / .06)', transform: hover === n ? 'translateY(-2px)' : undefined }} />))}
      </div>

      <Label>自定义标签</Label>
      <div className="flex flex-wrap gap-1.5 mb-2">
        {tags.map(t => <span key={t} className="chip !bg-jblue/10 !border-jblue/30 text-jblue">{t}<button className="opacity-60 hover:opacity-100" onClick={() => update(id, { tags: tags.filter(x => x !== t) })}>×</button></span>)}
      </div>
      <input value={tag} onChange={ev => setTag(ev.target.value)} onKeyDown={ev => { if (ev.key === 'Enter') addTag(tag) }} placeholder="输入标签后回车，如：双人、收集向"
        className="w-full h-9 px-3 rounded-lg bg-black/30 ring-1 ring-white/[.08] focus:ring-jblue/60 outline-none text-[13px] placeholder:text-dim transition" />
      {sugg.length > 0 && <div className="flex flex-wrap gap-1 mt-2">{sugg.map(t => <button key={t} onClick={() => addTag(t)} className="chip hover:!bg-white/10">+ {t}</button>)}</div>}

      <Label>笔记</Label>
      <textarea value={note} onChange={ev => { setNote(ev.target.value); update(id, { note: ev.target.value }, 400) }} onBlur={() => flush()} rows={5}
        placeholder="进度、心得、和谁一起玩……自动保存"
        className="scroll w-full px-3 py-2.5 rounded-lg bg-black/30 ring-1 ring-white/[.08] focus:ring-jblue/60 outline-none text-[13px] leading-relaxed resize-y placeholder:text-dim transition" />
      <div className="text-[11px] text-dim mt-2 h-4">{e?.updated ? `已保存 · ${new Date(e.updated).toLocaleString('zh-CN', { hour12: false })}` : '标记会保存在本机'}</div>
    </aside>
  )
}
const Label = ({ children }: { children: React.ReactNode }) => <div className="text-[11.5px] text-sub mt-5 mb-2 flex items-center">{children}</div>
