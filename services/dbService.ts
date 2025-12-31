
import initSqlJs, { Database } from 'sql.js';

let dbInstance: Database | null = null;

const SQL_WASM_URL = 'https://unpkg.com/sql.js@1.13.0/dist/sql-wasm.wasm';

/**
 * 智慧偵測當前環境的 Base URL
 * 支援 localhost, github.io/repo-name/ 等各種部署情境
 */
const getRepoBaseUrl = () => {
  const { origin, pathname, hostname } = window.location;
  
  // 1. 本地開發環境
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }

  // 2. GitHub Pages 環境 (偵測子目錄名稱)
  const pathSegments = pathname.split('/').filter(Boolean);
  const repoName = pathSegments.length > 0 ? pathSegments[0] : '';
  
  if (repoName && !hostname.includes('localhost')) {
    // 格式如: https://username.github.io/WalkGISApp/
    return `${origin}/${repoName}/`;
  }
  
  return `${origin}/`;
};

export const getDb = async (): Promise<Database> => {
  if (dbInstance) return dbInstance;

  try {
    console.log("[WalkGIS] Initializing SQLite WASM...");
    const wasmResponse = await fetch(SQL_WASM_URL);
    if (!wasmResponse.ok) throw new Error(`WASM binary fetch failed`);
    const wasmBinary = await wasmResponse.arrayBuffer();
    const SQL = await initSqlJs({ wasmBinary });

    // 取得資料庫路徑
    const baseUrl = getRepoBaseUrl();
    const dbUrl = `${baseUrl}walkgis_prj/walkgis.db`;
    
    console.log(`[WalkGIS] Fetching database from: ${dbUrl}`);
    
    const response = await fetch(dbUrl);
    if (!response.ok) {
      throw new Error(
        `Database file not found at ${dbUrl}. \n\n` +
        `請確認您已將 'walkgis_prj' 資料夾及其內容上傳到 GitHub 的 '${baseUrl.split('/').filter(Boolean).pop()}' 儲存庫中。`
      );
    }
    
    const arrayBuffer = await response.arrayBuffer();
    dbInstance = new (SQL as any).Database(new Uint8Array(arrayBuffer));
    console.log("[WalkGIS] Database loaded successfully.");
    return dbInstance!;
  } catch (error: any) {
    console.error('Database Initialization Failed:', error);
    throw error;
  }
};

export const queryMaps = async () => {
  const db = await getDb();
  const results = db.exec('SELECT * FROM walking_maps ORDER BY created_at DESC');
  if (results.length === 0) return [];
  
  const columns = results[0].columns;
  return results[0].values.map(row => {
    const obj: any = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });
};

export const queryFeaturesByMap = async (mapId: string) => {
  const db = await getDb();
  const sql = `
    SELECT f.* FROM walking_map_features f
    JOIN walking_map_relations r ON f.feature_id = r.feature_id
    WHERE r.map_id = ?
    ORDER BY r.display_order ASC
  `;
  const stmt = db.prepare(sql);
  stmt.bind([mapId]);
  
  const features = [];
  while (stmt.step()) {
    features.push(stmt.getAsObject());
  }
  stmt.free();
  return features;
};

export const queryAllFeatures = async () => {
  const db = await getDb();
  const sql = `SELECT * FROM walking_map_features`;
  const stmt = db.prepare(sql);
  
  const features = [];
  while (stmt.step()) {
    features.push(stmt.getAsObject());
  }
  stmt.free();
  return features;
};

export const searchFeatures = async (term: string) => {
  if (!term || term.length < 2) return [];
  const db = await getDb();
  const sql = `SELECT feature_id, name FROM walking_map_features WHERE name LIKE ? LIMIT 10`;
  const stmt = db.prepare(sql);
  stmt.bind([`%${term}%`]);
  
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
};
