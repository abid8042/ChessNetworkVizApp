
import React from 'react';
import { NodeColoringMetricId, NodeNumericMetricKey } from '../../types';
import { NODE_COLORING_METRIC_OPTIONS } from '../../constants';

interface NodeColoringSelectorProps {
  currentColoringMetric: NodeColoringMetricId;
  onColoringMetricChange: (metric: NodeColoringMetricId) => void;
  disabled: boolean;
}

const NodeColoringSelector: React.FC<NodeColoringSelectorProps> = ({ currentColoringMetric, onColoringMetricChange, disabled }) => {
  const metricDescriptions: Record<string, string> = { // Use string for key to allow dynamic access
    'default': 'Default: Colors nodes based on a combination of their Component ID and Community ID, providing a general structural overview using distinct categorical colors.',
    'component_id_color': 'Component ID: Colors nodes categorically based on their connected component ID. Helps distinguish separate subgraphs in the network.',
    'community_id_color': 'Community ID: Colors nodes categorically based on their detected community ID. Useful for identifying densely connected clusters within components.',
    'in_degree_centrality': 'In-Degree Centrality: Colors nodes on a sequential scale based on their in-degree. Highlights nodes that receive many influences or connections.',
    'out_degree_centrality': 'Out-Degree Centrality: Colors nodes on a sequential scale based on their out-degree. Highlights nodes that exert many influences or make many connections.',
    'in_degree_centrality_variance': 'In-Degree Centrality Variance (Graph Metric): Colors nodes based on the overall graph\'s in-degree variance. This is a single value for the graph, so all nodes will share a color representing this scheme if chosen, primarily for legend consistency. Does not reflect per-node variance.',
    'out_degree_centrality_variance': 'Out-Degree Centrality Variance (Graph Metric): Colors nodes based on the overall graph\'s out-degree variance. Similar to In-Degree Var., it is a graph-wide metric.',
    'in_degree_component_avg': 'Average Component In-Degree: Colors nodes sequentially based on the average in-degree of the component they belong to. Highlights components with generally high/low incoming connectivity.',
    'in_degree_deviation': 'In-Degree Deviation from Component Avg.: Colors nodes sequentially based on how much their individual in-degree deviates from the average in-degree of their component. Highlights nodes that are unusually high/low connected within their local group.',
    'out_degree_component_avg': 'Average Component Out-Degree: Colors nodes sequentially based on the average out-degree of their component. Highlights components with generally high/low outgoing connectivity.',
    'out_degree_deviation': 'Out-Degree Deviation from Component Avg.: Colors nodes sequentially based on how much their individual out-degree deviates from the average out-degree of their component. Highlights nodes that exert unusually high/low influence within their local group.'
  };

  return (
    <div className={`py-2 ${disabled ? 'opacity-60' : ''}`}>
      <label htmlFor="node-coloring-selector" className="block text-sm font-medium text-slate-200 mb-1.5" title="Choose a metric to determine the color of each node in the graph. This helps visually identify patterns based on the selected attribute.">
        Node Coloring Metric
      </label>
      <select
        id="node-coloring-selector"
        value={currentColoringMetric}
        onChange={(e) => onColoringMetricChange(e.target.value as NodeColoringMetricId)}
        className="block w-full pl-3 pr-10 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 rounded-lg shadow-sm transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-300/20 disabled:text-slate-400"
        disabled={disabled}
        aria-label="Select node coloring metric"
        title="Select the metric used to color nodes. Categorical metrics use distinct colors; sequential metrics use a color gradient."
      >
        {NODE_COLORING_METRIC_OPTIONS.map(option => (
          <option 
            key={option.value} 
            value={option.value} 
            className="text-slate-800"
            title={metricDescriptions[option.value] || `Color nodes by ${option.label}`}
          >
            {option.label}
          </option>
        ))}
      </select>
      {disabled && <p className="text-xs text-slate-400 mt-2">Load data to select coloring metric.</p>}
    </div>
  );
};

export default React.memo(NodeColoringSelector);
