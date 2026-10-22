import { Game, Screenshot } from './data'
import { fileUrl, getPaths } from './platform'

let coversDir: string | null = null
let shotsDir: string | null = null
export async function initCovers() {
  try { const p = await getPaths(); coversDir = p?.covers_dir || null; shotsDir = p?.screenshots_dir || null } catch { coversDir = null; shotsDir = null }
  return coversDir
}
export const screenshotsDirectory = () => shotsDir
/** Large screenshot: optional local pack folder -> official/original source URL (online) -> bundled thumbnail. */
export function resolveShots(shots: Screenshot[]): Screenshot[] {
  return shots.map(sh => {
    let path = sh.remote || sh.thumb || sh.path
    if (shotsDir && sh.file) {
      const sep = shotsDir.includes('\\') ? '\\' : '/'
      path = fileUrl(shotsDir + sep + sh.file.split('/').join(sep))
    }
    return { ...sh, path }
  })
}
export const coversDirectory = () => coversDir
/** Full-resolution cover from the optional external covers folder (Tauri only); null => use bundled thumbnail. */
export function fullCover(g: Game): string | null {
  if (!coversDir || !g.cover) return null
  const base = g.cover.split('/').pop()!
  const sep = coversDir.includes('\\') ? '\\' : '/'
  return fileUrl(coversDir + sep + base)
}
