
import React from 'react';
import { AggregateStats } from '../../types';

interface StatsDisplayProps {
  stats: AggregateStats | null;
  disabled: boolean;
}

const StatsDisplay: React.FC<StatsDisplayProps> = ({ stats, disabled }) => {
  if (disabled || !stats) { 
    return (
      <div className={`py-1 ${disabled ? 'opacity-60' : ''}`}>
        <p className="text-xs text-slate-400">Load data to view statistics.</p>
      </div>
    );
  }

  const formatValue = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) return 'N/A';
    if (Number.isInteger(value)) return value.toString();
    if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(2);
    return value.toFixed(3);
  };

  const statItems = [
    { label: "Fiedler Value", value: stats.fiedler_value, important: true, tooltip: "Fiedler Value (Algebraic Connectivity): Measures graph connectivity. Higher values indicate a more robustly connected graph. Often null if the graph is not connected or has isolated components." },
    { label: "Modularity", value: stats.modularity, important: true, tooltip: "Modularity: Measures the strength of division of a network into modules (communities or clusters). Values typically range from -0.5 to 1. Positive values indicate the presence of community structure." },
    { label: "Community Count", value: stats.community_count, tooltip: "Community Count: The total number of distinct communities (densely connected groups of nodes) detected in the graph using a community detection algorithm." },
    { label: "Clustering Coeff.", value: stats.clustering, tooltip: "Global Clustering Coefficient: A measure of the degree to which nodes in a graph tend to cluster together. Higher values (closer to 1) suggest a 'small-world' network property. The exact range and interpretation can depend on the specific formula used." },
    { label: "Out-Diameter", value: stats.out_diameter, tooltip: "Out-Diameter: The longest shortest path from any node to any other reachable node in the graph, considering edge directions (outgoing paths). Represents the maximum 'hops' needed to reach any node from any other, following influence flow." },
    { label: "In-Diameter", value: stats.in_diameter, tooltip: "In-Diameter: The longest shortest path from any node to any other reachable node when traversing edges in reverse (incoming paths). Represents the maximum 'hops' from which any node can be reached." },
    { label: "Avg. In-Degree", value: stats.in_degree_avg, tooltip: "Average In-Degree: The average number of incoming links (influences received) per node in the graph." },
    { label: "In-Degree Var.", value: stats.in_degree_var, tooltip: "In-Degree Variance: Measures the statistical variance (dispersion or spread) of in-degrees across all nodes. A low variance means most nodes have a similar number of incoming links." },
    { label: "Avg. Out-Degree", value: stats.out_degree_avg, tooltip: "Average Out-Degree: The average number of outgoing links (influences exerted) per node in the graph." },
    { label: "Out-Degree Var.", value: stats.out_degree_var, tooltip: "Out-Degree Variance: Measures the statistical variance (dispersion or spread) of out-degrees across all nodes. A low variance means most nodes exert a similar amount of influence." },
    { label: "Size Entropy", value: stats.size_entropy, tooltip: "Size Entropy of Components: Measures the diversity or unpredictability in the sizes of the connected components of the graph. Higher entropy indicates more varied component sizes." },
  ];

  return (
    <div className="py-1">
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-3 gap-y-1 text-xs">
        {statItems.map(item => (
          <div key={item.label} className={`flex justify-between items-baseline py-0.5 ${item.important ? 'col-span-1 md:col-span-2 border-b border-slate-600/70' : ''}`}>
            <dt className="text-slate-300 truncate pr-1" title={item.tooltip || item.label}>{item.label}:</dt>
            <dd className={`font-medium ${item.important ? 'text-sky-300 text-sm' : 'text-slate-100'} tabular-nums`}>{formatValue(item.value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
};

export default React.memo(StatsDisplay);
