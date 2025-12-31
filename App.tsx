
import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Home from './pages/Home';
import MapDetail from './pages/MapDetail';
import FeatureModal from './components/FeatureModal';
import { getDb } from './services/dbService';
import { Loader2, AlertCircle } from 'lucide-react';

type View = 'home' | 'map-detail';

// 定義全域 gtag 函數型別
declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
  }
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>('home');
  const [selectedMapId, setSelectedMapId] = useState<string | null>(null);
  const [selectedFeature, setSelectedFeature] = useState<any>(null);
  const [dbStatus, setDbStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  // 初始化資料庫
  useEffect(() => {
    getDb()
      .then(() => setDbStatus('ready'))
      .catch((err) => {
        setDbStatus('error');
        setErrorMsg(err.message || 'Unknown error occurred while loading database.');
      });
  }, []);

  // 頁面追蹤邏輯 (Google Analytics SPA Tracking)
  useEffect(() => {
    if (typeof window.gtag === 'function') {
      const pagePath = currentView === 'home' ? '/' : `/map/${selectedMapId || 'unknown'}`;
      const pageTitle = currentView === 'home' ? 'WalkGIS - Home' : `WalkGIS - Map ${selectedMapId}`;

      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_title: pageTitle,
      });
      
      console.debug(`[Analytics] Tracked page view: ${pagePath}`);
    }
  }, [currentView, selectedMapId]);

  const handleSearchSelect = async (featureId: string) => {
    try {
      const db = await getDb();
      const stmt = db.prepare('SELECT * FROM walking_map_features WHERE feature_id = ?');
      stmt.bind([featureId]);
      
      if (stmt.step()) {
        const obj = stmt.getAsObject();
        setSelectedFeature(obj);
        
        // 追蹤搜尋點擊事件
        window.gtag?.('event', 'search_select', {
          feature_id: featureId,
          feature_name: obj.name
        });
      }
      stmt.free();
    } catch (e) {
      console.error("Search selection error:", e);
    }
  };

  const handleGoHome = () => {
    setCurrentView('home');
    setSelectedMapId(null);
    setSelectedFeature(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    if (dbStatus === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-blue-500" />
          <p className="text-slate-500 font-medium">Bootstrapping SQLite WebAssembly...</p>
        </div>
      );
    }

    if (dbStatus === 'error') {
      return (
        <div className="max-w-2xl mx-auto mt-20 p-8 bg-red-50 border border-red-100 rounded-3xl text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h2 className="text-xl font-bold text-red-900">Database Connection Failed</h2>
          <p className="text-red-700 text-sm">
            The application could not find or access the SQLite database file. 
          </p>
          <div className="text-left bg-white p-4 rounded-xl border border-red-200 text-xs font-mono text-red-800 break-all overflow-x-auto">
            {errorMsg}
          </div>
          <div className="pt-4 flex flex-col sm:flex-row gap-3 justify-center">
            <button onClick={() => window.location.reload()} className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">
              Retry Load
            </button>
          </div>
        </div>
      );
    }

    if (currentView === 'home') {
      return (
        <Home 
          onSelectMap={(id) => {
            setSelectedMapId(id);
            setCurrentView('map-detail');
          }} 
          onSelectFeature={(f) => {
            setSelectedFeature(f);
            // 追蹤景點點擊
            window.gtag?.('event', 'feature_view', {
              feature_id: f.feature_id,
              feature_name: f.name,
              source: 'radar'
            });
          }}
        />
      );
    }

    if (currentView === 'map-detail' && selectedMapId !== null) {
      return (
        <MapDetail 
          mapId={selectedMapId} 
          onBack={handleGoHome}
          onSelectFeature={(f) => {
            setSelectedFeature(f);
            // 追蹤景點點擊
            window.gtag?.('event', 'feature_view', {
              feature_id: f.feature_id,
              feature_name: f.name,
              source: 'map_detail'
            });
          }}
        />
      );
    }

    return null;
  };

  return (
    <Layout 
      onSearchSelect={handleSearchSelect} 
      onGoHome={handleGoHome}
    >
      {renderContent()}
      
      {selectedFeature && (
        <FeatureModal 
          feature={selectedFeature} 
          onClose={() => setSelectedFeature(null)} 
        />
      )}
    </Layout>
  );
};

export default App;
