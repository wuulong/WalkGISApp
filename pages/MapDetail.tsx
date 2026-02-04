
import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, Circle, useMap } from 'react-leaflet';
import L from 'leaflet';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { queryFeaturesByMap, getDb } from '../services/dbService';
import { WalkingMap } from '../types';
import { FileDown, List, ChevronLeft, ChevronRight, RefreshCw, Sparkles, MapPin, BookOpen, Share2, Check, Box, Navigation } from 'lucide-react';
import { generateKml, downloadFile, resolveMapImagePath, fetchMapMarkdown, getContentBaseUrl, getMapsBaseUrl, generateNotebookContext, exportAtakDataPackage } from '../services/contentService';
import { parseWkt, parseLineWkt } from '../services/geoUtils';
import { useDataSource } from '../contexts/DataSourceContext';

const PRESET_COLORS = ['#2563eb', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e', '#f97316', '#10b981'];

const getFeatureStyle = (feature: any, index: number) => {
  let color = PRESET_COLORS[index % PRESET_COLORS.length];
  try {
    if (feature.meta_data) {
      const meta = JSON.parse(feature.meta_data);
      if (meta.color) color = meta.color;
      else if (meta.stroke) color = meta.stroke;
    }
  } catch (e) {}
  return { color };
};

const createNumberedIcon = (number: number, color: string = '#2563eb', isActive: boolean = false) => {
  return L.divIcon({
    className: `custom-div-icon ${isActive ? 'marker-active' : ''}`,
    html: `
      <div class="numbered-marker">
        <div class="marker-pin" style="background-color: ${isActive ? '#f59e0b' : color}">
          <span>${number}</span>
        </div>
      </div>
    `,
    iconSize: [30, 42],
    iconAnchor: [15, 42],
    popupAnchor: [0, -40]
  });
};

const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div class="relative flex items-center justify-center">
        <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-40"></div>
        <div class="w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg relative z-10"></div>
      </div>
    `,
    iconSize: [24, 24],
    iconAnchor: [12, 12]
  });
};

const MapController = ({ selectedFeature }: { selectedFeature: any }) => {
  const map = useMap();
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!selectedFeature) return;

    map.whenReady(() => {
      const wkt = selectedFeature.geometry_wkt as string;
      const ptCoords = parseWkt(wkt);
      
      if (ptCoords) {
        map.flyTo([ptCoords.lat, ptCoords.lng], 17, { duration: isFirstLoad.current ? 0.5 : 1.2 });
      } else {
        const lineCoords = parseLineWkt(wkt);
        if (lineCoords && lineCoords.length > 0) {
          const bounds = L.latLngBounds(lineCoords);
          map.flyToBounds(bounds, { padding: [50, 50], duration: isFirstLoad.current ? 0.5 : 1.2 });
        }
      }
      isFirstLoad.current = false;
    });
  }, [selectedFeature, map]);

  useEffect(() => {
    const triggerInvalidate = () => {
      if (map) {
        map.invalidateSize();
      }
    };

    map.whenReady(() => {
      triggerInvalidate();
      const delays = [100, 300, 600, 1200, 2500];
      delays.forEach(d => setTimeout(triggerInvalidate, d));
    });

    window.addEventListener('resize', triggerInvalidate);
    return () => window.removeEventListener('resize', triggerInvalidate);
  }, [map]);

  return null;
};

const preprocessMarkdown = (md: string) => {
  if (!md) return "";
  return md.replace(/([^\~])\~([^\~])/g, '$1&#126;$2');
};

interface MapDetailProps {
  mapId: string;
  onBack: () => void;
  onSelectFeature: (feature: any, showModal?: boolean) => void;
  selectedFeature: any;
}

const MapDetail: React.FC<MapDetailProps> = ({ mapId, onBack, onSelectFeature, selectedFeature }) => {
  const { baseUrl } = useDataSource();
  const [mapInfo, setMapInfo] = useState<WalkingMap | null>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [mapMarkdown, setMapMarkdown] = useState<string>('');
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [isExportingAtak, setIsExportingAtak] = useState(false);
  const [copied, setCopied] = useState(false);
  const [userPos, setUserPos] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [isLocating, setIsLocating] = useState(false);

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
      if (err.name !== 'AbortError') setStatus('error');
    }
  };

  useEffect(() => { loadData(); }, [mapId, baseUrl]);

  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy
        });
      },
      (err) => console.warn("Geolocation error:", err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const handleLocateMe = () => {
    if (!userPos) {
      setIsLocating(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const newPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy };
          setUserPos(newPos);
          setIsLocating(false);
          window.dispatchEvent(new CustomEvent('map-fly-to', { detail: newPos }));
        },
        () => setIsLocating(false),
        { enableHighAccuracy: true }
      );
      return;
    }
    window.dispatchEvent(new CustomEvent('map-fly-to', { detail: userPos }));
  };

  const handleShare = () => {
    if (window.location.protocol === 'blob:') return;
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportKML = () => {
    const kml = generateKml(features);
    downloadFile(kml, `${mapInfo?.name || 'map'}.kml`, 'application/vnd.google-earth.kml+xml');
  };

  const handleExportATAK = async () => {
    if (!mapInfo || isExportingAtak) return;
    setIsExportingAtak(true);
    try {
      await exportAtakDataPackage(baseUrl, mapInfo, features);
    } catch (e) {
      console.error("ATAK Export failed", e);
    } finally {
      setIsExportingAtak(false);
    }
  };

  const handleExportNotebook = () => {
    if (!mapInfo) return;
    const context = generateNotebookContext(mapInfo, features);
    downloadFile(context, `${mapInfo.name}_context.txt`, 'text/plain');
  };

  const getPointCoords = (wkt: any) => {
    const coords = parseWkt(wkt);
    return coords ? [coords.lat, coords.lng] as [number, number] : null;
  };

  const getLineCoords = (wkt: any) => {
    return parseLineWkt(wkt);
  };

  if (status === 'loading') return (
    <div className="flex flex-col items-center justify-center h-96 gap-4">
      <RefreshCw className="w-10 h-10 animate-spin text-blue-500" />
      <p className="text-slate-500 animate-pulse font-medium">Loading Archive Details...</p>
    </div>
  );

  const firstFeature = features[0];
  let center: [number, number] = [25.0330, 121.5654];
  if (firstFeature) {
    const pt = getPointCoords(firstFeature.geometry_wkt);
    if (pt) center = pt;
    else {
      const ln = getLineCoords(firstFeature.geometry_wkt);
      if (ln && ln.length > 0) center = ln[0];
    }
  }

  const coverUrl = resolveMapImagePath(baseUrl, mapInfo?.cover_image) || `https://picsum.photos/seed/${mapId}/1200/400`;
  const markdownBase = getMapsBaseUrl(baseUrl);

  const LocateController = () => {
    const map = useMap();
    useEffect(() => {
      const handleFlyTo = (e: any) => {
        const { lat, lng } = e.detail;
        map.flyTo([lat, lng], 17, { duration: 1.5 });
      };
      window.addEventListener('map-fly-to', handleFlyTo);
      return () => window.removeEventListener('map-fly-to', handleFlyTo);
    }, [map]);
    return null;
  };

  return (
    <div className="flex flex-col gap-8 animate-in fade-in duration-500 pb-12 overflow-visible">
      <div className="relative h-64 sm:h-80 rounded-[2.5rem] overflow-hidden shadow-xl group shrink-0">
        <img src={coverUrl} alt={mapInfo?.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent"></div>
        <button onClick={onBack} className="absolute top-6 left-6 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white hover:text-slate-900 transition-all shadow-lg active:scale-95 z-40"><ChevronLeft className="w-6 h-6" /></button>
        <button onClick={handleShare} className="absolute top-6 right-6 p-3 bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl text-white hover:bg-white hover:text-blue-600 transition-all shadow-lg active:scale-95 flex items-center gap-2 font-bold text-xs uppercase tracking-widest z-40">
          {copied ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
          {copied ? "Copied" : "Share"}
        </button>
        <div className="absolute bottom-10 left-10 right-10 flex flex-col sm:flex-row sm:items-end justify-between gap-6 z-30">
          <div className="space-y-2">
            <h2 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none">{mapInfo?.name}</h2>
            <p className="text-slate-300 max-w-xl text-sm leading-relaxed line-clamp-2">{mapInfo?.description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleExportATAK} disabled={isExportingAtak} className="flex items-center gap-2 px-5 py-3 bg-indigo-600 text-white font-bold text-xs rounded-2xl hover:bg-indigo-700 transition-all border border-transparent uppercase tracking-wider shadow-lg active:scale-95 disabled:opacity-50">
              {isExportingAtak ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Box className="w-4 h-4" />} ATAK Package
            </button>
            <button onClick={handleExportNotebook} className="flex items-center gap-2 px-5 py-3 bg-blue-600 text-white font-bold text-xs rounded-2xl hover:bg-blue-700 transition-all border border-transparent uppercase tracking-wider shadow-lg active:scale-95">
              <Sparkles className="w-4 h-4" /> Notebook Export
            </button>
            <button onClick={handleExportKML} className="flex items-center gap-2 px-5 py-3 bg-white text-slate-900 font-bold text-xs rounded-2xl hover:bg-blue-50 transition-all border border-transparent uppercase tracking-wider shadow-lg active:scale-95">
              <FileDown className="w-4 h-4 text-blue-600" /> KML Export
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 lg:h-[75vh] lg:min-h-[600px] overflow-visible">
        <div className="flex-[3] bg-white rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden flex flex-col group min-h-[450px] lg:h-full shrink-0">
          <button onClick={handleLocateMe} className={`absolute top-6 right-6 z-40 p-3 bg-white rounded-2xl shadow-xl border border-slate-100 transition-all active:scale-90 ${userPos ? 'text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:bg-slate-50'}`} title="Locate current position">
            {isLocating ? <RefreshCw className="w-6 h-6 animate-spin" /> : <Navigation className="w-6 h-6" />}
          </button>
          <div className="absolute inset-0 z-0">
            <MapContainer key={`${mapId}-${baseUrl}`} center={center} zoom={15} scrollWheelZoom={true} className="w-full h-full" style={{ width: '100%', height: '100%' }}>
              <MapController selectedFeature={selectedFeature} /><LocateController /><TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {userPos && (
                <>
                  <Circle center={[userPos.lat, userPos.lng]} radius={userPos.accuracy} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }} />
                  <Marker position={[userPos.lat, userPos.lng]} icon={createUserLocationIcon()} zIndexOffset={2000}><Tooltip direction="top">你目前的位置</Tooltip></Marker>
                </>
              )}
              {features.map((f, index) => {
                const wkt = f.geometry_wkt as string;
                const markerNumber = index + 1;
                const style = getFeatureStyle(f, index);
                const isActive = selectedFeature?.feature_id === f.feature_id;
                const pt = getPointCoords(wkt);
                if (pt) {
                  return (
                    <Marker key={f.feature_id} position={pt} icon={createNumberedIcon(markerNumber, style.color, isActive)} eventHandlers={{ click: () => onSelectFeature(f, true), contextmenu: (e) => { L.DomEvent.stopPropagation(e); e.originalEvent.preventDefault(); onSelectFeature(f, false); } }} zIndexOffset={isActive ? 1000 : 0}>
                      <Tooltip direction="top" offset={[0, -42]} opacity={0.9}><span className="font-bold text-slate-900">{f.name}</span></Tooltip>
                      <Popup className="custom-popup"><div className="p-2 min-w-[200px]"><div className="flex items-center gap-2 mb-2"><span className="shrink-0 w-6 h-6 flex items-center justify-center text-white rounded-lg text-[10px] font-black" style={{ backgroundColor: isActive ? '#f59e0b' : style.color }}>{markerNumber}</span><h4 className="font-black text-slate-900 leading-tight text-base">{f.name}</h4></div><button onClick={() => onSelectFeature(f, true)} className="w-full py-2.5 text-center bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-md">Discover Content <ChevronRight className="w-3.5 h-3.5" /></button></div></Popup>
                    </Marker>
                  );
                }
                const ln = getLineCoords(wkt);
                if (ln) {
                  return (
                    <Polyline key={f.feature_id} positions={ln} color={isActive ? '#f59e0b' : style.color} weight={isActive ? 12 : 6} opacity={isActive ? 1 : 0.7} eventHandlers={{ click: () => onSelectFeature(f, true), contextmenu: (e) => { L.DomEvent.stopPropagation(e); e.originalEvent.preventDefault(); onSelectFeature(f, false); } }}>
                      <Tooltip sticky opacity={0.9}><span className="font-bold text-slate-900">{f.name}</span></Tooltip>
                      <Popup className="custom-popup"><div className="p-2 min-w-[200px]"><div className="flex items-center gap-2 mb-2"><span className="shrink-0 w-6 h-6 flex items-center justify-center text-white rounded-lg text-[10px] font-black" style={{ backgroundColor: isActive ? '#f59e0b' : style.color }}>{markerNumber}</span><h4 className="font-black text-slate-900 leading-tight text-base">{f.name}</h4></div><p className="text-[10px] text-slate-400 font-bold uppercase mb-2">Geometry: Path/Route</p><button onClick={() => onSelectFeature(f, true)} className="w-full py-2.5 text-center bg-slate-900 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-md">View details <ChevronRight className="w-3.5 h-3.5" /></button></div></Popup>
                    </Polyline>
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>
        </div>
        <div className="flex-[1] bg-slate-50/50 rounded-[2.5rem] border border-slate-100 flex flex-col overflow-hidden h-[450px] lg:h-full shadow-inner min-h-[400px] shrink-0">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white/50 shrink-0"><h3 className="text-[11px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><List className="w-4 h-4 text-blue-600" /> Manifest</h3><span className="text-[10px] font-black text-slate-400">{features.length} Items</span></div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-1 min-h-0">
            {features.map((f, index) => {
              const markerNumber = index + 1;
              const wkt = (f.geometry_wkt as string).toUpperCase();
              const isLine = wkt.includes('LINESTRING');
              const { color } = getFeatureStyle(f, index);
              const isActive = selectedFeature?.feature_id === f.feature_id;
              return (
                <button key={f.feature_id} onClick={() => onSelectFeature(f, true)} onContextMenu={(e) => { e.preventDefault(); onSelectFeature(f, false); }} className={`w-full text-left p-4 transition-all rounded-2xl flex items-center gap-4 group border ${isActive ? 'bg-white shadow-lg border-amber-200 ring-2 ring-amber-100 ring-opacity-50' : 'hover:bg-white hover:shadow-md border-transparent hover:border-slate-100'} active:scale-95`}><span className={`shrink-0 w-8 h-8 flex items-center justify-center rounded-xl text-xs font-black transition-all shadow-sm ${isActive ? 'bg-amber-500 text-white' : 'bg-white border border-slate-100'}`} style={!isActive ? { color: color, borderColor: color + '33' } : {}}>{markerNumber}</span><div className="flex-1 min-w-0"><span className={`font-bold text-sm transition-colors block truncate ${isActive ? 'text-amber-700' : 'text-slate-800 group-hover:text-blue-600'}`}>{f.name}</span><div className="flex items-center gap-1.5"><span className="text-[8px] font-black uppercase tracking-tighter opacity-60" style={{ color: isActive ? '#d97706' : color }}>{isLine ? 'Route Path' : 'Point of Interest'}</span><div className="w-2 h-0.5 rounded-full" style={{ backgroundColor: isActive ? '#f59e0b' : color }}></div></div></div><ChevronRight className={`w-4 h-4 transition-all ${isActive ? 'text-amber-500 translate-x-1' : 'text-slate-200 group-hover:text-blue-500 group-hover:translate-x-1'}`} /></button>
              );
            })}
          </div>
        </div>
      </div>

      {mapMarkdown && (
        <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col shrink-0 mt-8">
          <div className="px-8 sm:px-12 pt-12 pb-6 border-b border-slate-50 bg-slate-50/30">
             <div className="flex items-center gap-3 mb-2"><BookOpen className="w-5 h-5 text-blue-600" /><span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Guide & Context</span></div>
             <h3 className="text-3xl font-black text-slate-900 tracking-tight">地圖導讀與背景說明</h3>
          </div>
          <div className="p-8 sm:p-12 lg:p-20">
            <article className="prose prose-slate prose-lg max-w-4xl mx-auto prose-blue prose-headings:text-slate-900 prose-headings:font-black prose-headings:tracking-tight prose-p:text-slate-600 prose-p:leading-relaxed prose-p:whitespace-pre-line prose-img:rounded-3xl prose-img:shadow-2xl prose-img:my-12 prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline prose-blockquote:border-l-4 prose-blockquote:border-blue-200 prose-blockquote:bg-blue-50/50 prose-blockquote:py-2 prose-blockquote:px-6 prose-blockquote:rounded-r-2xl prose-blockquote:text-slate-700 prose-strong:text-slate-900 prose-strong:font-bold">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]} 
                components={{
                  a: ({ href, children }) => {
                    const isInternal = href?.startsWith('?');
                    if (isInternal) {
                      return (
                        <span role="link" tabIndex={0} className="cursor-pointer text-blue-600 hover:underline font-bold" onClick={(e) => { e.preventDefault(); e.stopPropagation(); window.dispatchEvent(new CustomEvent('internal-navigation', { detail: { href } })); try { if (window.location.protocol !== 'blob:') { window.history.pushState({}, '', href); } } catch (err) { console.warn("History pushState suppressed."); } }} onKeyDown={(e) => { if (e.key === 'Enter') { window.dispatchEvent(new CustomEvent('internal-navigation', { detail: { href } })); } }}>{children}</span>
                      );
                    }
                    return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
                  },
                  img: ({ src, alt, ...props }: any) => {
                    const finalSrc = src?.startsWith('http') ? src : `${markdownBase}${src}`;
                    return (
                      <div className="my-12 space-y-3">
                        <img src={finalSrc} alt={alt} className="rounded-3xl shadow-2xl mx-auto" {...props} />
                        {alt && <p className="text-center text-sm font-bold text-slate-400 italic">↑ {alt}</p>}
                      </div>
                    );
                  }
                }}>
                {preprocessMarkdown(mapMarkdown)}
              </ReactMarkdown>
            </article>
          </div>
        </div>
      )}
    </div>
  );
};

export default MapDetail;
