
import React, { useState, useEffect } from 'react';
import { X, Share2, FileDown, Loader2, Navigation, MapPin, Hash } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { fetchFeatureMarkdown, getContentBaseUrl } from '../services/contentService';

interface FeatureModalProps {
  feature: {
    feature_id: string;
    name: string;
    geometry_wkt: string;
  } | null;
  onClose: () => void;
}

const FeatureModal: React.FC<FeatureModalProps> = ({ feature, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (feature) {
      setLoading(true);
      fetchFeatureMarkdown(feature.feature_id).then(md => {
        setContent(md);
        setLoading(false);
      });
    }
  }, [feature]);

  if (!feature) return null;

  const match = feature.geometry_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
  const coords = match ? { lat: match[2], lon: match[1] } : null;
  const googleMapsUrl = coords 
    ? `https://www.google.com/maps/search/?api=1&query=${coords.lat},${coords.lon}`
    : null;

  const baseUrl = getContentBaseUrl();

  const MarkdownComponents = {
    img: ({ src, alt, ...props }: any) => {
      const isAbsolute = src?.startsWith('http') || src?.startsWith('data:');
      let finalSrc = src;
      
      if (!isAbsolute && src) {
        try {
          // 使用 URL 物件自動處理 ../ 或多餘的斜線
          finalSrc = new URL(src, baseUrl).href;
        } catch (e) {
          finalSrc = `${baseUrl}${src}`;
        }
      }

      return (
        <figure className="my-10 group">
          <div className="overflow-hidden rounded-3xl shadow-sm border border-slate-100 transition-all duration-500 group-hover:shadow-xl group-hover:border-blue-100">
            <img 
              src={finalSrc} 
              alt={alt} 
              className="w-full h-auto object-cover transform transition-transform duration-700 group-hover:scale-[1.02]"
              {...props} 
            />
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
        <table className="min-w-full divide-y divide-slate-100 m-0">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }: any) => <thead className="bg-slate-50/50">{children}</thead>,
    th: ({ children }: any) => <th className="px-5 py-4 text-left text-[11px] font-black text-slate-400 uppercase tracking-[0.1em]">{children}</th>,
    td: ({ children }: any) => <td className="px-5 py-4 text-sm text-slate-600 border-t border-slate-50">{children}</td>,
    blockquote: ({ children }: any) => (
      <blockquote className="relative border-l-0 bg-slate-50 py-8 px-10 rounded-3xl my-10 overflow-hidden">
        <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500/20"></div>
        <div className="relative z-10 text-slate-700 font-medium leading-relaxed italic">
          {children}
        </div>
      </blockquote>
    ),
    code: ({ node, inline, className, children, ...props }: any) => {
      if (inline) {
        return (
          <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded-md font-mono text-sm border border-slate-200" {...props}>
            {children}
          </code>
        );
      }
      return (
        <div className="relative my-8 group">
          <div className="absolute -top-3 left-6 px-2 py-0.5 bg-slate-800 text-slate-400 text-[10px] font-bold uppercase tracking-widest rounded z-10">
            Resource Data
          </div>
          <pre className="bg-slate-900 text-slate-300 p-8 rounded-3xl overflow-x-auto font-mono text-sm leading-relaxed border border-slate-800 shadow-xl scrollbar-hide">
            <code className="block whitespace-pre" {...props}>{children}</code>
          </pre>
        </div>
      );
    },
    h1: ({ children }: any) => <h1 className="text-4xl font-black text-slate-900 mb-8 tracking-tight">{children}</h1>,
    h2: ({ children }: any) => <h2 className="text-2xl font-bold text-slate-800 mt-12 mb-6 tracking-tight flex items-center gap-3">
      <span className="w-1.5 h-6 bg-blue-500/20 rounded-full"></span>
      {children}
    </h2>,
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-0 sm:p-4 bg-slate-900/40 backdrop-blur-xl animate-in fade-in duration-500">
      <div 
        className="bg-white w-full max-w-4xl h-full sm:h-auto sm:max-h-[92vh] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col relative animate-in slide-in-from-bottom-8 duration-500"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Navigation Bar */}
        <div className="absolute top-0 left-0 right-0 h-20 px-8 flex items-center justify-between z-30 pointer-events-none">
          <button 
            onClick={onClose}
            className="p-3 bg-white/90 backdrop-blur-md hover:bg-white rounded-2xl text-slate-400 hover:text-slate-900 transition-all shadow-sm border border-slate-100 pointer-events-auto active:scale-95"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex gap-2 pointer-events-auto">
            {googleMapsUrl && (
              <a 
                href={googleMapsUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg hover:shadow-blue-500/25 active:scale-95"
              >
                <Navigation className="w-3.5 h-3.5 fill-current" />
                Navigate POI
              </a>
            )}
          </div>
        </div>

        {/* Hero Section */}
        <div className="pt-24 pb-8 px-8 sm:px-12 bg-white border-b border-slate-50">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-blue-100/50">
                <MapPin className="w-3 h-3" />
                Feature Insight
              </div>
              {coords && (
                <span className="text-[10px] text-slate-300 font-mono tracking-tighter">
                  {coords.lat}, {coords.lon}
                </span>
              )}
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-900 tracking-tight leading-tight">
              {feature.name}
            </h1>
          </div>
        </div>

        {/* Article Content */}
        <div className="flex-1 overflow-y-auto bg-white custom-scrollbar selection:bg-blue-100 selection:text-blue-900">
          <div className="max-w-3xl mx-auto px-8 sm:px-12 py-12">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-64 text-slate-300 gap-4">
                <Loader2 className="w-10 h-10 animate-spin" />
                <p className="text-xs font-bold uppercase tracking-[0.2em] animate-pulse">Fetching Content</p>
              </div>
            ) : (
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
                  {content}
                </ReactMarkdown>
              </article>
            )}
          </div>
        </div>

        {/* Technical Footer */}
        <div className="px-8 sm:px-12 py-6 bg-slate-50/50 border-t border-slate-100 flex flex-col sm:flex-row gap-6 justify-between items-center">
           <div className="flex items-center gap-4 group">
             <div className="flex flex-col">
               <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5 flex items-center gap-1">
                 <Hash className="w-2.5 h-2.5" /> System ID
               </span>
               <code className="text-[11px] font-mono text-slate-500 bg-slate-200/50 px-2.5 py-1 rounded-lg border border-slate-200 group-hover:bg-blue-50 group-hover:border-blue-100 group-hover:text-blue-600 transition-colors">
                 {feature.feature_id}
               </code>
             </div>
           </div>
           
           <div className="flex gap-2">
             <button 
               onClick={() => window.print()}
               className="p-3 text-slate-400 hover:text-slate-600 hover:bg-white rounded-2xl transition-all border border-transparent hover:border-slate-200"
               title="Print Content"
             >
               <FileDown className="w-5 h-5" />
             </button>
             <button 
               onClick={() => {
                 if (navigator.share) {
                   navigator.share({ title: feature.name, text: `Discover ${feature.name} on WalkGIS`, url: window.location.href });
                 }
               }}
               className="flex items-center gap-2 px-6 py-2.5 text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm active:scale-95"
             >
               <Share2 className="w-4 h-4" />
               Share POI
             </button>
           </div>
        </div>
      </div>
    </div>
  );
};

export default FeatureModal;
