
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Tooltip } from 'react-leaflet';
import L from 'leaflet';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { queryFeaturesByMap, getDb } from '../services/dbService';
import { WalkingMap } from '../types';
import { FileDown, BookOpen, List, ChevronLeft, Layers, ChevronRight, AlertCircle, RefreshCw, Navigation, Info, FileText } from 'lucide-react';
import { generateKml, downloadFile, resolveMapImagePath, fetchMapMarkdown, getContentBaseUrl } from '../services/contentService';
import { parseWkt } from '../services/geoUtils';

// Fix Leaflet marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface MapDetailProps {
  mapId: string;
  onBack: () => void;
  onSelectFeature: (feature: any) => void;
}

const MapDetail: React.FC<MapDetailProps> = ({ mapId, onBack, onSelectFeature }) => {
  const [mapInfo, setMapInfo] = useState<WalkingMap | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [mapMarkdown, setMapMarkdown] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setStatus('loading');
    try {
      const db = await getDb();
      
      const stmt = db.prepare('SELECT * FROM walking_maps WHERE map_id = ?');
      stmt.bind([mapId]);
      
      if (stmt.step()) {
        const row = stmt.getAsObject() as unknown as WalkingMap;
        setMapInfo(row);
      }
      stmt.free();
      
      const featuresRes = await queryFeaturesByMap(mapId);
      setFeatures(featuresRes);

      const md = await fetchMapMarkdown(mapId);
      setMapMarkdown(md);

      setStatus('ready');
    } catch (err: any) {
      console.error('MapDetail loading error:', err);
      setErrorMsg(err.message || 'Failed to load map data from database.');
      setStatus('error');
    }
  };

  useEffect(() => {
    loadData();
  }, [mapId]);

  const handleExportKML = () => {
    const kml = generateKml(features);
    downloadFile(kml, `${mapInfo?.name || 'map'}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const handleNotebookLMContext = () => {
    const context = `
Map: ${mapInfo?.name}
Description: ${mapInfo?.description}
Total Features: ${features.length}

Features List:
${features.map((f, i) => `${i+1}. ${f.name} (ID: ${f.feature_id})`).join('\n')}
    `;
    const blob = new Blob([context], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${mapInfo?.name}_context.txt`;
    link.click();
  };

  const getCoords = (wkt: any) => {
    const coords = parseWkt(wkt);
    if (coords) return [coords.lat, coords.lng] as [number, number];
    return null;
  };

  if (status === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4">
        <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
        <p className="text-slate-500 animate-pulse font-medium">Loading Archive Details...</p>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-96 p-8 bg-red-50 rounded-2xl border border-red-100 text-center gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <h3 className="text-lg font-bold text-red-900">Oops! Failed to load details</h3>
        <p className="text-sm text-red-700 max-w-md">{errorMsg}</p>
        <div className="flex gap-3">
          <button onClick={onBack} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-semibold">Go Back</button>
          <button onClick={loadData} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-semibold">Try Again</button>
        </div>
      </div>
    );
  }

  const centerFeature = features.find(f => getCoords(f.geometry_wkt));
  const center = centerFeature ? getCoords(centerFeature.geometry_wkt)! : [25.0330, 121.5654] as [number, number];
  const coverUrl = resolveMapImagePath(mapInfo?.cover_image) || `https://picsum.photos/seed/${mapId}/1200/400`;

  const baseUrl = getContentBaseUrl();
  const MarkdownComponents = {
    img: ({ src, alt, ...props }: any) => {
      const isAbsolute = src?.startsWith('http') || src?.startsWith('data:');
      let finalSrc = src;
      if (!isAbsolute && src) {
        try { finalSrc = new URL(src, baseUrl).href; } catch (e) { finalSrc = `${baseUrl}${src}`; }
      }
      return (
        <figure className="my-10 group">
          <div className="overflow-hidden rounded-3xl shadow-sm border border-slate-100 transition-all duration-500 group-hover:shadow-xl group-hover:border-blue-100">
            <img src={finalSrc} alt={alt} className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]" {...props} />
          </div>
          {alt && (
            <figcaption className="text-center mt-4">
              <span className="inline-block h-px w-8 bg-slate-200 mb-2"></span>
              <p className="text-xs font-medium text-slate-400 italic tracking-wide">{alt}</p>
            </figcaption>
          )}
        </figure>
      );
    },
    table: ({ children }: any) => (
      <div className="my-8 overflow-hidden rounded-2xl border border-slate-100 shadow-sm overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-100 m-0">{children}</table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-50/50">{children}</thead>,
    th: ({ children }: any) => <th className="px-5 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">{children}</th>,
    td: ({ children }: any) => <td className="px-5 py-4 text-sm text-slate-600 border-t border-slate-50">{children}</td>,
    blockquote: ({ children }: any) => (
      <blockquote className="relative border-l-0 bg-slate-50 py-8 px-10 rounded-3xl my-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/20"></div>
        <div className="relative z-10 text-slate-700 font-medium leading-relaxed italic">{children}</div>
      </blockquote>
    ),
    h1: ({ children }: any) => <h1 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl font-bold text-slate-800 mt-12 mb-6 tracking-tight flex items-center gap-3">
      <span className="w-1.5 h-6 bg-blue-500/20 rounded-full"></span>{children}
    </h2>,
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-12">
      {/* Dynamic Hero Header */}
      <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-xl group">
        <img 
          src={coverUrl} 
          alt={mapInfo?.name} 
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" 
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        
        <button 
          onClick={onBack} 
          className="absolute top-6 left-6 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white hover:text-slate-900 transition-all shadow-lg active:scale-95"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        <div className="absolute bottom-10 left-10 right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-blue-500 text-white text-[10px] font-black uppercase tracking-widest rounded-md">Archive {mapId}</span>
              <span className="text-slate-300 text-xs font-medium">{features.length} Geo-Features</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">{mapInfo?.name}</h2>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed line-clamp-2">{mapInfo?.description}</p>
          </div>
          
          <div className="flex gap-2">
            <button onClick={handleNotebookLMContext} className="flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-xl text-white font-bold text-xs rounded-2xl hover:bg-white hover:text-indigo-600 transition-all border border-white/20 uppercase tracking-wider shadow-lg">
              <BookOpen className="w-4 h-4" /> Notebook Context
            </button>
            <button onClick={handleExportKML} className="flex items-center gap-2 px-5 py-3 bg-white text-slate-900 font-bold text-xs rounded-2xl hover:bg-blue-50 transition-all border border-transparent uppercase tracking-wider shadow-lg">
              <FileDown className="w-4 h-4 text-blue-600" /> KML Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[500px]">
        {/* Map Section */}
        <div className="flex-[3] bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col group min-h-[400px]">
          <div className="p-5 border-b border-slate-50 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <Layers className="w-4 h-4 text-blue-500" /> 
              Geospatial Explorer
            </h3>
            <div className="flex gap-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
          </div>
          {/* 修正：在手機版給予明確的 400px 高度，在大螢幕則使用 flex-1 填滿 */}
          <div className="h-[400px] lg:h-auto lg:flex-1 relative z-0">
            <MapContainer 
              center={center} 
              zoom={15} 
              scrollWheelZoom={true} 
              className="z-0 h-full w-full"
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {features.map((f) => {
                const pos = getCoords(f.geometry_wkt);
                if (!pos) return null;
                return (
                  <Marker 
                    key={f.feature_id} 
                    position={pos} 
                    title={f.name}
                    eventHandlers={{ click: () => onSelectFeature(f) }}
                  >
                    <Tooltip direction="top" offset={[0, -20]} opacity={0.9} permanent={false}>
                      <span className="font-bold text-slate-900 px-1">{f.name}</span>
                    </Tooltip>
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[180px]">
                        <h4 className="font-black text-slate-900 leading-tight text-base mb-1">{f.name}</h4>
                        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-mono mb-4 uppercase tracking-tighter">
                          <Navigation className="w-2.5 h-2.5" /> {pos[0].toFixed(4)}, {pos[1].toFixed(4)}
                        </div>
                        <button 
                          onClick={() => onSelectFeature(f)} 
                          className="w-full py-2.5 text-center bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-md active:scale-95"
                        >
                          Discover Content <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>

        {/* Feature List Section */}
        <div className="flex-[1] bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex flex-col overflow-hidden max-h-[600px] lg:max-h-none">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
              <List className="w-4 h-4 text-blue-600" /> Manifest
            </h3>
            <span className="text-[10px] font-bold text-slate-400 bg-slate-200/50 px-2 py-0.5 rounded-full">{features.length} POIs</span>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {features.length > 0 ? features.map((f) => (
              <button 
                key={f.feature_id} 
                onClick={() => onSelectFeature(f)} 
                className="w-full text-left p-4 hover:bg-white hover:shadow-md transition-all rounded-2xl flex items-center justify-between group border border-transparent hover:border-slate-100"
              >
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{f.name}</span>
                  <span className="text-[9px] text-slate-400 font-mono mt-1 uppercase tracking-tighter bg-slate-100 group-hover:bg-blue-50 self-start px-1.5 py-0.5 rounded transition-colors">{f.feature_id}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </button>
            )) : (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center gap-4">
                <Info className="w-8 h-8 text-slate-200" />
                <p className="text-slate-400 italic text-xs font-medium uppercase tracking-widest">Archive is empty</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Map Markdown Content Section */}
      {mapMarkdown && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden animate-in slide-in-from-top-4 duration-700">
          <div className="p-8 border-b border-slate-50 bg-slate-50/30 flex items-center gap-3">
             <div className="p-2.5 bg-blue-100 rounded-2xl text-blue-600">
                <FileText className="w-5 h-5" />
             </div>
             <div>
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1">Detailed Reference</h3>
               <p className="text-lg font-bold text-slate-900 leading-none">Map Overview</p>
             </div>
          </div>
          <div className="p-8 sm:p-12 lg:p-16">
            <article className="prose prose-slate prose-lg max-w-none 
              prose-p:text-slate-600 prose-p:leading-[1.8]
              prose-a:text-blue-600 prose-a:font-bold prose-a:no-underline hover:prose-a:underline
              prose-strong:text-slate-900 prose-strong:font-bold
              prose-li:text-slate-600
              prose-img:m-0">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                components={MarkdownComponents}
              >
                {mapMarkdown}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDetail;
