
import React, { useState, useEffect } from 'react';
import { Search, Map as MapIcon, Home, Compass, Loader2, X } from 'lucide-react';
import { searchFeatures } from '../services/dbService';

interface LayoutProps {
  children: React.ReactNode;
  onSearchSelect: (featureId: string) => void;
  onGoHome: () => void;
}

const Layout: React.FC<LayoutProps> = ({ children, onSearchSelect, onGoHome }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    const delayDebounce = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setIsSearching(true);
        const res = await searchFeatures(searchTerm);
        setResults(res);
        setIsSearching(false);
        setShowResults(true);
      } else {
        setResults([]);
        setShowResults(false);
      }
    }, 300);

    return () => clearTimeout(delayDebounce);
  }, [searchTerm]);

  const handleSelect = (id: string) => {
    onSearchSelect(id);
    setSearchTerm('');
    setShowResults(false);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <button 
              onClick={onGoHome}
              className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
              <Compass className="w-8 h-8 text-blue-600" />
              <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                WalkGIS
              </span>
            </button>

            <div className="flex-1 max-w-md mx-4 relative">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search features..."
                  className="w-full pl-10 pr-4 py-2 bg-slate-100 border-none rounded-full focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all text-sm"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                {searchTerm && (
                  <button 
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {showResults && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-lg shadow-xl border border-slate-200 max-h-64 overflow-y-auto z-[100]">
                  {isSearching ? (
                    <div className="p-4 flex justify-center">
                      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
                    </div>
                  ) : results.length > 0 ? (
                    results.map((r) => (
                      <button
                        key={r.feature_id}
                        onClick={() => handleSelect(r.feature_id)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 border-b border-slate-100 last:border-none flex items-center gap-2"
                      >
                        <MapIcon className="w-4 h-4 text-slate-400" />
                        <span className="text-sm font-medium">{r.name}</span>
                      </button>
                    ))
                  ) : (
                    <div className="p-4 text-center text-sm text-slate-500">
                      No features found
                    </div>
                  )}
                </div>
              )}
            </div>

            <nav className="flex items-center gap-4">
              <button 
                onClick={onGoHome}
                className="p-2 text-slate-600 hover:text-blue-600 transition-all rounded-xl hover:bg-blue-50 active:scale-95"
                title="回到首頁"
              >
                <Home className="w-6 h-6" />
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      <footer className="bg-white border-t border-slate-200 py-8 text-center text-slate-500 text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <p>&copy; {new Date().getFullYear()} WalkGIS Open Project. Powered by GitHub Pages & sql.js.</p>
          <div className="flex gap-6">
            <a href="https://bit.ly/491x0BV" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">哈爸筆記 Blog</a>
            <a href="https://discord.gg/bywmcqCAEs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 transition-colors">哈爸實驗室 Discord</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
