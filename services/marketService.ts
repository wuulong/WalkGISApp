
import { MarketSource } from '../types';

const MARKET_REGISTRY_URL = 'https://wuulong.github.io/wuulong-notes-blog/walkgis_prj/market.json';

export const fetchMarketRegistry = async (): Promise<MarketSource[]> => {
  try {
    const response = await fetch(MARKET_REGISTRY_URL, { cache: 'no-store' });
    if (!response.ok) throw new Error('Failed to fetch market registry');
    const data = await response.json();
    return data.sources || [];
  } catch (error) {
    console.error('[Market] Registry fetch error:', error);
    return [];
  }
};

/**
 * 驗證資料節點是否有效
 */
export const validateDataSource = async (url: string): Promise<boolean> => {
  const target = url.endsWith('/') ? url : `${url}/`;
  const dbUrl = `${target}walkgis.db?t=${Date.now()}`;
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    // 使用最穩定的 GET，並在收到 Header 後立即關閉 ReadableStream
    // 這在 GitHub Pages 上比 Range 請求更穩定
    const response = await fetch(dbUrl, { 
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store'
    });
    
    clearTimeout(timeoutId);

    if (response.ok) {
      // 讀取器一旦拿到立刻取消，節省流量
      if (response.body) {
        const reader = response.body.getReader();
        await reader.cancel();
      }
      return true;
    }
    
    return false;
  } catch (err: any) {
    // 忽略 AbortError
    if (err.name === 'AbortError') return true;
    console.warn(`[Validation] Node check failed: ${url}`, err);
    return false;
  }
};
