# 用户数据格式 / Userdata schema

本文说明 Switch 游戏库桌面应用**用户标记数据**的存储与导入导出格式（与游戏资料库 `data.json` 无关）。

This document describes the **user marks** format (play status, favourites, ratings, tags, notes). Game catalogue data lives in `public/data/games.json` and is documented separately.

| 项 | 值 |
|---|---|
| 当前 `format_version` | **3** |
| 当前 `app_version` | **1.1.3** |
| `app` | 恒为 `"switch-library"` |
| 本地文件 | `userdata.json`（旁路备份 `userdata.json.bak`） |
| Linux 路径 | `~/.local/share/com.catyu.switchlibrary/userdata.json` |
| Windows 路径 | `%APPDATA%\com.catyu.switchlibrary\userdata.json` |

---

## 1. JSON 主格式（导出 / 本地存储）

根对象：

| 字段 (EN) | 中文 | 类型 | 说明 |
|---|---|---|---|
| `format_version` | 格式版本 | number | 整数。当前为 `3`。导入时按迁移链升级。 |
| `app_version` | 应用版本 | string | 写出该文件时的应用 semver，如 `"1.1.3"`。 |
| `app` | 应用标识 | string | 固定 `"switch-library"`。 |
| `exported_at` | 导出时间 | string? | ISO-8601。仅出现在**导出文件**中，本地 `userdata.json` 通常没有。 |
| `entries` | 用户记录 | object | 键为游戏 `序号`（十进制字符串，如 `"1"`），值为 Entry。 |
| `meta` | 元数据 | object? | 可选；如 `imported_from: "legacy-web"`。未知键会保留。 |
| *(其它顶层键)* | — | any | **向前兼容**：导入时原样保留未知顶层字段。 |

### Entry（单条游戏记录）

| 字段 (EN) | 中文 | 类型 | 说明 |
|---|---|---|---|
| `status` | 游玩状态 | string? | 枚举见下表。缺省 / `""` 表示未设置。 |
| `fav` | 收藏 | boolean? | `true` 表示已收藏。 |
| `rating` | 我的评分 | number? | 整数 **1–10**；`0` 或不写表示未评分。 |
| `tags` | 自定义标签 | string[]? | 去重后的标签列表。 |
| `note` | 笔记 | string? | 自由文本。 |
| `price_override` | 价格手动更正 | object? | **v3**。仅影响详情页展示，**不**写回游戏库。见下。 |
| `updated` | 更新时间 | number | Unix 毫秒时间戳。 |
| *(其它键)* | — | any | **向前兼容**：未知字段随条目一起保留。 |

### `price_override`（v3）

| 字段 | 类型 | 说明 |
|---|---|---|
| `launch_cny` | number\|null? | 手动发售约合人民币；`null` 表示清除该字段回退目录价。 |
| `lowest_cny` | number\|null? | 手动史低约合人民币。 |
| `note` | string? | 更正说明（可选）。 |
| `updated` | number? | 更正时间（毫秒）。 |

UI 优先显示覆盖值，并标「已手动更正」。目录 `price_cny` / `lowest` 不变。

### `status` 枚举

| 值 (EN) | 中文 UI |
|---|---|
| `want` | 想玩 |
| `playing` | 在玩 |
| `played` | 已玩 |
| `done` | 已通关 |
| `shelved` | 搁置 |

别名（导入时映射）：`wishlist`/`want_to_play`/`想玩` → `want`；`in_progress`/`在玩` → `playing`；`completed`/`cleared`/`已通关` → `done`；`dropped`/`on_hold`/`搁置` → `shelved`；`已玩` → `played`。

### 导出示例

```json
{
  "format_version": 2,
  "app_version": "1.1.0",
  "app": "switch-library",
  "exported_at": "2026-10-22T03:00:00.000Z",
  "entries": {
    "1": {
      "status": "playing",
      "fav": true,
      "rating": 9,
      "tags": ["动作", "双人"],
      "note": "第 5 章",
      "updated": 1760000000000
    }
  },
  "meta": {}
}
```

---

## 2. CSV 导出

UTF-8 with BOM。列：

| 列名 | 对应字段 |
|---|---|
| 序号 | entry key |
| 名称 | 游戏原始名称（仅导出时填充，导入 CSV 不支持） |
| 状态 | `status` 的中文标签 |
| 收藏 | `是` / 空 |
| 我的评分 | `rating` |
| 标签 | `tags`，用 `\|` 分隔 |
| 笔记 | `note` |
| 更新时间 | `updated`（毫秒） |

**当前版本只支持导出 CSV，不支持从 CSV 导入。** 完整往返请用 JSON。

---

## 3. 旧版网页工具格式（`legacy-web`）

文件名常见为 `switch-marks.json`。可识别形态：

```json
{
  "version": 1,
  "marks": {
    "1": { "played": true, "want": false, "fav": true }
  }
}
```

或根对象直接是 `marks` 映射 / 纯数字键对象。

| 旧字段 | 迁移到 |
|---|---|
| `played: true` | `status: "played"`（优先于 want） |
| `want: true` | `status: "want"`（仅当未 played） |
| `fav: true` | `fav: true` |

导入后 `meta.imported_from = "legacy-web"`，`format_version` 升为 `2`。

---

## 4. 迁移链 / Migration chain

导入时按检测结果走链（不会静默丢数据）：

1. **`legacy-web`** → 按上表映射 → normalize → **v2**
2. **早期桌面备份**（有 `entries` + `version: 2`，无 `format_version`）→ 补齐 `format_version` / `app_version` → normalize → **v2**
3. **`format_version` &lt; 2**（预留）→ 逐步升到 2，并对每条 Entry 做 normalize（status 别名、rating 钳制、tags 去重）
4. **`format_version` == 2** → normalize 后直接使用
5. **`format_version` &gt; 本应用已知最大值** → **尽力导入**：读取已知字段，**原样保留未知字段**；UI 显示中文警告，**不崩溃、不拒绝整个文件**

本地启动时若磁盘上的 `userdata.json` 仍是早期形状，会经同一套迁移后再写入内存（下次保存时写成规范 v2）。

---

## 5. 合并 vs 替换

| 模式 | 行为 |
|---|---|
| **合并 merge** | 保留本地已有记录。同序号：标量字段以备份中已设置的值为准并集；`tags` 取并集；`note` 去重后换行拼接；`fav` 任一为真则真；`updated` 取较大者。 |
| **替换 replace** | 用备份中的 `entries` **整表替换**本地用户记录。UI 必须勾选确认后才能执行，**不会静默清空**。 |

---

## 6. UI 入口

侧栏底部 **数据与备份** → 导出 JSON / CSV，或选择文件导入 → 预览类型与条数 → **合并导入** 或勾选后 **替换全部**。
