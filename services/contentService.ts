
export const resolveMapImagePath = (baseUrl: string, path: string | undefined): string | null => {
  if (!path) return null;
  if (path.startsWith('http')) return path;
  
  const filename = path.split(/[/\\]/).filter(Boolean).pop();
  if (!filename) return null;
  
  return `${baseUrl}assets/images/${filename}`;
};

export const getContentBaseUrl = (baseUrl: string) => `${baseUrl}features/`;
export const getMapsBaseUrl = (baseUrl: string) => `${baseUrl}maps/`;

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

export const fetchFeatureMarkdown = async (baseUrl: string, featureId: string): Promise<string> => {
  return fetchMarkdown(getContentBaseUrl(baseUrl), featureId, 'features');
};

export const fetchMapMarkdown = async (baseUrl: string, mapId: string): Promise<string> => {
  const content = await fetchMarkdown(getMapsBaseUrl(baseUrl), mapId, 'maps');
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

/**
 * 產生專供 AI (如 NotebookLM) 使用的脈絡文本
 */
export const generateNotebookContext = (map: any, features: any[], mapMarkdown: string): string => {
  let context = `WalkGIS Map Context Report\n`;
  context += `==========================\n\n`;
  context += `Map Name: ${map.name}\n`;
  context += `Description: ${map.description || 'N/A'}\n`;
  context += `Region: ${map.region || 'N/A'}\n`;
  context += `Created At: ${map.created_at || 'N/A'}\n\n`;
  
  context += `Features List (${features.length} points):\n`;
  context += `-------------------------------------\n`;
  features.forEach((f, i) => {
    context += `${i + 1}. ${f.name} (ID: ${f.feature_id})\n`;
    context += `   Geometry: ${f.geometry_wkt}\n`;
  });
  
  context += `\nDetailed Map Description:\n`;
  context += `-------------------------\n`;
  context += mapMarkdown || 'No detailed description available.';
  
  return context;
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
