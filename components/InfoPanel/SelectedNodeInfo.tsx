
import React from 'react';
import { ProcessedNode } from '../../types';

interface SelectedNodeInfoProps {
  nodeData: ProcessedNode | null;
}

const SelectedNodeInfo: React.FC<SelectedNodeInfoProps> = ({ nodeData }) => {
  if (!nodeData) {
    return null; 
  }

  const { id, piece_symbol, piece_color, piece_type_name, component_id, community_id, ...metrics } = nodeData;

  const metricTooltips: Record<string, string> = {
    'Piece': 'Information about the chess piece currently on this square (node), if any. Includes type, color, and symbol.',
    'Component ID': 'The ID of the connected component this square (node) belongs to. Nodes in the same component are reachable from each other.',
    'Community ID': 'The ID of the community (dense subgraph) this square (node) belongs to within its component, as identified by a community detection algorithm.',
    'In-Degree': 'In-Degree Centrality: The number of incoming influence links to this square. A higher value means this square is influenced by more squares/pieces.',
    'Out-Degree': 'Out-Degree Centrality: The number of outgoing influence links from this square. A higher value means this square/piece influences more other squares.',
    'In-Degree Var.': 'In-Degree Centrality Variance (Graph-wide): The variance of in-degrees for all nodes in the current graph scope. This is a global graph metric shown for context, not specific to this node.',
    'Out-Degree Var.': 'Out-Degree Centrality Variance (Graph-wide): The variance of out-degrees for all nodes in the current graph scope. This is a global graph metric shown for context.',
    'Avg Comp In-Deg': "Average Component In-Degree: The average in-degree of all squares (nodes) within this square's connected component.",
    'In-Deg Dev.': "In-Degree Deviation from Component Average: How much this square's in-degree differs from the average in-degree of its component. Positive = higher than component avg; Negative = lower.",
    'Avg Comp Out-Deg': "Average Component Out-Degree: The average out-degree of all squares (nodes) within this square's connected component.",
    'Out-Deg Dev.': "Out-Degree Deviation from Component Average: How much this square's out-degree differs from the average out-degree of its component. Positive = influences more than component avg; Negative = influences less."
  };

  const displayMetrics: Record<string, number | string | boolean | null | undefined> = {
    'Piece': piece_symbol ? `${piece_type_name || 'Unknown Type'} (${piece_color || 'N/A'}, ${piece_symbol})` : "Empty",
    'Component ID': component_id,
    'Community ID': community_id,
    'In-Degree': metrics.in_degree_centrality,
    'Out-Degree': metrics.out_degree_centrality,
    'In-Degree Var.': metrics.in_degree_centrality_variance, 
    'Out-Degree Var.': metrics.out_degree_centrality_variance,
    'Avg Comp In-Deg': metrics.in_degree_component_avg,
    'In-Deg Dev.': metrics.in_degree_deviation,
    'Avg Comp Out-Deg': metrics.out_degree_component_avg,
    'Out-Deg Dev.': metrics.out_degree_deviation,
  };

  const formatValue = (val: any): string => {
    if (typeof val === 'number') {
      if (Number.isInteger(val)) return val.toString();
      if (Math.abs(val) < 0.001 && val !== 0) return val.toExponential(2);
      return val.toFixed(3);
    }
    return String(val);
  };

  return (
    <div className="max-h-[calc(50vh-3rem)] overflow-y-auto custom-scrollbar">
      <h3 className="text-sm font-semibold text-slate-100 mb-0.5 sticky top-0 bg-slate-700/90 backdrop-blur-sm py-1.5 -mx-3 px-3 border-b border-slate-600">
        Node: <span className="text-sky-300 font-bold">{nodeData.id}</span>
      </h3>
      <dl className="space-y-0.5 text-xs mt-1.5">
        {Object.entries(displayMetrics).map(([key, value]) => {
          if (value === undefined || value === null || (typeof value === 'number' && isNaN(value))) {
            return null; 
          }
          return (
            <div key={key} className="flex justify-between items-baseline py-0.5 border-b border-slate-600/80 last:border-b-0">
              <dt className="text-slate-300 truncate pr-1.5" title={metricTooltips[key] || key}>{key}:</dt>
              <dd className="font-medium text-slate-100 text-right pl-1.5 tabular-nums">
                {formatValue(value)}
              </dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
};

export default React.memo(SelectedNodeInfo);
