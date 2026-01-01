
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import MapDetail from './pages/MapDetail';
import FeatureModal from './components/FeatureModal';
import { getDb } from './services/dbService';
import { AlertCircle, RefreshCw, Terminal, Globe, ChevronDown, ChevronUp, Copy, Check } from 'lucide-react';
import { DataSourceProvider, useDataSource } from './contexts/DataSourceContext';

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    __WALKGIS_RELOADING__?: boolean;
  }
}

const AppContent: React.FC = () => {
  const { baseUrl, isLoading: isContextLoading, isSwitching } = useDataSource();
  const [currentView, setCurrentView] = useState<'home' | 'map-detail'>('home');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [showFullLogs, setShowFullLogs] = useState(true);
  const [copied, setCopied] = useState(false);

  // 解析 URL 參數並同步狀態
  const syncStateFromUrl = useCallback(async (db: any) => {
    try {
      const params = new URLSearchParams(window.location.search);
      const mapId = params.get('map');
      const featureId = params.get('feature');

      if (mapId) {
        setSelectedMapId(mapId);
        setCurrentView('map-detail');
      } else {
        setSelectedMapId(null);
        setCurrentView('home');
      }

      if (featureId && db) {
        try {
          const stmt = db.prepare('SELECT * FROM walking_map_features WHERE feature_id = ?');
          stmt.bind([featureId]);
          if (stmt.step()) {
            setSelectedFeature(stmt.getAsObject());
          }
          stmt.free();
        } catch (e) {
          console.error("URL feature sync error:", e);
        }
      } else {
        setSelectedFeature(null);
      }
    } catch (e) {
      console.warn("URL sync failed:", e);
    }
  }, []);

  // 當 DB 準備好時，進行初次同步
  useEffect(() => {
    if (dbStatus === 'ready') {
      getDb(baseUrl).then(db => syncStateFromUrl(db));
    }
  }, [dbStatus, baseUrl, syncStateFromUrl]);

  // 監聽瀏覽器前進後退
  useEffect(() => {
    const handlePopState = async () => {
      const db = await getDb(baseUrl).catch(() => null);
      syncStateFromUrl(db);
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [baseUrl, syncStateFromUrl]);

  // 更新 URL 輔助函數
  const updateUrl = (mapId: string | null, featureId: string | null) => {
    // 預防在 blob: 環境或是某些沙盒環境下 History API 噴錯
    if (window.location.protocol === 'blob:') return;

    try {
      const params = new URLSearchParams(window.location.search);
      if (mapId) params.set('map', mapId); else params.delete('map');
      if (featureId) params.set('feature', featureId); else params.delete('feature');
      
      const search = params.toString();
      const newUrl = `${window.location.pathname}${search ? '?' + search : ''}`;
      
      window.history.pushState({ mapId, featureId }, '', newUrl);
    } catch (e) {
      console.warn("Failed to update URL history state (likely restricted environment):", e);
    }
  };

  useEffect(() => {
    if (!baseUrl || isSwitching || window.__WALKGIS_RELOADING__) return;
    
    let isMounted = true;
    setDbStatus('loading');
    setErrorDetails(null);

    getDb(baseUrl)
      .then(() => {
        if (isMounted && !window.__WALKGIS_RELOADING__) {
          setDbStatus('ready');
        }
      })
      .catch((err) => {
        if (err.name === 'AbortError' || window.__WALKGIS_RELOADING__) return;
        if (isMounted) {
          setDbStatus('error');
          setErrorDetails({
            message: err.message || "Unknown connection error",
            diagnosticLogs: err.diagnosticLogs || [],
            url: err.url || baseUrl
          });
        }
      });

    return () => { isMounted = false; };
  }, [baseUrl, isSwitching]);

  const copyToClipboard = () => {
    const report = {
      url: errorDetails?.url || baseUrl,
      message: errorDetails?.message,
      logs: errorDetails?.diagnosticLogs || [],
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString()
    };
    navigator.clipboard.writeText(JSON.stringify(report, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSearchSelect = async (featureId: string) => {
    try {
      const db = await getDb(baseUrl);
      const stmt = db.prepare('SELECT * FROM walking_map_features WHERE feature_id = ?');
      stmt.bind([featureId]);
      if (stmt.step()) {
        const obj = stmt.getAsObject();
        setSelectedFeature(obj);
        // 搜尋結果同步到 URL
        updateUrl(selectedMapId, featureId);
      }
      stmt.free();
    } catch (e) {
      console.error("Search selection error:", e);
    }
  };

  const handleSelectMap = (id: string) => {
    setSelectedMapId(id);
    setCurrentView('map-detail');
    updateUrl(id, null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFeature = (feature: any) => {
    setSelectedFeature(feature);
    updateUrl(selectedMapId, feature.feature_id);
  };

  const handleCloseFeature = () => {
    setSelectedFeature(null);
    updateUrl(selectedMapId, null);
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setSelectedMapId(null);
    setSelectedFeature(null);
    updateUrl(null, null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    if (isSwitching || window.__WALKGIS_RELOADING__) {
      return (
        <div className="fixed inset-0 z-[5000] bg-slate-900 flex flex-col items-center justify-center gap-6">
          <RefreshCw className="w-16 h-16 animate-spin text-blue-400" />
          <div className="text-center space-y-2">
            <h2 className="text-white text-xl font-black uppercase tracking-[0.2em]">Switching Node</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">Synchronizing Storage...</p>
          </div>
        </div>
      );
    }

    if (isContextLoading || dbStatus === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-slate-900 font-black tracking-[0.2em] uppercase text-sm">Connecting to Node...</p>
        </div>
      );
    }

    if (dbStatus === 'error') {
      return (
        <div className="max-w-3xl mx-auto mt-12 p-6 sm:p-10 bg-white border border-slate-200 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-red-50 rounded-3xl"><AlertCircle className="w-12 h-12 text-red-500" /></div>
            <h2 className="text-2xl font-black text-slate-900">Connection Failed</h2>
            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'home') return <Home onSelectMap={handleSelectMap} onSelectFeature={handleSelectFeature} />;
    if (currentView === 'map-detail' && selectedMapId !== null) return <MapDetail mapId={selectedMapId} onBack={handleGoHome} onSelectFeature={handleSelectFeature} />;
    return null;
  };

  return (
    <Layout onSearchSelect={handleSearchSelect} onGoHome={handleGoHome}>
      {renderContent()}
      {selectedFeature && <FeatureModal feature={selectedFeature} onClose={handleCloseFeature} />}
    </Layout>
  );
};

const App: React.FC = () => (
  <DataSourceProvider>
    <AppContent />
  </DataSourceProvider>
);

export default App;
