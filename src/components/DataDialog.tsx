import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { Game } from '../data'
import {
  APP_VERSION, FORMAT_VERSION, ImportError, ImportMode,
  exportCSV, exportJSON, importJSON, inspectImport, useUserdata,
} from '../store'
import { Paths, exportText, getPaths, importText, isTauri, openDataDir } from '../platform'
import { Icon, I } from './bits'

type Pending = {
  text: string
  kindLabel: string
  format_version: number | 'legacy-web'
  count: number
  warning?: string
  migrations: string[]
}

export function DataDialog({ games, onClose, toast }: { games: Game[]; onClose: () => void; toast: (s: string) => void }) {
  const ud = useUserdata()
  const [paths, setPaths] = useState<Paths | null>(null)
  const [pending, setPending] = useState<Pending | null>(null)
  const [busy, setBusy] = useState(false)
  useEffect(() => { getPaths().then(setPaths).catch(() => { }) }, [])
  const n = Object.keys(ud.entries).length
  const byId = new Map(games.map(g => [String(g.序号), g]))

  const doExport = async () => {
    const p = await exportText(`switch-library-备份-v${FORMAT_VERSION}-${new Date().toISOString().slice(0, 10)}.json`, exportJSON())
    if (p) toast(`已导出 JSON 备份（format_version ${FORMAT_VERSION}）→ ${p}`)
  }
  const doCsv = async () => {
    const csv = exportCSV(ud.entries, id => byId.get(id)?.原始名称 || byId.get(id)?._name || '')
    const p = await exportText(`switch-library-标记-${new Date().toISOString().slice(0, 10)}.csv`, csv)
    if (p) toast(`已导出 CSV → ${p}`)
  }
  const pickImport = async () => {
    const t = await importText(); if (!t) return
    try {
      const info = inspectImport(t)
      setPending({
        text: t, kindLabel: info.kindLabel, format_version: info.format_version,
        count: Object.keys(info.data.entries).length, warning: info.warning, migrations: info.migrations,
      })
    } catch (e) {
      toast('无法导入：' + ((e as Error).message || String(e)))
    }
  }
  const apply = async (mode: ImportMode) => {
    if (!pending || busy) return
    setBusy(true)
    try {
      const r = importJSON(pending.text, mode)
      setPending(null)
      const base = mode === 'replace'
        ? `已替换为备份中的 ${r.count} 条记录（${r.kind}）`
        : `已合并 ${r.count} 条记录（${r.kind}）`
      toast(r.warning ? base + '。注意：' + r.warning : base)
    } catch (e) {
      toast('导入失败：' + ((e instanceof ImportError ? e.message : (e as Error).message) || String(e)))
    } finally { setBusy(false) }
  }

  return (
    <motion.div className="fixed inset-0 z-50 grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <motion.div className="scroll relative w-full max-w-[600px] max-h-[90vh] overflow-y-auto rounded-[20px] bg-ink2 ring-1 ring-white/[.08] p-7"
        initial={{ y: 20, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, scale: .98 }} transition={{ type: 'spring', stiffness: 400, damping: 32 }}>
        <button onClick={onClose} className="absolute right-4 top-4 w-8 h-8 grid place-items-center rounded-full hover:bg-white/10 text-sub"><Icon d={I.x} size={16} /></button>
        <h2 className="font-cjk-display text-2xl">数据与备份</h2>
        <p className="text-sub text-[13px] mt-1">
          你已经记录了 <b className="text-fg">{n}</b> 个游戏。标记、评分、标签和笔记只保存在本机。
          <span className="text-dim ml-1 font-mono text-[11px]">format v{FORMAT_VERSION} · app {APP_VERSION}</span>
        </p>

        {isTauri && paths && <div className="mt-5 rounded-xl bg-panel ring-1 ring-white/[.05] p-4 text-[12.5px] space-y-2">
          <div className="flex gap-3"><span className="text-dim w-20 shrink-0">数据文件</span><code className="font-mono text-[11.5px] break-all text-fg/80 select-text">{paths.userdata_file}</code></div>
          <div className="flex gap-3"><span className="text-dim w-20 shrink-0">高清封面</span><span className="text-fg/80 break-all">{paths.covers_dir ? <code className="font-mono text-[11.5px] select-text">{paths.covers_dir}</code> : '未找到（正在使用内置缩略图）。把 covers 文件夹放到数据目录或程序旁边即可启用。'}</span></div>
          <div className="flex gap-3"><span className="text-dim w-20 shrink-0">高清截图包</span><span className="text-fg/80 break-all">{paths.screenshots_dir ? <code className="font-mono text-[11.5px] select-text">{paths.screenshots_dir}</code> : '未找到。安装包仅含缩略图；可把 screenshots 文件夹放到数据目录或程序旁边，或由应用在线加载官方原图。'}</span></div>
          <button onClick={() => openDataDir()} className="mt-1 text-jblue hover:underline">打开数据目录</button>
        </div>}

        <Section t="导出">
          <div className="grid grid-cols-2 gap-3">
            <Btn onClick={doExport} t="导出 JSON 备份" d={`主格式 · 含 format_version ${FORMAT_VERSION}、app_version、状态/收藏/评分/标签/笔记`} />
            <Btn onClick={doCsv} t="导出 CSV 表格" d="可用 Excel / WPS 打开；标签用 | 分隔" />
          </div>
        </Section>

        <Section t="导入">
          <Btn onClick={pickImport} t="选择备份文件…" d="支持本应用 JSON（各版本）、旧版网页工具的 switch-marks.json。导入前会让你选择合并或替换。" wide />
          <ul className="mt-3 text-[11.5px] text-dim space-y-1 leading-relaxed list-disc pl-4">
            <li><b className="text-sub">合并</b>：保留现有记录，同号游戏合并字段（标签取并集，笔记去重拼接）。</li>
            <li><b className="text-sub">替换</b>：用备份里的记录整份覆盖本地用户数据——需二次确认，不会静默清空。</li>
            <li>遇到比当前应用更新的备份时，会尽量导入已知字段并给出中文提示，不会崩溃。</li>
          </ul>
        </Section>

        <p className="text-[11.5px] text-dim mt-5 leading-relaxed">游戏资料来自 Wikidata、维基百科、Steam、任天堂各区 eShop、Metacritic、游民星空等公开页面，每项都附有来源链接与匹配度；没有找到的资料不会被补造。用户数据格式说明见应用目录中的 USERDATA_SCHEMA.md。</p>
      </motion.div>

      <AnimatePresence>
        {pending && <Confirm pending={pending} localCount={n} busy={busy} onCancel={() => setPending(null)} onMerge={() => apply('merge')} onReplace={() => apply('replace')} />}
      </AnimatePresence>
    </motion.div>
  )
}

function Confirm({ pending, localCount, busy, onCancel, onMerge, onReplace }: {
  pending: Pending; localCount: number; busy: boolean
  onCancel: () => void; onMerge: () => void; onReplace: () => void
}) {
  const [ack, setAck] = useState(false)
  return (
    <motion.div className="fixed inset-0 z-[60] grid place-items-center p-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <div className="absolute inset-0 bg-black/60" onClick={busy ? undefined : onCancel} />
      <motion.div className="relative w-full max-w-[480px] rounded-[18px] bg-ink2 ring-1 ring-white/[.1] p-6 shadow-2xl"
        initial={{ y: 16, scale: .97 }} animate={{ y: 0, scale: 1 }} exit={{ y: 10, opacity: 0 }}>
        <h3 className="font-cjk-display text-xl">确认导入</h3>
        <div className="mt-3 rounded-xl bg-panel ring-1 ring-white/[.05] p-3.5 text-[13px] space-y-1.5">
          <Row k="文件类型" v={pending.kindLabel} />
          <Row k="格式版本" v={String(pending.format_version)} />
          <Row k="备份条数" v={`${pending.count} 条`} />
          <Row k="本地现有" v={`${localCount} 条`} />
        </div>
        {pending.migrations.length > 0 && <div className="mt-3 text-[11.5px] text-dim">
          <div className="text-sub mb-1">将执行的迁移</div>
          <ul className="list-disc pl-4 space-y-0.5">{pending.migrations.map((m, i) => <li key={i}>{m}</li>)}</ul>
        </div>}
        {pending.warning && <div className="mt-3 flex gap-2 items-start rounded-xl px-3.5 py-3 text-[12.5px] bg-sun/10 ring-1 ring-sun/30 text-sun">
          <Icon d={I.warn} size={15} className="mt-0.5 shrink-0" /><div>{pending.warning}</div>
        </div>}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <button disabled={busy} onClick={onMerge}
            className="h-11 rounded-xl bg-jblue text-ink font-semibold text-[13.5px] hover:brightness-110 active:scale-[.98] transition disabled:opacity-50">
            合并导入
          </button>
          <button disabled={busy || !ack} onClick={onReplace}
            className="h-11 rounded-xl bg-jred/90 text-white font-semibold text-[13.5px] hover:brightness-110 active:scale-[.98] transition disabled:opacity-40 disabled:cursor-not-allowed">
            替换全部
          </button>
        </div>
        <label className="mt-3 flex items-start gap-2 text-[12px] text-sub cursor-pointer select-none">
          <input type="checkbox" checked={ack} onChange={e => setAck(e.target.checked)} className="mt-0.5 accent-[var(--color-jred)]" />
          <span>我了解「替换全部」会用备份覆盖本地全部用户数据（状态、收藏、评分、标签、笔记），此操作需勾选后才能执行。</span>
        </label>
        <button disabled={busy} onClick={onCancel} className="mt-3 w-full h-9 text-[12.5px] text-dim hover:text-fg transition">取消</button>
      </motion.div>
    </motion.div>
  )
}

const Section = ({ t, children }: { t: string; children: React.ReactNode }) => (
  <section className="mt-6"><h3 className="text-[11px] font-semibold tracking-[.22em] text-dim mb-3 flex items-center gap-2"><span className="w-3 h-[2px] bg-white/20" />{t}</h3>{children}</section>
)
const Row = ({ k, v }: { k: string; v: string }) => (
  <div className="flex gap-3"><span className="text-dim w-16 shrink-0">{k}</span><span className="text-fg/90 min-w-0 break-all">{v}</span></div>
)
const Btn = ({ onClick, t, d, wide }: { onClick: () => void; t: string; d: string; wide?: boolean }) => (
  <button onClick={onClick} className={`text-left rounded-xl bg-white/[.04] hover:bg-white/[.08] ring-1 ring-white/[.06] hover:ring-jblue/40 p-4 transition active:scale-[.98] ${wide ? 'col-span-2 w-full' : ''}`}>
    <div className="text-[14px] font-semibold">{t}</div><div className="text-[11.5px] text-sub mt-1 leading-snug">{d}</div>
  </button>
)

// silence unused STATUS_LABEL if tree-shaken away from this file — kept for CSV via exportCSV
