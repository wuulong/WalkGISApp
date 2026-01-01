
/**
 * 解析 WKT 格式的經緯度
 * 格式範例: POINT(121.5654 25.0330)
 */
export const parseWkt = (wkt: string | undefined): { lat: number; lng: number } | null => {
  if (!wkt || typeof wkt !== 'string') return null;
  const match = wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  if (match) {
    return {
      lng: parseFloat(match[1]),
      lat: parseFloat(match[2])
    };
  }
  return null;
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
