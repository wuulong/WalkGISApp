
import React, { useState, useEffect } from 'react';
import { Radar, Navigation, MapPin, ChevronRight, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { queryAllFeatures } from '../services/dbService';
import { parseWkt, calculateDistance, formatDistance } from '../services/geoUtils';

interface NearbyDiscoveryProps {
  onSelectFeature: (feature: any) => void;
}

const NearbyDiscovery: React.FC<NearbyDiscoveryProps> = ({ onSelectFeature }) => {
  const [isLocating, setIsLocating] = useState(false);
  const [nearby, setNearby] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasRequested, setHasRequested] = useState(false);

  const findNearby = async (lat: number, lng: number) => {
    try {
      const allFeatures = await queryAllFeatures();
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
      console.error("Discovery error:", err);
      setError("Failed to query POIs");
      setIsLocating(false);
    }
  };

  const handleLocate = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setIsLocating(true);
    setError(null);
    setHasRequested(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        findNearby(position.coords.latitude, position.coords.longitude);
      },
      (err) => {
        console.error("Geolocation error:", err);
        setError("Could not access your location. Please check GPS settings.");
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  if (!hasRequested) {
    return (
      <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[2.5rem] p-8 sm:p-12 text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-110 transition-transform duration-1000"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/20 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest border border-white/10">
              <Sparkles className="w-3 h-3 text-amber-300" />
              New Feature
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight leading-none">Radar Explorer</h2>
            <p className="text-blue-100 text-sm max-w-md leading-relaxed">
              Find the top 5 closest cultural and historical landmarks around your current location instantly.
            </p>
          </div>
          <button 
            onClick={handleLocate}
            className="group flex items-center gap-3 px-8 py-4 bg-white text-blue-700 font-black text-sm rounded-2xl hover:bg-blue-50 transition-all shadow-xl active:scale-95 whitespace-nowrap"
          >
            <Radar className="w-5 h-5 animate-pulse" />
            START SCANNING
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-xl overflow-hidden animate-in zoom-in-95 duration-500">
      <div className="p-8 border-b border-slate-50 bg-slate-50/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 rounded-2xl text-blue-600">
            <Radar className={isLocating ? "w-6 h-6 animate-spin" : "w-6 h-6"} />
          </div>
          <div>
            <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Radar Results</h3>
            <p className="text-lg font-bold text-slate-900 leading-none">Nearby POIs</p>
          </div>
        </div>
        {isLocating && (
          <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black animate-pulse">
            <Loader2 className="w-3 h-3 animate-spin" />
            LOCATING...
          </div>
        )}
        {!isLocating && (
          <button 
            onClick={handleLocate}
            className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
            title="Refresh Scan"
          >
            <Navigation className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="p-6 sm:p-8">
        {error && (
          <div className="flex items-center gap-4 p-6 bg-red-50 text-red-700 rounded-2xl border border-red-100 mb-4">
            <AlertCircle className="w-6 h-6 shrink-0" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {isLocating ? (
          <div className="py-12 flex flex-col items-center justify-center gap-6 text-slate-300">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping"></div>
              </div>
            </div>
            <p className="text-xs font-black uppercase tracking-[0.2em] animate-pulse">Triangulating Position</p>
          </div>
        ) : (
          <div className="space-y-3">
            {nearby.length > 0 ? nearby.map((f, i) => (
              <button 
                key={f.feature_id}
                onClick={() => onSelectFeature(f)}
                className="w-full text-left p-4 sm:p-5 bg-white border border-slate-100 rounded-3xl hover:border-blue-200 hover:shadow-lg transition-all group flex items-center justify-between active:scale-[0.98] animate-in slide-in-from-bottom-4 duration-500"
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-50 text-slate-400 font-black text-xs group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                    #{i + 1}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{f.name}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tighter ${
                        f.distance < 500 ? 'bg-emerald-50 text-emerald-600' : 'bg-blue-50 text-blue-600'
                      }`}>
                        {formatDistance(f.distance)}
                      </span>
                      <span className="text-[10px] text-slate-300 font-mono">{f.feature_id}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-all">
                    <ChevronRight className="w-4 h-4" />
                  </div>
                </div>
              </button>
            )) : !error && (
              <div className="py-12 text-center text-slate-400">
                <MapPin className="w-8 h-8 mx-auto mb-3 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">No nearby points found in database</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyDiscovery;
