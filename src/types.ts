

// From JSON Schema
export interface Metadata {
  schema_version: string;
  description: string;
}

export interface Piece {
  id: string;
  t: string; // type: "pawn", "knight", etc.
  c: string; // color: "white" or "black"
  sq: string;
  st: string; // status: "active", "inactive", "captured", "promoted"
  mc: number; // move created
  cap: number | null; // move captured
}

export interface AggregateStats {
  fiedler_value: number | null;
  out_diameter: number;
  in_diameter: number;
  in_degree_avg: number;
  in_degree_var: number;
  out_degree_avg: number;
  out_degree_var: number;
  modularity: number;
  community_count: number;
  clustering: number;
  size_entropy: number;
}

export interface ComponentData {
  index: number;
  size: number;
  fiedler: number | null;
  out_diameter: number;
  in_diameter: number;
  out_diameter_paths: [string, string][];
  in_diameter_paths: [string, string][];
  modularity: number;
  communities: string[][];
  community_count: number;
  clustering: number;
  nodes: string[];
}

export interface NodeData {
  id: string; // square name e.g. "a1"
  type: string; // "square"
  position: string; // e.g. "a1"
  has_piece: boolean;
  piece_symbol: string | null;
  piece_color: string | null; // "white" or "black"
  piece_type: number | null; // 1: Pawn, 2: Knight etc.
  component_id: number;
  community_id: number;
  in_degree_centrality: number;
  out_degree_centrality: number;
  in_degree_centrality_variance: number;
  out_degree_centrality_variance: number;
  in_degree_component_avg: number;
  in_degree_deviation: number;
  out_degree_component_avg: number;
  out_degree_deviation: number;
}

export interface LinkData {
  type: string; // "influence"
  source: string; // node ID
  target: string; // node ID
  weight: number;
  piece_symbol: string | null;
  piece_color: string | null;
  piece_type: number | null;
}

export interface GraphScopeData {
  agg: AggregateStats;
  cmp: ComponentData[];
  nds: NodeData[];
  lks: LinkData[];
}

export interface Move {
  n: number;
  m: string;
  f: string;
  p: Piece[];
  g: {
    combined: GraphScopeData;
    white: GraphScopeData;
    black: GraphScopeData;
  };
}

export interface RawChessData {
  metadata: Metadata;
  moves: Move[];
}

// Processed/Derived Types
export interface ProcessedNode extends NodeData {
  groupTag: string; // "${component_id}-${community_id}"
  // piece info if has_piece from p array
  original_piece_id?: string; 
  piece_type_name?: string; // "pawn", "knight" etc.
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  targetRadius?: number; // For radial layout
}

export interface ProcessedLink {
  source: ProcessedNode | string; // D3 can take node object or ID string
  target: ProcessedNode | string;
  weight: number;
  piece_symbol: string | null;
  piece_color: string | null;
  piece_type: number | null;
}

export interface CommunityGroup {
  groupTag: string;
  nodes: ProcessedNode[];
}

export interface DataRangesForFilters {
  [metricKey: string]: { min: number; max: number };
}

export interface ProcessedGraphData {
  nodes: ProcessedNode[];
  links: ProcessedLink[];
  communityGroups: CommunityGroup[];
  aggregateStats: AggregateStats;
  dataRangesForFilters: DataRangesForFilters;
}

export interface FilterValueRange {
  currentMin: number;
  currentMax: number;
  dataMin: number;
  dataMax: number;
}

export interface FiltersState {
  searchTerm: string;
  pieceTypes: number[]; // array of piece_type_ids (integers)
  pieceColor: string | null; // 'white', 'black', or null for any
  componentIds: number[];
  communityIds: number[];
  in_degree_centrality: FilterValueRange;
  out_degree_centrality: FilterValueRange;
  in_degree_centrality_variance: FilterValueRange;
  out_degree_centrality_variance: FilterValueRange;
  in_degree_component_avg: FilterValueRange;
  in_degree_deviation: FilterValueRange;
  out_degree_component_avg: FilterValueRange;
  out_degree_deviation: FilterValueRange;
}

export interface SortConfig {
  key: string; // node property key
  order: 'asc' | 'desc';
}

export interface TooltipData {
  content: string | React.ReactNode;
  x: number;
  y: number;
  visible: boolean;
}

export type LayoutType = 'force-directed' | 'radial' | 'spiral';
export type GraphScope = 'combined' | 'white' | 'black';

export const NODE_METRIC_KEYS = [
  'in_degree_centrality', 'out_degree_centrality', 
  'in_degree_centrality_variance', 'out_degree_centrality_variance',
  'in_degree_component_avg', 'in_degree_deviation', 
  'out_degree_component_avg', 'out_degree_deviation'
] as const;

export type NodeNumericMetricKey = typeof NODE_METRIC_KEYS[number];

// Helper type for filter keys
export type FilterMetricKey = Exclude<keyof FiltersState, 'searchTerm' | 'pieceTypes' | 'pieceColor' | 'componentIds' | 'communityIds'>;

export const PIECE_TYPE_MAP: { [key: number]: string } = {
  1: "Pawn",
  2: "Knight",
  3: "Bishop",
  4: "Rook",
  5: "Queen",
  6: "King",
};
export const PIECE_TYPE_IDS: number[] = Object.keys(PIECE_TYPE_MAP).map(Number);

export const PIECE_COLOR_MAP: { [key: string]: string } = {
  'white': "White",
  'black': "Black"
};

export type NodeColoringMetricId = 'default' | 'component_id_color' | 'community_id_color' | NodeNumericMetricKey;

export type SequentialColorPaletteId = 
  | 'viridis' 
  | 'magma' 
  | 'plasma' 
  | 'cividis' 
  | 'cool' 
  | 'blues';

// Layout Parameter Types
export interface ForceDirectedLayoutParams {
  linkDistance: number;
  linkStrength: number;
  chargeStrength: number;
  collideStrength: number;
  centerStrength: number; // General center strength
  componentCenterStrength: number; // Strength for pulling components apart/together
}

export interface RadialLayoutParams {
  chargeStrength: number;
  linkDistanceFactor: number;
  linkStrengthFactor: number;
  radialStrength: number; // Strength pulling nodes to their ideal radius
  ringMinRadiusFactor: number; // Factor to determine minimum inner radius based on node size
  maxOuterRadiusFactor: number; // Factor for overall spread (division of min(width,height))
}

export interface SpiralLayoutParams {
  coils: number;
  maxRadiusMargin: number; // Margin from SVG edge for the outermost point of spiral
  linkDistance: number;
  linkStrength: number;
}

export interface LayoutParamsState {
  'force-directed': ForceDirectedLayoutParams;
  'radial': RadialLayoutParams;
  'spiral': SpiralLayoutParams;
}

export type LayoutParamKey<T extends LayoutType> = keyof LayoutParamsState[T];

export interface LayoutParameterUIDefinition<T extends LayoutType, K extends LayoutParamKey<T>> {
  key: K;
  label: string;
  type: 'slider' | 'number';
  min?: number;
  max?: number;
  step?: number;
  description?: string;
}

export type SpecificLayoutParameterUIDefinitions<T extends LayoutType> = Array<LayoutParameterUIDefinition<T, LayoutParamKey<T>>>;

export interface AllLayoutParameterUIDefinitions {
  'force-directed': SpecificLayoutParameterUIDefinitions<'force-directed'>;
  'radial': SpecificLayoutParameterUIDefinitions<'radial'>;
  'spiral': SpecificLayoutParameterUIDefinitions<'spiral'>;
}