
import React, { useState, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import MapDetail from './pages/MapDetail';
import FeatureModal from './components/FeatureModal';
import { getDb } from './services/dbService';
import { AlertCircle, RefreshCw } from 'lucide-react';
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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorDetails, setErrorDetails] = useState<any>(null);

  const syncStateFromParams = useCallback(async (db: any, params: URLSearchParams) => {
    if (!db) return;
    try {
      const mapId = params.get('map');
      const featureId = params.get('feature');

      if (mapId) {
        setSelectedMapId(mapId);
        setCurrentView('map-detail');
      } else {
        setSelectedMapId(null);
        setCurrentView('home');
      }

      if (featureId) {
        try {
          const stmt = db.prepare('SELECT * FROM walking_map_features WHERE feature_id = ?');
          stmt.bind([featureId]);
          if (stmt.step()) {
            const feat = stmt.getAsObject();
            setSelectedFeature(feat);
            setIsModalOpen(true);
          }
          stmt.free();
        } catch (e) {
          console.error("URL feature sync error:", e);
        }
      } else {
        setSelectedFeature(null);
        setIsModalOpen(false);
      }
    } catch (e) {
      console.warn("State sync failed:", e);
    }
  }, []);

  const syncStateFromUrl = useCallback(async (db: any) => {
    const params = new URLSearchParams(window.location.search);
    await syncStateFromParams(db, params);
  }, [syncStateFromParams]);

  // 監聽導航事件
  useEffect(() => {
    const handleNavigation = async (event: any) => {
      try {
        const db = await getDb(baseUrl).catch(() => null);
        if (!db) return;

        if (event.type === 'popstate') {
          syncStateFromUrl(db);
        } else if (event.type === 'internal-navigation') {
          // 處理來自 Markdown 的點擊
          const href = event.detail?.href || "";
          const params = new URLSearchParams(href.startsWith('?') ? href : `?${href}`);
          syncStateFromParams(db, params);
        }
      } catch (err) {
        console.error("Navigation sync failed:", err);
      }
    };

    window.addEventListener('popstate', handleNavigation);
    window.addEventListener('internal-navigation' as any, handleNavigation);
    return () => {
      window.removeEventListener('popstate', handleNavigation);
      window.removeEventListener('internal-navigation' as any, handleNavigation);
    };
  }, [baseUrl, syncStateFromUrl, syncStateFromParams]);

  useEffect(() => {
    if (dbStatus === 'ready') {
      getDb(baseUrl).then(db => syncStateFromUrl(db)).catch(() => {});
    }
  }, [dbStatus, baseUrl, syncStateFromUrl]);

  const updateUrl = (mapId: string | null, featureId: string | null) => {
    // 嚴格檢查，如果在 blob 或 restricted 環境下不執行 pushState
    if (window.location.protocol === 'blob:') return;
    
    try {
      const params = new URLSearchParams(window.location.search);
      if (mapId) params.set('map', mapId); else params.delete('map');
      if (featureId) params.set('feature', featureId); else params.delete('feature');
      const search = params.toString();
      const newUrl = `${window.location.pathname}${search ? '?' + search : ''}`;
      
      if (window.location.search !== `?${search}` && window.location.search !== search) {
        window.history.pushState({ mapId, featureId }, '', newUrl);
      }
    } catch (e) {
      // 捕獲 SecurityError 但不報錯，讓應用程式繼續運行
      console.warn("URL update suppressed due to environment restrictions.");
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

  const handleSearchSelect = async (featureId: string) => {
    try {
      const db = await getDb(baseUrl);
      const stmt = db.prepare('SELECT * FROM walking_map_features WHERE feature_id = ?');
      stmt.bind([featureId]);
      if (stmt.step()) {
        const obj = stmt.getAsObject();
        setSelectedFeature(obj);
        setIsModalOpen(true);
        updateUrl(selectedMapId, featureId);
      }
      stmt.free();
    } catch (e) {}
  };

  const handleSelectMap = (id: string) => {
    setSelectedMapId(id);
    setCurrentView('map-detail');
    updateUrl(id, null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSelectFeature = (feature: any, showModal: boolean = true) => {
    setSelectedFeature(feature);
    setIsModalOpen(showModal);
    updateUrl(selectedMapId, feature.feature_id);
  };

  const handleCloseFeature = () => {
    setIsModalOpen(false);
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setSelectedMapId(null);
    setSelectedFeature(null);
    setIsModalOpen(false);
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
        <div className="max-w-3xl mx-auto mt-12 p-6 sm:p-10 bg-white border border-slate-200 rounded-[3rem] shadow-2xl">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-red-50 rounded-3xl"><AlertCircle className="w-12 h-12 text-red-500" /></div>
            <h2 className="text-2xl font-black text-slate-900">Connection Failed</h2>
            <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg">
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
          </div>
        </div>
      );
    }
    if (currentView === 'home') return <Home onSelectMap={handleSelectMap} onSelectFeature={handleSelectFeature} />;
    if (currentView === 'map-detail' && selectedMapId !== null) return (
      <MapDetail 
        mapId={selectedMapId} 
        onBack={handleGoHome} 
        onSelectFeature={handleSelectFeature} 
        selectedFeature={selectedFeature} 
      />
    );
    return null;
  };

  return (
    <Layout onSearchSelect={handleSearchSelect} onGoHome={handleGoHome}>
      {renderContent()}
      {selectedFeature && isModalOpen && (
        <FeatureModal feature={selectedFeature} onClose={handleCloseFeature} />
      )}
    </Layout>
  );
};

const App: React.FC = () => (
  <DataSourceProvider>
    <AppContent />
  </DataSourceProvider>
);

export default App;
