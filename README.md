# SwitchGameHub / SwitchLibrary

本仓库托管 **SwitchLibrary**（Tauri 2 桌面应用；GitHub 仓库名 **SwitchGameHub**）：本地 Switch 游戏资料库与游玩记录。产品名仍为 tauri.conf 里的 `SwitchLibrary`。

Windows NSIS 安装包由 GitHub Actions 构建（[`.github/workflows/build.yml`](./.github/workflows/build.yml)）：`workflow_dispatch` 或推送 `v*` 标签。合并到 `main` 后，在 Actions 里手动跑一次即可拿到首个 `.exe` 产物。

封面缩略图 `public/thumbs/` 未纳入本次种子（体积过大）。可之后用 Git LFS 补上（见 `.gitattributes`）；没有缩略图时界面走占位图。`prepare-data` 在缺少 `../web` 但已有 `public/data/games.json` 时直接复用已提交数据，不会发明或改写游戏条目。

## 目录
- `src/` 前端（React 18 + TypeScript + Tailwind CSS 4 + Motion + TanStack Virtual）
- `src-tauri/` Rust 后端（Tauri 2，插件：dialog、opener；asset 协议用于可选高清封面）
- `scripts/prepare_data.py` 有 `../web/data.json` 时从 web 资料生成 `public/data/games.json` 和 `public/thumbs/*.webp`；CI / 本仓库种子走已提交的 `public/data/games.json`
- `.github/workflows/build.yml` 在 GitHub 上构建 Windows NSIS 安装包

## 构建
```bash
npm ci
npx tauri build --bundles nsis
```
`beforeBuildCommand` 会自动运行 `prepare_data.py`。本仓库没有 `../web` 源目录时脚本立即成功退出。

## 用户数据
- 保存在系统应用数据目录的 `userdata.json`（Linux: `~/.local/share/com.catyu.switchlibrary/`，Windows: `%APPDATA%\com.catyu.switchlibrary\`），原子写入，并保留 `userdata.json.bak`。
- 导出 JSON 带 `format_version`（当前 2）与 `app_version`；CSV 含状态/收藏/评分/标签/笔记。
- 导入支持**合并**与**替换**（替换需勾选确认，不会静默清空）；自动迁移旧版网页工具 `switch-marks.json`（legacy-web）以及早期桌面备份；遇到更新的 format_version 会尽力导入并中文提示。
- 完整字段说明见 [`USERDATA_SCHEMA.md`](./USERDATA_SCHEMA.md)。

## 高清封面（可选）
安装包可内置缩略图（本仓库种子尚未包含 thumbs）。如需原图：把 `switch-library-covers-hd.zip` 解压出的 `covers/` 文件夹放到数据目录（与 userdata.json 同级），或程序旁边，或设置环境变量 `SWITCHLIB_COVERS=/路径/covers`。详情页和首页轮播会自动改用原图。
