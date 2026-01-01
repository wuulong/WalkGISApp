
import React, { useState, useEffect } from 'react';
import { X, Share2, FileDown, Loader2, Navigation, MapPin, Hash, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import { fetchFeatureMarkdown, getContentBaseUrl } from '../services/contentService';
import { useDataSource } from '../contexts/DataSourceContext';

interface FeatureModalProps {
  feature: {
    feature_id: string;
    name: string;
    geometry_wkt: string;
  } | null;
  onClose: () => void;
}

/**
 * 預處理 Markdown 字串，防止 ~ 被誤認為刪除線格式
 */
const preprocessMarkdown = (md: string) => {
  if (!md) return "";
  return md.replace(/([^\~])\~([^\~])/g, '$1&#126;$2');
};

const FeatureModal: React.FC<FeatureModalProps> = ({ feature, onClose }) => {
  const { baseUrl } = useDataSource();
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (feature) {
      setLoading(true);
      fetchFeatureMarkdown(baseUrl, feature.feature_id).then(md => {
        setContent(md);
        setLoading(false);
      });
    }
  }, [feature, baseUrl]);

  if (!feature) return null;

  const match = feature.geometry_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  const coords = match ? { lat: match[2], lon: match[1] } : null;
  const googleMapsUrl = coords ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}` : null;
  const markdownBase = getContentBaseUrl(baseUrl);
  const isError = content.startsWith('<!-- FETCH_ERROR -->');

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-8">
        <div className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-30 pointer-events-none">
          <button onClick={onClose} className="p-3 bg-white/90 backdrop-blur-md rounded-2xl text-slate-400 hover:text-slate-900 pointer-events-auto shadow-sm border border-slate-100"><X className="w-5 h-5" /></button>
          {googleMapsUrl && <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer" className="px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-bold pointer-events-auto">Navigate POI</a>}
        </div>
        <div className="pt-24 pb-8 px-12 border-b border-slate-50"><h1 className="text-4xl font-black text-slate-900 tracking-tight">{feature.name}</h1></div>
        <div className="flex-1 overflow-y-auto bg-white p-12 custom-scrollbar">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /><p className="text-[10px] font-black uppercase tracking-widest animate-pulse">Fetching Content</p></div>
          ) : isError ? (
            <div className="p-8 bg-red-50 rounded-3xl border border-red-100 text-red-800">
              <div className="flex items-center gap-3 mb-4">
                <AlertCircle className="w-6 h-6" />
                <h3 className="font-bold">內容載入失敗</h3>
              </div>
              <div className="prose prose-red prose-sm max-w-none">
                <ReactMarkdown>{content.replace('<!-- FETCH_ERROR -->', '')}</ReactMarkdown>
              </div>
            </div>
          ) : (
            <article className="prose prose-slate prose-lg max-w-none prose-p:whitespace-pre-line">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm, remarkBreaks]} 
                components={{
                  img: ({ src, alt, ...props }: any) => {
                    const finalSrc = src?.startsWith('http') ? src : `${markdownBase}${src}`;
                    return <img src={finalSrc} alt={alt} className="rounded-3xl shadow-lg my-10" {...props} />
                  }
                }}
              >
                {preprocessMarkdown(content)}
              </ReactMarkdown>
            </article>
          )}
        </div>
      </div>
    </div>
  );
};

export default FeatureModal;
