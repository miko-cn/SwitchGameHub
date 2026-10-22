import { RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Game } from '../data'
import { UserData } from '../store'
import { Tile } from './Tile'

const GAP = 22

/**
 * Row-virtualized game grid (TanStack Virtual).
 * Only ~overscan rows × cols Tile mounts stay in the DOM for 2500+ games.
 * Covers stay lazy via <img loading="lazy"> inside CoverImg.
 */
export function Grid({ list, ud, scrollRef, onOpen, minW, listKey }: {
  list: Game[]; ud: UserData; scrollRef: RefObject<HTMLDivElement | null>
  onOpen: (id: number) => void; minW: number; listKey: string
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [w, setW] = useState(1000)
  const [margin, setMargin] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current, sc = scrollRef.current
    if (!el || !sc) return
    const measure = () => {
      setW(el.clientWidth)
      setMargin(el.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el); ro.observe(sc)
    if (sc.firstElementChild) ro.observe(sc.firstElementChild)
    return () => ro.disconnect()
  }, [scrollRef])

  const cols = Math.max(2, Math.floor((w + GAP) / (minW + GAP)))
  const cw = (w - GAP * (cols - 1)) / cols
  // cover (square) + title block (~52) + row gap
  const rowH = cw + 52 + GAP
  const rows = Math.ceil(list.length / cols) || 0

  const estimateSize = useCallback(() => rowH, [rowH])
  const getItemKey = useCallback((index: number) => {
    const g = list[index * cols]
    return g ? g.序号 : index
  }, [list, cols])

  const v = useVirtualizer({
    count: rows,
    getScrollElement: () => scrollRef.current,
    estimateSize,
    overscan: 4,
    scrollMargin: margin,
    getItemKey,
  })

  // Re-measure when column geometry changes (density / window resize)
  useEffect(() => { v.measure() }, [rowH, cols, margin]) // eslint-disable-line react-hooks/exhaustive-deps

  // Stagger entrance only when the filtered set identity changes — not on scroll remounts
  const seen = useRef('')
  const fresh = seen.current !== listKey
  useEffect(() => { seen.current = listKey })

  const total = v.getTotalSize()
  const items = v.getVirtualItems()

  return (
    <div ref={ref} className="relative w-full" style={{ height: total || rows * rowH }}>
      {items.map(r => {
        const start = r.index * cols
        const slice = list.slice(start, start + cols)
        return (
          <div
            key={r.key}
            data-row={r.index}
            className="absolute left-0 right-0 grid"
            style={{
              top: r.start - margin,
              height: rowH,
              gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
              columnGap: GAP,
            }}
          >
            {slice.map((g, i) => (
              <Tile
                key={g.序号}
                g={g}
                e={ud.entries[String(g.序号)]}
                onOpen={onOpen}
                delay={fresh ? Math.min(r.index, 3) * 50 + i * 24 : 0}
              />
            ))}
          </div>
        )
      })}
    </div>
  )
}
