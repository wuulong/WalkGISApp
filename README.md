
# 🌍 WalkGIS - 互動式地理資訊探索器

WalkGIS 是一個高效能、伺服器端免設定 (Serverless) 的地理資訊系統 (GIS) 網頁應用程式。專為展示步行地圖、文化路徑與地方景點資訊而設計。

本專案利用 **SQLite WebAssembly** 技術，將完整的關聯式資料庫直接運行於使用者的瀏覽器中，提供流暢的搜尋與地圖互動體驗。

## ✨ 核心功能

*   **互動式地圖瀏覽**：基於 Leaflet 的流暢地圖介面，支援多點 POI 標記與即時彈窗。
*   **高效能全域搜尋**：利用 SQL 索引實現即時搜尋，快速定位地圖上的特定特徵 (Features)。
*   **Rich Content 顯示**：整合 React Markdown，支援圖文並茂的景點介紹，並能自動解析 Markdown 內的相對路徑圖片。
*   **離線首選架構**：透過 `sql.js` 載入 `.db` 檔案，載入後無需頻繁與伺服器交換資料，反應極快。
*   **多樣化匯出工具**：
    *   **KML 匯出**：一鍵產生 Google Earth 格式的地圖檔案。
    *   **NotebookLM 脈絡產出**：自動生成專為 AI 模型 (如 Google NotebookLM) 優化的文字脈絡，方便進行深度研究。
*   **自動化路徑解析**：具備強大的路徑修正邏輯，確保在 GitHub Pages 子目錄環境下，圖片與資料庫連結皆能精確命中。

## 🛠 技術棧

*   **Frontend**: React 19, TypeScript, Tailwind CSS
*   **Mapping**: Leaflet, React Leaflet
*   **Database**: sql.js (SQLite in WASM)
*   **Content**: React Markdown, Remark GFM
*   **Icons**: Lucide React

## 📂 專案結構與資料夾對應

本專案採用 **應用程式 (App)** 與 **資料專案 (Prj)** 分離的設計思維：

*   `walkgis_app/` (本儲存庫)：存放應用程式原始碼、組件與 UI 邏輯。
*   `walkgis_prj/` (資料目錄)：存放靜態資源，應包含：
    *   `walkgis.db`: 核心 SQLite 資料庫。
    *   `assets/images/`: 存放所有地圖封面與內容圖片。
    *   `features/`: 存放各景點的 `.md` 說明檔案。

## 🚀 如何使用

### 1. 部署資料
確保您的 `walkgis_prj` 資料夾已放置於網頁伺服器（或 GitHub Pages 的同一 Repo 目錄）中。

### 2. 資料庫結構要求
資料庫 `walkgis.db` 應包含以下核心資料表：
*   `walking_maps`: 儲存地圖列表、名稱、描述與 `cover_image` 路徑。
*   `walking_map_features`: 儲存地理點位、名稱、`geometry_wkt` (WKT 格式) 與 `feature_id`。
*   `walking_map_relations`: 建立地圖與點位間的一對多關聯。

### 3. 開發與編譯
本專案支援 ES6 模組直接導入。
1. 在本地端開啟一個靜態伺服器 (如 Live Server)。
2. 造訪 `index.html` 即可自動啟動應用程式。
3. 程式會自動偵測當前環境（Local 或 Remote），並從預設的遠端路徑 `https://wuulong.github.io/wuulong-notes-blog/walkgis_prj/` 抓取資源。

### 4. 內容更新
若要新增景點介紹，只需在 `walkgis_prj/features/` 底下新增與 `feature_id` 同名的 `.md` 檔案，內容將自動映射至 UI。

## 🛡 權限說明
本程式會向瀏覽器請求 `geolocation` (地理位置) 權限，僅用於地圖定位導航功能。

---
&copy; 2025 WalkGIS Open Project. 讓地理資訊的分享變得更簡單、更直覺。
社群連結：[哈爸筆記 Blog](https://bit.ly/4p0gHtH) | [哈爸實驗室 Discord](https://discord.gg/DtCERqHcSF)
