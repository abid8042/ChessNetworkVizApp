
import React, { useMemo, useState } from 'react';
import * as d3 from 'd3';
import { ProcessedNode, NodeColoringMetricId, DataRangesForFilters, NodeNumericMetricKey, NODE_METRIC_KEYS, SequentialColorPaletteId } from '../../types';
import { NODE_COLORING_METRIC_OPTIONS } from '../../constants';
import { D3_SEQUENTIAL_INTERPOLATORS } from '../../src/colorPaletteConstants';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

interface LegendProps {
  nodes: ProcessedNode[]; // Current filtered nodes
  nodeColoringMetric: NodeColoringMetricId;
  sequentialColorPalette: SequentialColorPaletteId;
  dataRanges: DataRangesForFilters; // For numeric metrics min/max of the current scope
}

const formatLegendValue = (value: number | string): string => {
  if (typeof value === 'string') return value;
  if (typeof value !== 'number' || isNaN(value)) return 'N/A'; // Handle NaN early
  if (Number.isInteger(value)) return value.toString();
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(1);
  return value.toFixed(2);
};

const Legend: React.FC<LegendProps> = ({ nodes, nodeColoringMetric, sequentialColorPalette, dataRanges }) => {
  const MAX_CATEGORICAL_ITEMS = 8;
  const [isOpen, setIsOpen] = useState(false); // Default to collapsed

  const legendData = useMemo(() => {
    if (nodes.length === 0 && nodeColoringMetric !== 'default' && !NODE_METRIC_KEYS.includes(nodeColoringMetric as NodeNumericMetricKey)) {
        // Only return early if no nodes AND not a metric that can derive a range from dataRanges
    }

    const currentMetricOption = NODE_COLORING_METRIC_OPTIONS.find(opt => opt.value === nodeColoringMetric);
    const title = `Color by: ${currentMetricOption?.label || 'Unknown Metric'}`;

    if (nodeColoringMetric === 'default') {
      const uniqueGroupTags = Array.from(new Set(nodes.map(n => n.groupTag))).sort();
      const colorScale = d3.scaleOrdinal(d3.schemeCategory10).domain(uniqueGroupTags);
      const items = uniqueGroupTags.slice(0, MAX_CATEGORICAL_ITEMS).map(tag => ({
        label: tag,
        color: colorScale(tag),
      }));
      return { title, items, type: 'categorical' as 'categorical', totalItems: uniqueGroupTags.length };
    }

    if (nodeColoringMetric === 'component_id_color' || nodeColoringMetric === 'community_id_color') {
      const idKey = nodeColoringMetric === 'component_id_color' ? 'component_id' : 'community_id';
      const uniqueIds = Array.from(new Set(nodes.map(n => n[idKey].toString()))).sort((a, b) => parseInt(a) - parseInt(b));
      const colorScale = d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueIds);
      const items = uniqueIds.slice(0, MAX_CATEGORICAL_ITEMS).map(idStr => ({
        label: `ID: ${idStr}`,
        color: colorScale(idStr),
      }));
      return { title, items, type: 'categorical' as 'categorical', totalItems: uniqueIds.length };
    }

    if (NODE_METRIC_KEYS.includes(nodeColoringMetric as NodeNumericMetricKey)) {
      const metricKey = nodeColoringMetric as NodeNumericMetricKey;
      const visibleNodeValues = nodes.map(n => (n as any)[metricKey] as number)
                                .filter(v => typeof v === 'number' && !isNaN(v));
      
      let domain: [number, number] = [0, 1];

      if (visibleNodeValues.length > 0) {
        let minVal = Math.min(...visibleNodeValues);
        let maxVal = Math.max(...visibleNodeValues);
        if (minVal === maxVal) {
            domain = [minVal - 0.5, maxVal + 0.5];
            if (minVal === 0) domain = [-0.5, 0.5];
        } else {
            domain = [minVal, maxVal];
        }
      } else if (dataRanges[metricKey]) {
        const dr = dataRanges[metricKey];
        if (dr.min === dr.max) {
            domain = [dr.min - 0.5, dr.max + 0.5];
            if (dr.min === 0) domain = [-0.5, 0.5];
        } else {
            domain = [dr.min, dr.max];
        }
      }
      
      if (typeof domain[0] !== 'number' || typeof domain[1] !== 'number' || isNaN(domain[0]) || isNaN(domain[1]) || domain[0] > domain[1]) {
        domain = [0, 1];
      }
      if (domain[0] === 0 && domain[1] === 0) {
        domain = [-0.5, 0.5];
      }
      
      const interpolator = D3_SEQUENTIAL_INTERPOLATORS[sequentialColorPalette] || d3.interpolateViridis;
      const colorScale = d3.scaleSequential(interpolator).domain(domain);
      
      const numTicks = 5;
      let tickValues = d3.ticks(domain[0], domain[1], numTicks);
       
      if (!tickValues.includes(domain[0])) tickValues.unshift(domain[0]);
      if (!tickValues.includes(domain[1])) tickValues.push(domain[1]);
      
      let finalTickValues = [...new Set(tickValues)]
                                .sort((a,b) => a-b)
                                .filter(v => typeof v === 'number' && !isNaN(v));

      if (finalTickValues.length === 0) {
         finalTickValues = [domain[0], domain[1]].filter(v => typeof v === 'number' && !isNaN(v)) ;
         if(finalTickValues.length === 0) finalTickValues = [0,1];
      }
      if (finalTickValues.length === 1 && finalTickValues[0] === domain[0] && domain[0] !== domain[1]) {
        finalTickValues.push(domain[1]);
        finalTickValues.sort((a,b) => a-b);
      }

      const items = finalTickValues.map(value => ({
        label: formatLegendValue(value),
        color: colorScale(value),
      }));
      return { title, items, type: 'sequential' as 'sequential', domain };
    }

    if (nodes.length === 0) {
        return { title, items: [], type: 'categorical', domain: [0,1] };
    }
    return { title: 'Legend', items: [], type: 'categorical' as 'categorical' }; 
  }, [nodes, nodeColoringMetric, dataRanges, sequentialColorPalette]);

  const shouldRenderContent = 
    (legendData.items.length > 0 && legendData.type !== 'sequential') ||
    (legendData.type === 'sequential' && legendData.domain && legendData.items.length >= 2);

  if (!shouldRenderContent && !isOpen) return null; // Don't render if nothing to show and closed
  if (!shouldRenderContent && isOpen) {
     // Still render the header if it's open but no content
  } else if (legendData.items.length === 0 && legendData.type !== 'sequential') {
      return null; // Don't render if no categorical items
  }


  return (
    <div 
      className={`p-2.5 bg-slate-700/80 backdrop-blur-sm rounded-lg shadow-xl absolute bottom-3 right-3 ${isOpen ? 'max-h-60' : ''} overflow-hidden text-xs border border-slate-600/60 custom-scrollbar`} 
      aria-label={legendData.title}
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-300 rounded-sm"
        aria-expanded={isOpen}
        aria-controls="legend-content"
        title={`Click to ${isOpen ? 'collapse' : 'expand'} legend`}
      >
        <h4 className="font-semibold text-slate-100 text-xs tracking-wide">{legendData.title}</h4>
        <ChevronDownIcon className={`text-slate-300 ${isOpen ? 'transform rotate-180' : ''}`} />
      </button>
      
      {isOpen && shouldRenderContent && (
        <div id="legend-content" className={`mt-2 ${isOpen ? 'max-h-48 overflow-y-auto custom-scrollbar' : ''}`}>
          {legendData.type === 'categorical' && (
            <div className="max-h-44 overflow-y-auto custom-scrollbar pr-1">
              {legendData.items.map(item => (
                <div key={item.label} className="flex items-center space-x-1.5 mb-1">
                  <div
                    className="w-2.5 h-2.5 rounded-sm border border-gray-400/40 flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                    aria-hidden="true"
                  ></div>
                  <span className="text-slate-200 text-[10px] truncate" title={item.label}>{item.label}</span>
                </div>
              ))}
            </div>
          )}
          {legendData.type === 'categorical' && legendData.totalItems && legendData.totalItems > MAX_CATEGORICAL_ITEMS && (
            <p className="text-slate-300/80 mt-1.5 text-[10px] text-center">...and {legendData.totalItems - MAX_CATEGORICAL_ITEMS} more</p>
          )}

          {legendData.type === 'sequential' && legendData.domain && legendData.items.length >= 2 && (
            <div className="space-y-1 pt-1">
              <div className="w-full h-3.5 rounded-sm" 
                  style={{ background: `linear-gradient(to right, ${legendData.items.map(i => i.color).join(',')})` }}
                  title={`Gradient from ${formatLegendValue(legendData.domain[0])} to ${formatLegendValue(legendData.domain[1])}`}
              ></div>
              <div className="flex justify-between text-[10px] text-slate-300 px-0.5">
                <span title={`Minimum value in range: ${formatLegendValue(legendData.domain[0])}`}>{formatLegendValue(legendData.domain[0])}</span>
                <span title={`Maximum value in range: ${formatLegendValue(legendData.domain[1])}`}>{formatLegendValue(legendData.domain[1])}</span>
              </div>
            </div>
          )}
        </div>
      )}
      {isOpen && !shouldRenderContent && (
         <p className="text-slate-400 text-[10px] mt-1.5 italic">No legend data to display for current settings.</p>
      )}
    </div>
  );
};

export default React.memo(Legend);
