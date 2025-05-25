
import React from 'react';
import { SortConfig } from '../../types';
import { SORTABLE_NODE_METRICS } from '../../constants';

const ArrowUpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-3.5 h-3.5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" />
  </svg>
);

const ArrowDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-3.5 h-3.5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);


interface SortOptionsProps {
  sortConfig: SortConfig;
  onSortChange: (key: string, order: 'asc' | 'desc') => void;
  disabled: boolean;
}

const SortOptions: React.FC<SortOptionsProps> = ({ sortConfig, onSortChange, disabled }) => {
  if (disabled) {
    return (
      <div className="pt-1 pb-2 opacity-60">
        <p className="text-sm font-medium text-slate-400 mb-1.5">Sort Nodes By</p>
        <p className="text-xs text-slate-500">Load data to enable sorting.</p>
      </div>
    );
  }

  const currentOrderText = sortConfig.order === 'asc' ? 'Ascending' : 'Descending';
  const buttonAriaLabel = `Change sort order. Current order is ${currentOrderText}. Click to switch to ${sortConfig.order === 'asc' ? 'Descending' : 'Ascending'}.`;
  const buttonTitle = `Current sort order: ${currentOrderText} (for ${SORTABLE_NODE_METRICS.find(m => m.key === sortConfig.key)?.label || sortConfig.key}). Click to switch to ${sortConfig.order === 'asc' ? 'Descending' : 'Ascending'}.`;
  const selectedMetricLabel = SORTABLE_NODE_METRICS.find(m => m.key === sortConfig.key)?.label || sortConfig.key;

  return (
    <div className="pt-1 pb-2">
      <p className="block text-sm font-medium text-slate-200 mb-1.5" title="Define the primary attribute and order for sorting nodes. This affects the node order in some lists and is crucial for layouts like Radial (for ring order) and Spiral (for path order).">Sort Nodes By</p>
      
      <select
        value={sortConfig.key}
        onChange={(e) => onSortChange(e.target.value, sortConfig.order)}
        className="w-full pl-3 pr-8 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 rounded-lg shadow-sm transition-colors duration-150"
        aria-label="Select sort metric for nodes"
        title={`Select the metric by which nodes will be sorted. Currently sorting by: ${selectedMetricLabel}. This impacts node lists and certain layouts (e.g., Radial, Spiral).`}
        disabled={disabled}
      >
        {SORTABLE_NODE_METRICS.map(metric => (
          <option key={metric.key} value={metric.key} className="text-slate-800" title={`Sort nodes by ${metric.label}`}>{metric.label}</option>
        ))}
      </select>

      <div className="flex justify-end mt-1.5">
        <button
          onClick={() => onSortChange(sortConfig.key, sortConfig.order === 'asc' ? 'desc' : 'asc')}
          className="px-2.5 py-[7px] border border-slate-500 rounded-lg shadow-sm text-slate-200 bg-slate-600 hover:bg-slate-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-700 focus:ring-sky-400 transition-colors duration-150 flex items-center space-x-1.5 text-xs"
          aria-label={buttonAriaLabel}
          title={buttonTitle}
          disabled={disabled}
        >
          {sortConfig.order === 'asc' ? <ArrowUpIcon className="flex-shrink-0" /> : <ArrowDownIcon className="flex-shrink-0" />}
          <span>{currentOrderText}</span>
        </button>
      </div>
    </div>
  );
};

export default React.memo(SortOptions);
