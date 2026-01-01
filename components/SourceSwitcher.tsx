
import React, { useState, useEffect } from 'react';
import { X, Globe, Link2, Check, AlertCircle, Loader2, Server, Award, PlusCircle, Terminal, RefreshCw } from 'lucide-react';
import { fetchMarketRegistry, validateDataSource } from '../services/marketService';
import { MarketSource } from '../types';
import { useDataSource } from '../contexts/DataSourceContext';

interface SourceSwitcherProps {
  onClose: () => void;
}

const SourceSwitcher: React.FC<SourceSwitcherProps> = ({ onClose }) => {
  const { baseUrl, setBaseUrl, isSwitching: globalIsSwitching } = useDataSource();
  const [activeTab, setActiveTab] = useState<'market' | 'custom'>('market');
  const [marketSources, setMarketSources] = useState<MarketSource[]>([]);
  const [customUrl, setCustomUrl] = useState('');
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [error, setError] = useState<{message: string, url: string} | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    fetchMarketRegistry().then(sources => {
      if (isMounted) {
        setMarketSources(sources);
        setLoading(false);
      }
    });
    return () => { isMounted = false; };
  }, []);

  const handleConnect = async (url: string, id: string = 'custom') => {
    if (!url || globalIsSwitching) return;
    
    setValidatingId(id);
    setError(null);
    
    let target = url.trim();
    if (!target.startsWith('http')) target = `https://${target}`;
    if (!target.endsWith('/')) target = `${target}/`;
    
    const dbUrl = `${target}walkgis.db`;
    
    try {
      const isValid = await validateDataSource(target);
      
      if (isValid) {
        // 交給 Context 處理重整與全域 Loading
        setBaseUrl(target);
      } else {
        setError({
          message: `無法存取資料庫檔案。這可能是因為：1. 網址輸入錯誤 2. 檔案不存在 3. 伺服器拒絕跨網域連線 (CORS)。`,
          url: dbUrl
        });
        setValidatingId(null);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError({ message: "連線測試時發生未預期的錯誤。", url: dbUrl });
      setValidatingId(null);
    }
  };

  // 如果全域正在切換，則由 App.tsx 的全域 Loading 處理，此組件會隨之關閉或隱藏
  if (globalIsSwitching) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8">
        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-2xl text-white">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900 leading-none mb-1">Data Source</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Node Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-xl transition-colors">
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex p-2 bg-slate-100 mx-8 mt-6 rounded-2xl">
          <button 
            onClick={() => { setActiveTab('market'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'market' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Globe className="w-4 h-4" /> Market
          </button>
          <button 
            onClick={() => { setActiveTab('custom'); setError(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === 'custom' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Link2 className="w-4 h-4" /> Custom Node
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
          {error && (
            <div className="mb-6 space-y-3 animate-in shake duration-500">
              <div className="flex items-start gap-3 px-5 py-4 bg-red-50 text-red-600 rounded-2xl border border-red-100">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-xs font-bold leading-tight">{error.message}</p>
                  <div className="p-3 bg-red-100/50 rounded-xl border border-red-200/50 flex flex-col gap-1">
                    <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-400">
                      <Terminal className="w-3 h-3" /> Endpoint:
                    </div>
                    <code className="text-[10px] font-mono break-all leading-relaxed font-bold">
                      {error.url}
                    </code>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'market' ? (
            <div className="space-y-4">
              {loading ? (
                <div className="py-12 flex flex-col items-center gap-4 text-slate-300">
                  <Loader2 className="w-8 h-8 animate-spin" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Fetching Registry...</p>
                </div>
              ) : (
                marketSources.map(source => {
                  const isActive = baseUrl === source.url || baseUrl === `${source.url}/`;
                  const isConnecting = validatingId === source.id;
                  
                  return (
                    <div 
                      key={source.id} 
                      className={`group p-5 rounded-[2rem] border transition-all flex items-center gap-5 ${
                        isActive ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-300 hover:shadow-md'
                      }`}
                    >
                      <div className="w-16 h-16 rounded-2xl overflow-hidden bg-slate-100 shrink-0">
                        {source.cover_image ? (
                          <img src={source.cover_image} className="w-full h-full object-cover" alt="" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-300">
                            <Server className="w-6 h-6" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-black text-slate-900 truncate">{source.name}</h3>
                          {source.id === 'official' && <Award className="w-3 h-3 text-blue-500 fill-blue-50" />}
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mb-2">{source.description}</p>
                      </div>
                      {isActive ? (
                        <div className="px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase flex items-center gap-1.5">
                          <Check className="w-3 h-3" /> Connected
                        </div>
                      ) : (
                        <button 
                          onClick={() => handleConnect(source.url, source.id)}
                          disabled={!!validatingId}
                          className="px-4 py-2 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all disabled:opacity-50 min-w-[80px] flex justify-center items-center gap-2"
                        >
                          {isConnecting ? <Loader2 className="w-3 h-3 animate-spin" /> : "Connect"}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
                <h4 className="text-sm font-bold text-blue-900 mb-2 flex items-center gap-2">
                  <Award className="w-4 h-4 text-blue-600" /> Decentralized Access
                </h4>
                <p className="text-xs text-blue-700 leading-relaxed">
                  輸入任何包含 <code className="bg-blue-100 px-1 rounded">walkgis.db</code> 檔案的 GitHub Pages 網址，即可瞬間切換地圖上下文。
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">Endpoint URL</label>
                <div className="relative">
                  <input 
                    type="url" 
                    placeholder="https://username.github.io/my-map/"
                    className="w-full pl-6 pr-36 py-4 bg-slate-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm font-medium"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleConnect(customUrl)}
                  />
                  <button 
                    onClick={() => handleConnect(customUrl)}
                    disabled={!customUrl || !!validatingId}
                    className="absolute right-2 top-2 bottom-2 px-6 bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all disabled:opacity-30 flex items-center gap-2"
                  >
                    {validatingId === 'custom' ? <Loader2 className="w-3 h-3 animate-spin" /> : <PlusCircle className="w-3 h-3" />}
                    Mount Node
                  </button>
                </div>
              </div>

              <div className="pt-4 flex flex-col gap-2">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-4">Active Context</p>
                <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl font-mono text-[10px] text-slate-500 break-all">
                  {baseUrl}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <p className="text-[10px] text-slate-400 max-w-xs leading-relaxed">
            Data is fetched directly from the node. No private data is ever sent to our servers.
          </p>
          <button onClick={onClose} className="px-6 py-2.5 text-xs font-black uppercase tracking-widest text-slate-600 hover:text-slate-900">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default SourceSwitcher;
