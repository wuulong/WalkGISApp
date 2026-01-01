
import React, { useState, useEffect } from 'react';
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

  useEffect(() => {
    // 嚴格攔截：如果正在切換或即將重整，不執行任何初始化
    if (!baseUrl || isSwitching || window.__WALKGIS_RELOADING__) {
      return;
    }
    
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
        // 如果是在準備重整時拋出的錯誤，安靜處理
        if (err.name === 'AbortError' || window.__WALKGIS_RELOADING__) {
          return;
        }

        if (isMounted) {
          console.error("[App] Connection Lifecycle Failed:", err);
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
    if (isSwitching || window.__WALKGIS_RELOADING__) {
      return (
        <div className="fixed inset-0 z-[5000] bg-slate-900 flex flex-col items-center justify-center gap-6">
          <RefreshCw className="w-16 h-16 animate-spin text-blue-400" />
          <div className="text-center space-y-2">
            <h2 className="text-white text-xl font-black uppercase tracking-[0.2em]">Switching Node</h2>
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest animate-pulse">
              Synchronizing Storage...
            </p>
          </div>
        </div>
      );
    }

    if (isContextLoading || dbStatus === 'loading') {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500 blur-2xl opacity-20 animate-pulse"></div>
            <RefreshCw className="w-12 h-12 animate-spin text-blue-500 relative z-10" />
          </div>
          <div className="text-center space-y-2">
            <p className="text-slate-900 font-black tracking-[0.2em] uppercase text-sm">
              Connecting to Node...
            </p>
            <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">
              Please wait while we initialize SQLite WASM
            </p>
          </div>
        </div>
      );
    }

    if (dbStatus === 'error') {
      return (
        <div className="max-w-3xl mx-auto mt-12 p-6 sm:p-10 bg-white border border-slate-200 rounded-[3rem] shadow-2xl animate-in slide-in-from-bottom-8">
          <div className="flex flex-col items-center text-center space-y-6">
            <div className="p-4 bg-red-50 rounded-3xl">
              <AlertCircle className="w-12 h-12 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h2 className="text-2xl font-black text-slate-900">Connection Failed</h2>
              <p className="text-slate-500 text-xs max-w-md mx-auto leading-relaxed">
                {errorDetails?.message || 'We could not establish a connection to the data node.'}
              </p>
            </div>

            <div className="w-full space-y-4">
              <div className="bg-slate-900 rounded-3xl p-6 text-left overflow-hidden shadow-inner border border-slate-800">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Diagnostic Trace</span>
                  </div>
                  <div className="flex gap-4">
                    <button 
                      onClick={copyToClipboard}
                      className="text-[9px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      {copied ? <><Check className="w-3 h-3 text-emerald-500"/> Copied!</> : <><Copy className="w-3 h-3"/> Copy Report</>}
                    </button>
                    <button 
                      onClick={() => setShowFullLogs(!showFullLogs)}
                      className="text-[9px] font-black uppercase text-slate-500 hover:text-white flex items-center gap-1.5 transition-colors"
                    >
                      {showFullLogs ? <><ChevronUp className="w-3 h-3"/> Hide</> : <><ChevronDown className="w-3 h-3"/> Details</>}
                    </button>
                  </div>
                </div>
                
                <div className="space-y-3">
                   <div className="text-[10px] text-emerald-500 font-mono bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                     TARGET: <span className="text-slate-300 break-all">{errorDetails?.url || baseUrl}</span>
                   </div>
                   {showFullLogs && (
                     <div className="mt-4 border-t border-slate-800 pt-4 max-h-60 overflow-y-auto custom-scrollbar">
                       {errorDetails?.diagnosticLogs && errorDetails.diagnosticLogs.length > 0 ? (
                         errorDetails.diagnosticLogs.map((log: string, i: number) => (
                           <div key={i} className="text-[10px] font-mono text-slate-400 py-1 border-b border-slate-800/50 last:border-none">
                             {log}
                           </div>
                         ))
                       ) : (
                         <div className="text-[10px] font-mono text-slate-600 italic">No initialization logs captured. Check browser console (F12) for detailed network error info.</div>
                       )}
                     </div>
                   )}
                </div>
              </div>

              <div className="bg-blue-50/50 rounded-3xl p-6 text-left border border-blue-100/50">
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-4 h-4 text-blue-600" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Troubleshooting</span>
                </div>
                <ul className="text-xs text-blue-800 space-y-2 list-disc ml-4 font-medium opacity-80">
                  <li>Verify if <code className="bg-blue-100/50 px-1 rounded">walkgis.db</code> is accessible at the target URL.</li>
                  <li>Check for CORS issues (the node must allow requests from this domain).</li>
                  <li>If using GitHub Pages, ensure the repository is public and the URL is correct.</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-wrap gap-3 justify-center pt-4">
              <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-blue-600 transition-all active:scale-95 shadow-lg">
                <RefreshCw className="w-4 h-4" /> Try Again
              </button>
              <button 
                onClick={() => { localStorage.removeItem('walkgis_current_source'); window.location.reload(); }} 
                className="px-8 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all active:scale-95"
              >
                Reset to Default
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (currentView === 'home') return <Home onSelectMap={(id) => { setSelectedMapId(id); setCurrentView('map-detail'); }} onSelectFeature={(f) => setSelectedFeature(f)} />;
    if (currentView === 'map-detail' && selectedMapId !== null) return <MapDetail mapId={selectedMapId} onBack={handleGoHome} onSelectFeature={(f) => setSelectedFeature(f)} />;
    return null;
  };

  return (
    <Layout onSearchSelect={handleSearchSelect} onGoHome={handleGoHome}>
      {renderContent()}
      {selectedFeature && <FeatureModal feature={selectedFeature} onClose={() => setSelectedFeature(null)} />}
    </Layout>
  );
};

const App: React.FC = () => (
  <DataSourceProvider>
    <AppContent />
  </DataSourceProvider>
);

export default App;
