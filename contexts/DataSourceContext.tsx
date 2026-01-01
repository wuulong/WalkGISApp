
import React, { createContext, useContext, useState, useEffect } from 'react';

interface DataSourceContextType {
  baseUrl: string;
  setBaseUrl: (url: string) => void;
  isLoading: boolean;
  isSwitching: boolean;
}

const DEFAULT_SOURCE = 'https://wuulong.github.io/wuulong-notes-blog/walkgis_prj/';
const STORAGE_KEY = 'walkgis_current_source';

const DataSourceContext = createContext<DataSourceContextType | undefined>(undefined);

// Define global flag for async suppression
declare global {
  interface Window {
    __WALKGIS_RELOADING__?: boolean;
  }
}

export const DataSourceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [baseUrl, setBaseUrlState] = useState<string>(DEFAULT_SOURCE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSwitching, setIsSwitching] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      setBaseUrlState(saved);
    }
    setIsLoading(false);
  }, []);

  const setBaseUrl = (url: string) => {
    const formattedUrl = url.endsWith('/') ? url : `${url}/`;
    
    // 1. Set global and state flags
    window.__WALKGIS_RELOADING__ = true;
    setIsSwitching(true);
    
    // 2. Commit to storage
    localStorage.setItem(STORAGE_KEY, formattedUrl);
    
    // 3. Force reload. The global flag helps suppress errors in the few ms before unload.
    window.location.reload();
  };

  return (
    <DataSourceContext.Provider value={{ baseUrl, setBaseUrl, isLoading, isSwitching }}>
      {children}
    </DataSourceContext.Provider>
  );
};

export const useDataSource = () => {
  const context = useContext(DataSourceContext);
  if (!context) throw new Error('useDataSource must be used within DataSourceProvider');
  return context;
};
