
import React from 'react';
import { FiltersState, DataRangesForFilters, FilterMetricKey } from '../../types';
import { DEGREE_CENTRALITY_METRICS } from '../../constants';
import RangeSlider from '../RangeSlider';

interface DegreeCentralityFilterProps {
  filters: FiltersState;
  dataRanges: DataRangesForFilters;
  onNumericFilterChange: (filterKey: FilterMetricKey, newRange: { min?: number; max?: number }) => void;
}

const DegreeCentralityFilter: React.FC<DegreeCentralityFilterProps> = ({
  filters,
  dataRanges,
  onNumericFilterChange,
}) => {
  const metricTooltips: Record<string, string> = {
    'in_degree_centrality': 'In-Degree Centrality: Represents the number of incoming links (influences) a node (square) receives. Higher values indicate the square is influenced by many other squares/pieces. Filter by the range of in-degree values.',
    'out_degree_centrality': 'Out-Degree Centrality: Represents the number of outgoing links (influences) a node (square) exerts. Higher values indicate the square/piece influences many other squares. Filter by the range of out-degree values.'
  };

  return (
    <div className="space-y-2.5">
      {DEGREE_CENTRALITY_METRICS.map(metric => {
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

export default React.memo(DegreeCentralityFilter);
