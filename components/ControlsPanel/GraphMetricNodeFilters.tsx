
import React from 'react';
import { FiltersState, DataRangesForFilters, FilterMetricKey } from '../../types';
import { OTHER_GRAPH_METRIC_NODE_FILTERS } from '../../constants';
import RangeSlider from '../RangeSlider';

interface GraphMetricNodeFiltersProps {
  filters: FiltersState;
  dataRanges: DataRangesForFilters;
  onNumericFilterChange: (filterKey: FilterMetricKey, newRange: { min?: number; max?: number }) => void;
}

const GraphMetricNodeFilters: React.FC<GraphMetricNodeFiltersProps> = ({
  filters,
  dataRanges,
  onNumericFilterChange,
}) => {
  const metricTooltips: Record<string, string> = {
    'in_degree_centrality_variance': 'In-Degree Centrality Variance (Graph-wide): Measures the dispersion (spread) of in-degrees across all nodes in the current graph scope. A higher variance indicates a greater diversity in how many influences nodes receive. This filter applies to a graph-level metric, not individual node values.',
    'out_degree_centrality_variance': 'Out-Degree Centrality Variance (Graph-wide): Measures the dispersion (spread) of out-degrees across all nodes. A higher variance means more diversity in how many influences nodes exert. This filter applies to a graph-level metric.',
    'in_degree_component_avg': "Average Component In-Degree: Filters nodes based on the average in-degree of all nodes within their specific connected component. Useful for finding nodes in components that are generally highly or lowly influenced.",
    'in_degree_deviation': "In-Degree Deviation from Component Avg.: Filters nodes based on how much their individual in-degree deviates from the average in-degree of their component. Positive values mean higher than average in-degree for its component; negative values mean lower.",
    'out_degree_component_avg': "Average Component Out-Degree: Filters nodes based on the average out-degree of all nodes within their specific connected component. Useful for finding nodes in components that generally exert high or low influence.",
    'out_degree_deviation': "Out-Degree Deviation from Component Avg.: Filters nodes based on how much their individual out-degree deviates from the average out-degree of their component. Positive values mean it exerts more influence than average for its component; negative values mean less."
  };

  return (
    <div className="space-y-2.5">
      {OTHER_GRAPH_METRIC_NODE_FILTERS.map(metric => {
        const filterKey = metric.key as FilterMetricKey;
        const rangeData = dataRanges[filterKey];
        const filterValues = filters[filterKey];

        if (!rangeData || !filterValues) {
            return (
                <div key={filterKey} className="opacity-50">
                    <p className="block text-xs font-medium text-slate-400 mb-0.5">{metric.label}</p>
                    <p className="text-xs text-slate-500">Data not available for this metric.</p>
                </div>
            );
        }
        
        return (
           <RangeSlider
            key={filterKey}
            label={metric.label}
            metricKey={filterKey}
            minVal={filterValues.currentMin}
            maxVal={filterValues.currentMax}
            dataMin={rangeData.min}
            dataMax={rangeData.max}
            onMinChange={(val) => onNumericFilterChange(filterKey, { min: val })}
            onMaxChange={(val) => onNumericFilterChange(filterKey, { max: val })}
            tooltip={metricTooltips[metric.key] || `Filter nodes by their ${metric.label} values.`}
          />
        );
      })}
    </div>
  );
};

export default React.memo(GraphMetricNodeFilters);
