
/**
 * 座標自動糾錯：
 * 在台灣與多數 GIS 資料中，常發生經緯度反轉（WKT 應為 Lng Lat，但資料給 Lat Lng）。
 * 如果 Lat 絕對值 > 90 且 Lng 絕對值 <= 90，則判定為反轉，自動交換。
 */
const validateAndFixCoords = (lng: number, lat: number): { lat: number; lng: number } => {
  let finalLat = lat;
  let finalLng = lng;

  // 檢查是否反轉 (Latitude 不可能超過 90)
  if (Math.abs(lat) > 90 && Math.abs(lng) <= 90) {
    finalLat = lng;
    finalLng = lat;
  }

  return { lat: finalLat, lng: finalLng };
};

/**
 * 解析 WKT 格式的座標
 * 支援: 
 * - POINT(121.5 25.0)
 * - POINT Z (121.5 25.0 10)
 */
export const parseWkt = (wkt: string | undefined): { lat: number; lng: number } | null => {
  if (!wkt || typeof wkt !== 'string') return null;
  
  // 支援 POINT, POINT Z, POINT M, POINT ZM 以及寬鬆空白
  const match = wkt.match(/POINT\s*(?:Z|M|ZM)?\s*\(\s*([-\d.]+)\s+([-\d.]+)(?:\s+[-\d.]+)?\s*\)/i);
  if (match) {
    const lng = parseFloat(match[1]);
    const lat = parseFloat(match[2]);
    return validateAndFixCoords(lng, lat);
  }
  return null;
};

/**
 * 解析 LINESTRING WKT 為 Leaflet 座標數組 [lat, lng][]
 * 支援 3D 座標並自動過濾無效點
 */
export const parseLineWkt = (wkt: string | undefined): [number, number][] | null => {
  if (!wkt || typeof wkt !== 'string') return null;
  
  // 支援 LINESTRING, LINESTRING Z, LINESTRING M, LINESTRING ZM
  const match = wkt.match(/LINESTRING\s*(?:Z|M|ZM)?\s*\(([^)]+)\)/i);
  if (!match) return null;

  const pointsStr = match[1].split(',');
  const coords: [number, number][] = pointsStr.map(pair => {
    const parts = pair.trim().split(/\s+/).map(parseFloat);
    if (parts.length < 2) return null;
    
    const { lat, lng } = validateAndFixCoords(parts[0], parts[1]);
    return [lat, lng] as [number, number];
  }).filter((coord): coord is [number, number] => coord !== null && !isNaN(coord[0]) && !isNaN(coord[1]));

  return coords.length > 0 ? coords : null;
};

/**
 * 使用 Haversine 公式計算地球兩點間的直線距離 (單位: 公尺)
 */
export const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371e3; // 地球半徑 (公尺)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};

/**
 * 格式化距離顯示
 */
export const formatDistance = (meters: number): string => {
  if (meters < 1000) {
    return `${Math.round(meters)}m`;
  }
  return `${(meters / 1000).toFixed(1)}km`;
};
