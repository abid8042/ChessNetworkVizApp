
import React from 'react';
import { GraphScope } from '../../types';
import { GRAPH_SCOPE_OPTIONS } from '../../constants';

interface GraphScopeSelectorProps {
  currentScope: GraphScope;
  onScopeChange: (scope: GraphScope) => void;
  disabled: boolean;
}

const GraphScopeSelector: React.FC<GraphScopeSelectorProps> = ({ currentScope, onScopeChange, disabled }) => {
  const scopeDescriptions: Record<GraphScope, string> = {
    'combined': 'Combined Scope: Visualizes the influences and connections from both White and Black pieces together on the board. Shows the complete interaction network.',
    'white': "White Pieces Scope: Focuses exclusively on White pieces and the squares they influence or control. Useful for analyzing White's board presence and control.",
    'black': "Black Pieces Scope: Focuses exclusively on Black pieces and the squares they influence or control. Useful for analyzing Black's board presence and control."
  };
  
  return (
    <div className={`py-2 ${disabled ? 'opacity-60' : ''}`}>
      <label htmlFor="graph-scope-selector" className="block text-sm font-medium text-slate-200 mb-1.5" title="Select which set of pieces and their influences to display in the graph. This changes the underlying data used for visualization and statistics.">
        Graph Scope
      </label>
      <select
        id="graph-scope-selector"
        value={currentScope}
        onChange={(e) => onScopeChange(e.target.value as GraphScope)}
        className="block w-full pl-3 pr-10 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 rounded-lg shadow-sm transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-300/20 disabled:text-slate-400"
        disabled={disabled}
        aria-label="Select graph scope: which pieces' influences are shown"
        title="Determines which set of pieces (Combined, White only, or Black only) and their influences are visualized in the graph and used for metric calculations."
      >
        {GRAPH_SCOPE_OPTIONS.map(option => (
          <option 
            key={option.value} 
            value={option.value} 
            className="text-slate-800"
            title={scopeDescriptions[option.value] || `Set graph scope to ${option.label}`}
          >
            {option.label}
          </option>
        ))}
      </select>
      {disabled && <p className="text-xs text-slate-400 mt-2">Load data to select scope.</p>}
    </div>
  );
};

export default React.memo(GraphScopeSelector);
