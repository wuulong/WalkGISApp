
import React, { useState, useEffect } from 'react';
import { Radar, Navigation, MapPin, ChevronRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { queryAllFeatures } from '../services/dbService';
import { parseWkt, calculateDistance, formatDistance } from '../services/geoUtils';
import { useDataSource } from '../contexts/DataSourceContext';

interface NearbyDiscoveryProps {
  onSelectFeature: (feature: any) => void;
}

const NearbyDiscovery: React.FC<NearbyDiscoveryProps> = ({ onSelectFeature }) => {
  const { baseUrl } = useDataSource();
  const [isLocating, setIsLocating] = useState(false);
  const [nearby, setNearby] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const findNearby = async (lat: number, lng: number) => {
    try {
      const allFeatures = await queryAllFeatures(baseUrl);
      const featuresWithDist = allFeatures
        .map(f => {
          const coords = parseWkt(f.geometry_wkt as string);
          if (!coords) return null;
          const dist = calculateDistance(lat, lng, coords.lat, coords.lng);
          return { ...f, distance: dist };
        })
        .filter((f): f is any => f !== null)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 5);

      setNearby(featuresWithDist);
      setIsLocating(false);
    } catch (err) {
      setError("Failed to query POIs");
      setIsLocating(false);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation not supported");
      return;
    }
    setIsLocating(true);
    setError(null);
    setHasRequested(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => findNearby(pos.coords.latitude, pos.coords.longitude),
      () => {
        setError("Could not access location.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!hasRequested) return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 text-white shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8">
      <div className="space-y-4"><h2 className="text-3xl font-black tracking-tight">Radar Explorer</h2><p className="text-blue-100 text-sm max-w-md">Find landmarks around your current location instantly from the current node.</p></div>
      <button onClick={handleLocate} className="flex items-center gap-3 px-8 py-4 bg-white text-blue-700 font-black text-sm rounded-2xl hover:bg-blue-50 transition-all shadow-xl active:scale-95">
        <Radar className="w-5 h-5 animate-pulse" /> START SCANNING
      </button>
    </div>
  );

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden p-8">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3"><Radar className="w-6 h-6 text-blue-600" /><h3 className="font-black text-slate-900">Nearby POIs</h3></div>
        <button onClick={handleLocate} className="p-2 text-slate-400 hover:text-blue-600"><Navigation className="w-5 h-5" /></button>
      </div>
      <div className="space-y-3">
        {nearby.map((f, i) => (
          <button key={f.feature_id} onClick={() => onSelectFeature(f)} className="w-full text-left p-5 border border-slate-100 rounded-3xl hover:border-blue-200 transition-all flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 font-black text-xs">#{i + 1}</div>
              <div><h4 className="font-bold text-slate-900">{f.name}</h4><span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-md font-black uppercase tracking-tighter">{formatDistance(f.distance)}</span></div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-300" />
          </button>
        ))}
      </div>
    </div>
  );
};

export default NearbyDiscovery;
