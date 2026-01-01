
import * as SQLJS from 'sql.js';
import type { Database } from 'sql.js';

let dbInstance: Database | null = null;
let currentLoadedUrl: string | null = null;

const SQL_WASM_VERSION = '1.12.0';
const WASM_CDNS = [
  `https://cdn.jsdelivr.net/npm/sql.js@${SQL_WASM_VERSION}/dist/sql-wasm.wasm`,
  `https://unpkg.com/sql.js@${SQL_WASM_VERSION}/dist/sql-wasm.wasm`,
  `https://cdnjs.cloudflare.com/ajax/libs/sql.js/${SQL_WASM_VERSION}/sql-wasm.wasm`
];

async function fetchWithDiagnostics(url: string, description: string, options?: RequestInit) {
  try {
    console.log(`[Diagnostic] Fetching ${description}: ${url}`);
    const response = await fetch(url, { 
      ...options, 
      cache: 'no-store',
      mode: 'cors'
    });
    
    if (!response.ok) {
      const error = new Error(`${description} HTTP ${response.status}: ${response.statusText}`);
      (error as any).status = response.status;
      (error as any).url = url;
      throw error;
    }
    
    return response;
  } catch (error: any) {
    // 只有在真的正在 Reload 時才標記為 Abort
    if (window.__WALKGIS_RELOADING__) {
      const abortErr = new Error('Page transition in progress');
      abortErr.name = 'AbortError';
      throw abortErr;
    }
    throw error;
  }
}

async function fetchWasmWithFallback(log: (m: string) => void): Promise<Uint8Array> {
  let lastError: any = null;
  const trace: string[] = [];
  
  for (const url of WASM_CDNS) {
    try {
      log(`Attempting WASM download from: ${url}`);
      const response = await fetch(url, { cache: 'no-store', mode: 'cors' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const buffer = await response.arrayBuffer();
      log(`WASM download successful (${buffer.byteLength} bytes)`);
      return new Uint8Array(buffer);
    } catch (err: any) {
      log(`WASM CDN Failed (${url.split('/')[2]}): ${err.message}`);
      trace.push(`${url}: ${err.message}`);
      lastError = err;
    }
  }
  
  const finalError = new Error("Failed to load SQL WASM engine from all available CDNs.");
  (finalError as any).trace = trace;
  throw finalError;
}

const getSqlJsFactory = (module: any) => {
  if (typeof module === 'function') return module;
  if (module.default && typeof module.default === 'function') return module.default;
  if (module.initSqlJs && typeof module.initSqlJs === 'function') return module.initSqlJs;
  return null;
};

export const getDb = async (baseUrl: string): Promise<Database> => {
  if (window.__WALKGIS_RELOADING__) {
    throw { name: 'AbortError', message: 'Page transition in progress' };
  }

  if (dbInstance && currentLoadedUrl === baseUrl) return dbInstance;

  const logs: string[] = [];
  const log = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    const entry = `[${time}] ${msg}`;
    console.log(entry);
    logs.push(entry);
  };

  try {
    log(`Initializing connection to node: ${baseUrl}`);
    
    log("Phase 1: Loading SQL WASM Engine...");
    const wasmBinary = await fetchWasmWithFallback(log);

    log("Phase 2: Resolving SQL.js Factory...");
    const initSqlJs = getSqlJsFactory(SQLJS);
    if (!initSqlJs) {
      log("Error: SQL.js factory resolution failed.");
      throw new Error("Could not find SQL.js init function in module.");
    }
    
    log("Phase 3: Instantiating SQL Engine...");
    const SQL = await initSqlJs({ 
      wasmBinary,
      // Provide locateFile as a backup if needed
      locateFile: (file: string) => WASM_CDNS[0]
    });
    log("Engine instantiated successfully.");

    const dbUrl = `${baseUrl}walkgis.db`;
    log(`Phase 4: Downloading database (${dbUrl})...`);
    const dbResponse = await fetchWithDiagnostics(dbUrl, 'walkgis.db');
    const dbBuffer = await dbResponse.arrayBuffer();
    
    log(`Database download complete. Buffer size: ${dbBuffer.byteLength} bytes.`);
    
    if (dbBuffer.byteLength < 100) {
      log("Error: Database file is suspiciously small.");
      throw new Error(`The file at ${dbUrl} is too small to be a valid SQLite database. Please check if the file exists and is not a 404 page.`);
    }
    
    log("Phase 5: Mounting database into SQL.js memory...");
    const newDb = new SQL.Database(new Uint8Array(dbBuffer));
    
    log("Phase 6: Verifying database structure...");
    try {
      newDb.exec("SELECT count(*) FROM walking_maps");
      log("Structure verification passed.");
    } catch (verifyErr: any) {
      log(`Structure verification failed: ${verifyErr.message}`);
      throw new Error("The database file was loaded but it does not contain the required WalkGIS tables.");
    }

    dbInstance = newDb;
    currentLoadedUrl = baseUrl;
    log("Success: Node connection established and database is ready.");
    
    return dbInstance!;
  } catch (error: any) {
    const errorMsg = error.message || "Unknown initialization error";
    log(`Critical Connection Failure: ${errorMsg}`);
    error.diagnosticLogs = logs;
    error.url = baseUrl;
    throw error;
  }
};

export const queryMaps = async (baseUrl: string) => {
  try {
    const db = await getDb(baseUrl);
    const results = db.exec('SELECT * FROM walking_maps ORDER BY created_at DESC');
    if (results.length === 0) return [];
    const columns = results[0].columns;
    return results[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => obj[col] = row[i]);
      return obj;
    });
  } catch (e) {
    console.error("[dbService] queryMaps error:", e);
    return [];
  }
};

export const queryFeaturesByMap = async (baseUrl: string, mapId: string) => {
  const db = await getDb(baseUrl);
  const sql = `SELECT f.* FROM walking_map_features f JOIN walking_map_relations r ON f.feature_id = r.feature_id WHERE r.map_id = ? ORDER BY r.display_order ASC`;
  const stmt = db.prepare(sql);
  stmt.bind([mapId]);
  const features = [];
  while (stmt.step()) { features.push(stmt.getAsObject()); }
  stmt.free();
  return features;
};

export const queryAllFeatures = async (baseUrl: string) => {
  const db = await getDb(baseUrl);
  const stmt = db.prepare(`SELECT * FROM walking_map_features`);
  const features = [];
  while (stmt.step()) { features.push(stmt.getAsObject()); }
  stmt.free();
  return features;
};

export const searchFeatures = async (baseUrl: string, term: string) => {
  if (!term || term.length < 2) return [];
  try {
    const db = await getDb(baseUrl);
    const stmt = db.prepare(`SELECT feature_id, name FROM walking_map_features WHERE name LIKE ? LIMIT 10`);
    stmt.bind([`%${term}%`]);
    const results = [];
    while (stmt.step()) { results.push(stmt.getAsObject()); }
    stmt.free();
    return results;
  } catch (e) {
    return [];
  }
};
