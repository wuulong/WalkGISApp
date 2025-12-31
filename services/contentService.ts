
/**
 * 智慧偵測當前環境的 Base URL
 */
const getRepoBaseUrl = () => {
  const { origin, pathname, hostname } = window.location;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return origin.endsWith('/') ? origin : `${origin}/`;
  }
  const pathSegments = pathname.split('/').filter(Boolean);
  const repoName = pathSegments.length > 0 ? pathSegments[0] : '';
  return (repoName && !hostname.includes('localhost')) ? `${origin}/${repoName}/` : `${origin}/`;
};

const getProjectBaseUrl = (): string => {
  return `${getRepoBaseUrl()}walkgis_prj/`;
};

export const resolveMapImagePath = (path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const filename = path.split(/[/\\]/).filter(Boolean).pop();
  if (!filename) return null;
  
  return `${getProjectBaseUrl()}assets/images/${filename}`;
};

export const getContentBaseUrl = () => `${getProjectBaseUrl()}features/`;
export const getMapsBaseUrl = () => `${getProjectBaseUrl()}maps/`;

const stripFrontmatter = (md: string): string => md.replace(/^---\s*[\s\S]*?---\s*/, '');

const fetchMarkdown = async (baseUrl: string, id: string, folderName: string): Promise<string> => {
  try {
    const url = encodeURI(`${baseUrl}${id}.md`);
    const response = await fetch(url);
    if (!response.ok) return "";
    const rawText = await response.text();
    return stripFrontmatter(rawText);
  } catch (error) {
    console.error(`Error fetching ${folderName}:`, error);
    return "";
  }
};

export const fetchFeatureMarkdown = async (featureId: string): Promise<string> => {
  return fetchMarkdown(getContentBaseUrl(), featureId, 'features');
};

export const fetchMapMarkdown = async (mapId: string): Promise<string> => {
  const content = await fetchMarkdown(getMapsBaseUrl(), mapId, 'maps');
  if (!content) return "";
  return content.replace(/^##\s+.*(?:清單|列表|Features|POI)[\s\S]*$/mi, '').trim();
};

export const generateKml = (features: any[]) => {
  let kml = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>WalkGIS Export</name>`;
  features.forEach(f => {
    const match = f.geometry_wkt.match(/POINT\s*\(\s*([-\d.]+)\s+([-\d.]+)\s*\)/i);
    if (match) {
      kml += `<Placemark><name>${f.name}</name><Point><coordinates>${match[1]},${match[2]},0</coordinates></Point></Placemark>`;
    }
  });
  return kml + `</Document></kml>`;
};

export const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
