# 🌍 WalkGIS Protocol - Version History & Roadmap

## 📋 當前版本：v2.1 "Stable Explorer"
**更新日期：2025-02-02**

WalkGIS 是一個去中心化的地理資訊探索協議，致力於提供離線優先 (Offline-first)、伺服器端免設定 (Serverless) 的地圖瀏覽體驗。

---

## 🚀 最近更新 (v2.1)

### 1. 導航系統重構 (Environment Isolation)
- **解決方案**：針對 `ai.studio` 或 `blob:` 來源受限環境，開發了 **Custom Event Navigation System**。
- **行為修正**：不再強制依賴 `history.pushState`，透過 `internal-navigation` 事件確保在沙盒環境下連結依然能正常跳轉，解決 `SecurityError`。
- **UI 影響**：導讀 Markdown 中的內部連結點擊反應更迅速且穩定。

### 2. 即時地理定位 (Real-time Location)
- **新功能**：在地圖上新增使用者目前位置。
- **視覺呈現**：藍色脈衝動態圖示 (Pulsing Blue Dot) 與 GPS 準確度圓圈 (Accuracy Circle)。
- **互動優化**：新增「地圖定位按鈕」，點擊後可平滑移動 (Fly-to) 至使用者所在地點。
- **權限處理**：完善 Geolocation API 的請求與失敗處理。

### 3. 多媒體渲染強化 (Rich Media Rendering)
- **圖片解析**：優化了 POI 景點 Markdown 的圖片渲染路徑，支援 `features/` 與 `maps/` 目錄的自動切換。
- **自動圖說**：解析 Markdown `alt` 標籤，自動生成優雅的圖片說明文字。
- **視覺樣式**：為內容圖片新增圓角、陰影與響應式寬度處理。

---

## 📜 歷史版本

### v2.0 "The SQL.js Revolution" (2025-01)
- **重大變革**：捨棄傳統 JSON 載入，全面改用 **SQLite WebAssembly**。
- **效能提升**：支援萬級點位即時查詢與 FTS 搜尋。
- **資料節點**：引入 "Source Switcher"，支援掛載多個 GitHub Pages 資料來源。
- **匯出引擎**：新增 ATAK 資料包 (zip) 與 NotebookLM 脈絡生成功能。

### v1.x "Legacy Prototype" (2024-12)
- 基於 React Leaflet 的基本地圖展示。
- 固定式的資料載入邏輯。
- 基礎 Markdown 顯示。

---

## 🛠 技術架構 (Architecture)

- **核心引擎**: `sql.js` (WASM)
- **地圖框架**: `Leaflet` + `React Leaflet`
- **內容解析**: `React Markdown` + `Remark GFM`
- **圖示庫**: `Lucide React`
- **樣式系統**: `Tailwind CSS`

---

## 🗺 資料結構規格 (Spec)

WalkGIS 期望的 `walkgis.db` 應包含：

| 資料表 | 說明 |
| :--- | :--- |
| `walking_maps` | 地圖集主表 (map_id, name, description, cover_image) |
| `walking_map_features` | 空間特徵表 (feature_id, name, geometry_wkt) |
| `walking_map_relations` | 關聯表，決定地圖內點位的顯示順序 (display_order) |

---

## 🛣 未來藍圖 (Roadmap)
- [ ] **向量切圖 (Vector Tiles)**：支援更輕量的大型底圖載入。
- [ ] **離線地圖包 (Offline PWA)**：支援完整的 Service Worker 快取，實現真正的離線使用。
- [ ] **協作標註**：簡單的本地端標註紀錄與匯出。

---
&copy; 2025 WalkGIS Protocol Team. 讓地理資訊的分享變得更簡單、更直覺。
