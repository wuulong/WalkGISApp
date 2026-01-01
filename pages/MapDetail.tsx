
import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { queryFeaturesByMap, getDb } from '../services/dbService';
import { WalkingMap } from '../types';
import { FileDown, List, ChevronLeft, ChevronRight, RefreshCw, BookOpen } from 'lucide-react';
import { generateKml, generateNotebookContext, downloadFile, resolveMapImagePath, fetchMapMarkdown, getContentBaseUrl } from '../services/contentService';
import { parseWkt } from '../services/geoUtils';
import { useDataSource } from '../contexts/DataSourceContext';

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
  const { baseUrl } = useDataSource();
  const [mapInfo, setMapInfo] = useState<WalkingMap | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [mapMarkdown, setMapMarkdown] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  const loadData = async () => {
    setStatus('loading');
    try {
      const db = await getDb(baseUrl);
      const stmt = db.prepare('SELECT * FROM walking_maps WHERE map_id = ?');
      stmt.bind([mapId]);
      if (stmt.step()) setMapInfo(stmt.getAsObject() as unknown as WalkingMap);
      stmt.free();
      
      const featuresRes = await queryFeaturesByMap(baseUrl, mapId);
      setFeatures(featuresRes);

      const md = await fetchMapMarkdown(baseUrl, mapId);
      setMapMarkdown(md);
      setStatus('ready');
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to load map data.');
      setStatus('error');
    }
  };

  useEffect(() => { loadData(); }, [mapId, baseUrl]);

  const handleExportKML = () => {
    const kml = generateKml(features);
    downloadFile(kml, `${mapInfo?.name || 'map'}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const handleExportNotebook = () => {
    if (!mapInfo) return;
    const content = generateNotebookContext(mapInfo, features, mapMarkdown);
    downloadFile(content, `${mapInfo.name}_AI_Context.txt`, 'text/plain');
  };

  const getCoords = (wkt: any) => {
    const coords = parseWkt(wkt);
    return coords ? [coords.lat, coords.lng] as [number, number] : null;
  };

  if (status === 'loading') return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
      <p className="text-slate-500 animate-pulse font-medium">Loading Archive Details...</p>
    </div>
  );

  const centerFeature = features.find(f => getCoords(f.geometry_wkt));
  const center = centerFeature ? getCoords(centerFeature.geometry_wkt)! : [25.0330, 121.5654] as [number, number];
  const coverUrl = resolveMapImagePath(baseUrl, mapInfo?.cover_image) || `https://picsum.photos/seed/${mapId}/1200/400`;
  const markdownBase = getContentBaseUrl(baseUrl);

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-12">
      <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-xl group">
        <img src={coverUrl} alt={mapInfo?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white hover:text-slate-900 transition-all shadow-lg active:scale-95"><ChevronLeft className="w-6 h-6" /></button>
        <div className="absolute bottom-10 left-10 right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">{mapInfo?.name}</h2>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed line-clamp-2">{mapInfo?.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportNotebook} className="flex items-center gap-2 px-5 py-3 bg-slate-800 text-white font-bold text-xs rounded-2xl hover:bg-slate-700 transition-all border border-slate-700 uppercase tracking-wider shadow-lg">
              <BookOpen className="w-4 h-4 text-emerald-400" /> Notebook Export
            </button>
            <button onClick={handleExportKML} className="flex items-center gap-2 px-5 py-3 bg-white text-slate-900 font-bold text-xs rounded-2xl hover:bg-blue-50 transition-all border border-transparent uppercase tracking-wider shadow-lg">
              <FileDown className="w-4 h-4 text-blue-600" /> KML Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 min-h-[500px]">
        <div className="flex-[3] bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col group min-h-[400px]">
          <div className="h-[400px] lg:h-auto lg:flex-1 relative z-0">
            <MapContainer center={center} zoom={15} scrollWheelZoom={true} className="z-0 h-full w-full" style={{ height: '100%', width: '100%' }}>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {features.map((f) => {
                const pos = getCoords(f.geometry_wkt);
                if (!pos) return null;
                return (
                  <Marker key={f.feature_id} position={pos} eventHandlers={{ click: () => onSelectFeature(f) }}>
                    <Popup className="custom-popup">
                      <div className="p-2 min-w-[180px]">
                        <h4 className="font-black text-slate-900 leading-tight text-base mb-1">{f.name}</h4>
                        <button onClick={() => onSelectFeature(f)} className="w-full py-2.5 text-center bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-md">Discover Content <ChevronRight className="w-3.5 h-3.5" /></button>
                      </div>
                    </Popup>
                  </Marker>
                );
              })}
            </MapContainer>
          </div>
        </div>
        <div className="flex-[1] bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex flex-col overflow-hidden max-h-[600px] lg:max-h-none">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><List className="w-4 h-4 text-blue-600" /> Manifest</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1">
            {features.map((f) => (
              <button key={f.feature_id} onClick={() => onSelectFeature(f)} className="w-full text-left p-4 hover:bg-white hover:shadow-md transition-all rounded-2xl flex items-center justify-between group border border-transparent hover:border-slate-100">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-800 text-sm group-hover:text-blue-600 transition-colors">{f.name}</span>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {mapMarkdown && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden p-8 sm:p-12 lg:p-16">
          <article className="prose prose-slate prose-lg max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]} components={{
              img: ({ src, alt, ...props }: any) => <img src={src?.startsWith('http') ? src : `${markdownBase}${src}`} alt={alt} className="rounded-3xl shadow-lg my-8" {...props} />
            }}>
              {mapMarkdown}
            </ReactMarkdown>
          </article>
        </div>
      )}
    </div>
  );
};

export default MapDetail;
