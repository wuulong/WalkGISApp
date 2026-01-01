
import React, { useState, useEffect } from 'react';
import { queryMaps } from '../services/dbService';
import { WalkingMap } from '../types';
import { Compass, MapPinned, BookOpen, MessageSquare, LifeBuoy, Github } from 'lucide-react';
import { resolveMapImagePath } from '../services/contentService';
import NearbyDiscovery from '../components/NearbyDiscovery';
import { useDataSource } from '../contexts/DataSourceContext';

interface HomeProps {
  onSelectMap: (mapId: string) => void;
  onSelectFeature: (feature: any) => void;
}

const Home: React.FC<HomeProps> = ({ onSelectMap, onSelectFeature }) => {
  const { baseUrl } = useDataSource();
  const [maps, setMaps] = useState<WalkingMap[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queryMaps(baseUrl).then(data => {
      setMaps(data);
      setLoading(false);
    });
  }, [baseUrl]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-pulse flex flex-col items-center gap-4 text-slate-400">
          <Compass className="w-12 h-12 animate-spin text-blue-500" />
          <p className="font-bold tracking-widest uppercase text-xs">Scanning Node Context</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-16 animate-in slide-in-from-bottom-4 duration-700">
      {/* Hero Section */}
      <div className="text-center max-w-6xl mx-auto space-y-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-blue-100/50 mb-2">
          <MapPinned className="w-3 h-3" />
          Current Archive Node
        </div>
        <h1 className="text-5xl font-black text-slate-900 tracking-tight leading-none sm:text-7xl">
          Curated Walking Maps
        </h1>
        <p className="text-lg text-slate-500 max-w-2xl mx-auto leading-relaxed">
          Navigate through historical trails and community-mapped points of interest from the currently connected WalkGIS node.
        </p>

        {/* Community Links Grid - Optimized for 4 in a row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mt-8">
          <a href="https://wuulong.github.io/wuulong-notes-blog/series/walkgis/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 sm:px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-blue-200 transition-all group active:scale-95">
            <div className="p-2 bg-blue-50 rounded-xl group-hover:bg-blue-100 transition-colors shrink-0">
              <LifeBuoy className="w-5 h-5 text-blue-600" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">User Guide</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">使用說明書</p>
            </div>
          </a>
          
          <a href="https://bit.ly/491x0BV" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 sm:px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-amber-200 transition-all group active:scale-95">
            <div className="p-2 bg-amber-50 rounded-xl group-hover:bg-amber-100 transition-colors shrink-0">
              <BookOpen className="w-5 h-5 text-amber-600" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Community Blog</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">哈爸筆記</p>
            </div>
          </a>
          
          <a href="https://discord.gg/bywmcqCAEs" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 sm:px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-200 transition-all group active:scale-95">
            <div className="p-2 bg-indigo-50 rounded-xl group-hover:bg-indigo-100 transition-colors shrink-0">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Join Discussion</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">哈爸實驗室 Discord</p>
            </div>
          </a>

          <a href="https://github.com/wuulong/WalkGISApp" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-3 sm:px-5 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:border-slate-900 transition-all group active:scale-95">
            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-all shrink-0">
              <Github className="w-5 h-5 text-slate-600 group-hover:text-white" />
            </div>
            <div className="text-left min-w-0">
              <p className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-slate-400 truncate">Open Source</p>
              <p className="text-xs sm:text-sm font-bold text-slate-900 truncate">WalkGIS GitHub</p>
            </div>
          </a>
        </div>
      </div>

      {/* Radar Discovery Section */}
      <div className="max-w-5xl mx-auto">
        <NearbyDiscovery onSelectFeature={onSelectFeature} />
      </div>

      {/* Map Cards Grid */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <div className="h-px flex-1 bg-slate-200"></div>
          <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Browse Full Archives</h2>
          <div className="h-px flex-1 bg-slate-200"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {maps.map((map) => {
            const coverUrl = resolveMapImagePath(baseUrl, map.cover_image) || `https://picsum.photos/seed/${map.map_id}/800/500`;
            return (
              <div 
                key={map.map_id}
                className="group bg-white rounded-[2rem] overflow-hidden shadow-sm hover:shadow-2xl transition-all duration-500 border border-slate-100 cursor-pointer flex flex-col active:scale-[0.98]"
                onClick={() => onSelectMap(map.map_id)}
              >
                <div className="aspect-[16/11] overflow-hidden relative">
                  <img src={coverUrl} alt={map.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-out" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                </div>
                <div className="p-8 flex-1 flex flex-col">
                  <h3 className="text-2xl font-black text-slate-900 leading-tight mb-3">{map.name}</h3>
                  <p className="text-slate-500 text-sm leading-relaxed line-clamp-2">{map.description || 'Detailed mapping and points of interest for this region.'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;
