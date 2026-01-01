
export interface WalkingMap {
  map_id: string;
  name: string;
  description: string;
  cover_image: string;
  region?: string;
  meta_data?: string;
  created_at?: string;
}

export interface WalkingFeature {
  id: number;
  feature_id: string;
  name: string;
  description?: string;
  layer_id: number;
  geometry_type: string;
  geometry_wkt: string;
  meta_data?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FeatureMetadata {
  markdown_file?: string;
  [key: string]: any;
}

export interface SearchResult {
  feature_id: string;
  name: string;
}

export interface MarketSource {
  id: string;
  name: string;
  url: string;
  author: string;
  description: string;
  tags: string[];
  cover_image: string;
}
