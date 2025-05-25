
import { FiltersState, FilterValueRange, LayoutType, GraphScope, NodeNumericMetricKey, NodeColoringMetricId } from './types';

export const INITIAL_FILTER_VALUE_RANGE: FilterValueRange = {
  currentMin: 0,
  currentMax: 1,
  dataMin: 0,
  dataMax: 1,
};

export const INITIAL_FILTERS_STATE: FiltersState = {
  searchTerm: '',
  pieceTypes: [],
  pieceColor: null,
  componentIds: [],
  communityIds: [],
  in_degree_centrality: { ...INITIAL_FILTER_VALUE_RANGE },
  out_degree_centrality: { ...INITIAL_FILTER_VALUE_RANGE },
  in_degree_centrality_variance: { ...INITIAL_FILTER_VALUE_RANGE },
  out_degree_centrality_variance: { ...INITIAL_FILTER_VALUE_RANGE },
  in_degree_component_avg: { ...INITIAL_FILTER_VALUE_RANGE },
  in_degree_deviation: { ...INITIAL_FILTER_VALUE_RANGE },
  out_degree_component_avg: { ...INITIAL_FILTER_VALUE_RANGE },
  out_degree_deviation: { ...INITIAL_FILTER_VALUE_RANGE },
};

export const LAYOUT_OPTIONS: { value: LayoutType; label: string }[] = [
  { value: 'force-directed', label: 'Force-Directed' },
  { value: 'radial', label: 'Radial' },
  { value: 'spiral', label: 'Spiral (Fixed Path)' },
];

export const GRAPH_SCOPE_OPTIONS: { value: GraphScope; label: string }[] = [
  { value: 'combined', label: 'Combined' },
  { value: 'white', label: 'White Pieces' },
  { value: 'black', label: 'Black Pieces' },
];

export const DEGREE_CENTRALITY_METRICS: { key: NodeNumericMetricKey; label: string }[] = [
    { key: 'in_degree_centrality', label: 'In-Degree Centrality' },
    { key: 'out_degree_centrality', label: 'Out-Degree Centrality' },
];

export const OTHER_GRAPH_METRIC_NODE_FILTERS: { key: NodeNumericMetricKey; label: string }[] = [
  { key: 'in_degree_centrality_variance', label: 'In-Degree Centrality Variance' },
  { key: 'out_degree_centrality_variance', label: 'Out-Degree Centrality Variance' },
  { key: 'in_degree_component_avg', label: 'Avg. Component In-Degree' },
  { key: 'in_degree_deviation', label: 'In-Degree Deviation from Comp. Avg.' },
  { key: 'out_degree_component_avg', label: 'Avg. Component Out-Degree' },
  { key: 'out_degree_deviation', label: 'Out-Degree Dev. from Comp. Avg.' },
];

export const SORTABLE_NODE_METRICS: { key: string; label: string }[] = [
  { key: 'id', label: 'Square ID' },
  { key: 'component_id', label: 'Component ID' },
  { key: 'community_id', label: 'Community ID' },
  ...DEGREE_CENTRALITY_METRICS,
  ...OTHER_GRAPH_METRIC_NODE_FILTERS,
];

export const NODE_COLORING_METRIC_OPTIONS: { value: NodeColoringMetricId; label: string }[] = [
  { value: 'default', label: 'Default (Component-Community)' },
  { value: 'component_id_color', label: 'Component ID' },
  { value: 'community_id_color', label: 'Community ID' },
  ...DEGREE_CENTRALITY_METRICS.map(m => ({ value: m.key, label: m.label })),
  ...OTHER_GRAPH_METRIC_NODE_FILTERS.map(m => ({ value: m.key, label: m.label })),
];

// Visualization-specific constants (e.g., D3 forces, node radii, PIECE_UNICODE_MAP)
// have been moved to src/constants.ts
// This file (root constants.ts) now primarily holds app-level configuration constants.