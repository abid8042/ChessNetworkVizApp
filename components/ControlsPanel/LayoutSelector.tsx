
import React, { useState } from 'react';
import { LayoutType, TooltipData } from '../../types';
import { LAYOUT_OPTIONS } from '../../constants';
import Tooltip from '../VisualizationPanel/Tooltip'; // Import Tooltip

// Define HelpIcon directly in this component as it's simple and specific here
// Fixed: Updated onMouseOver prop type to accept React.MouseEvent, React.FocusEvent, or React.KeyboardEvent
const HelpIcon: React.FC<{ className?: string; onMouseOver: (e: React.MouseEvent | React.FocusEvent | React.KeyboardEvent) => void; onMouseOut: () => void; ariaLabel: string }> = ({ className, onMouseOver, onMouseOut, ariaLabel }) => (
  <svg 
    className={`w-3.5 h-3.5 text-slate-400 hover:text-sky-300 cursor-help inline-block ml-1.5 flex-shrink-0 ${className || ''}`} 
    viewBox="0 0 20 20" 
    fill="currentColor" 
    aria-hidden="true"
    onMouseOver={onMouseOver}
    onMouseOut={onMouseOut}
    role="button" // Making it interactive
    tabIndex={0} // Make it focusable
    aria-label={ariaLabel}
    onFocus={onMouseOver} // Show tooltip on focus for keyboard users
    onBlur={onMouseOut} // Hide tooltip on blur
// Fixed: Ensure onMouseOver prop type includes KeyboardEvent, as it's called with a KeyboardEvent here.
    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onMouseOver(e); }} // Allow space/enter to trigger
  >
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.504l-1.414 2.121A1 1 0 008.586 10H9v2a1 1 0 102 0v-2.414a1 1 0 00-.293-.707l-1.414-1.414A1 1 0 009 7zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);


interface LayoutSelectorProps {
  currentLayout: LayoutType;
  onLayoutChange: (layout: LayoutType) => void;
  disabled: boolean;
}

const LayoutSelector: React.FC<LayoutSelectorProps> = ({ currentLayout, onLayoutChange, disabled }) => {
  const [activeHelpTooltip, setActiveHelpTooltip] = useState<TooltipData | null>(null);
  
  const layoutBriefDescriptions: Record<LayoutType, string> = {
    'force-directed': 'Force-Directed Layout: Simulates physical forces to arrange nodes. Good for discovering organic structures.',
    'radial': 'Radial Layout: Arranges nodes in concentric circles. Useful for hierarchical or categorical data.',
    'spiral': 'Spiral Layout (Fixed Path): Places nodes along a pre-defined spiral path, ordered by sort configuration.'
  };

  const detailedLayoutDescriptions: Record<LayoutType, React.ReactNode> = {
    'force-directed': (
      <div className="text-left max-w-md">
        <p className="font-semibold mb-1.5">Force-Directed Layout</p>
        <p className="mb-1">Positions nodes using a physics-based simulation.</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs mb-1">
          <li><strong>Attraction & Repulsion:</strong> Linked nodes attract (like springs), all nodes repel (like magnets).</li>
          <li><strong>Dynamic Positioning:</strong> Nodes evolve to a stable state where forces balance.</li>
          <li><strong>Organic Structure Discovery:</strong> Excellent for revealing inherent clusters, central nodes, and bridges.</li>
        </ul>
        <p className="font-medium text-xs mb-0.5">Usefulness:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs mb-1.5">
          <li>Identifying natural groupings and communities.</li>
          <li>Understanding overall topology and connectivity.</li>
          <li>Visualizing complex networks with unknown structures.</li>
        </ul>
        <p className="text-xs">Adjust parameters (link distance/strength, charge, centering) in "Force-Directed Parameters" to fine-tune.</p>
      </div>
    ),
    'radial': (
      <div className="text-left max-w-md">
        <p className="font-semibold mb-1.5">Radial Layout</p>
        <p className="mb-1">Arranges nodes in concentric circles, like ripples in a pond.</p>
        <p className="font-medium text-xs mb-0.5">How it works in this app:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs mb-1">
          <li><strong>Grouping:</strong> Nodes grouped by their `groupTag` (component_id + community_id).</li>
          <li><strong>Ordering Rings:</strong> Groups ordered by "Sort Nodes By" config. E.g., sort by Component ID for inner/outer rings based on ID. Numeric metrics use group average.</li>
          <li><strong>Placing Nodes:</strong> Each group forms a ring; nodes spread angularly within their ring.</li>
        </ul>
        <p className="font-medium text-xs mb-0.5">Usefulness:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs mb-1.5">
          <li>Visualizing hierarchical or categorical data in layers.</li>
          <li>Clearly showing component/community membership on distinct rings.</li>
          <li>Visualizing how sorted metrics change across structural groups.</li>
        </ul>
        <p className="text-xs">Adjust "Radial Parameters" (ring strength, link settings, radius factors) for appearance.</p>
      </div>
    ),
    'spiral': (
      <div className="text-left max-w-md">
        <p className="font-semibold mb-1.5">Spiral Layout (Fixed Path)</p>
        <p className="mb-1">Arranges nodes along a predetermined spiral path.</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs mb-1">
          <li><strong>Fixed Positions:</strong> Node positions are calculated once and remain fixed.</li>
          <li><strong>Order-Dependent:</strong> Node position primarily determined by its rank from "Sort Nodes By" config.</li>
          <li><strong>Path Visualization:</strong> Nodes placed sequentially along an Archimedean spiral, outward from center.</li>
        </ul>
        <p className="font-medium text-xs mb-0.5">Usefulness:</p>
        <ul className="list-disc list-inside space-y-0.5 text-xs mb-1.5">
          <li>Visualizing data where sequence or rank is paramount (e.g., ranked lists).</li>
          <li>Providing a compact, ordered representation for linear progressions.</li>
          <li>Comparing attributes based on sequential position.</li>
        </ul>
        <p className="text-xs">Adjust "Spiral Parameters" (Number of Coils, Max Radius Margin) for spiral shape. Link parameters affect visual clarity.</p>
      </div>
    ),
  };

  // Fixed: Updated event type to accept React.MouseEvent or React.FocusEvent
  const showHelpTooltip = (event: React.MouseEvent | React.FocusEvent | React.KeyboardEvent, layoutValue: LayoutType) => {
    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    setActiveHelpTooltip({
      content: detailedLayoutDescriptions[layoutValue],
      x: targetRect.right + 5, // Position to the right of the icon
      y: targetRect.top + window.scrollY, // Align with the top of the icon
      visible: true,
    });
  };

  const hideHelpTooltip = () => {
    setActiveHelpTooltip(null);
  };

  return (
    <>
      <div className={`py-2 ${disabled ? 'opacity-60' : ''}`}>
        <p className="block text-sm font-medium text-slate-200 mb-2" title="Choose the algorithm used to position nodes in the graph visualization. Different layouts highlight different aspects of the network structure.">Layout Algorithm</p>
        <div className="space-y-1.5">
          {LAYOUT_OPTIONS.map(option => (
            <div 
              key={option.value} 
              className={`flex items-center p-2.5 rounded-lg transition-colors duration-150 ${disabled ? 'cursor-not-allowed' : 'hover:bg-slate-600/70' } ${currentLayout === option.value ? 'bg-sky-700/40' : 'bg-slate-700/50 hover:bg-slate-600'}`}
            >
              <input
                type="radio"
                name="layout"
                id={`layout-option-${option.value}`}
                value={option.value}
                checked={currentLayout === option.value}
                onChange={() => onLayoutChange(option.value)}
                className="form-radio h-4 w-4 text-sky-400 bg-slate-500 border-slate-400 focus:ring-2 focus:ring-sky-400 focus:ring-offset-2 focus:ring-offset-slate-700 transition duration-150 ease-in-out disabled:cursor-not-allowed"
                disabled={disabled}
                aria-label={option.label}
              />
              <label 
                htmlFor={`layout-option-${option.value}`}
                className={`ml-2.5 text-sm ${currentLayout === option.value ? 'text-sky-200 font-medium' : 'text-slate-300'} ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                title={layoutBriefDescriptions[option.value] || `Select ${option.label} layout`}
              >
                {option.label}
              </label>
              <HelpIcon 
                onMouseOver={(e) => showHelpTooltip(e, option.value)} 
                onMouseOut={hideHelpTooltip}
                ariaLabel={`More information about ${option.label} layout`}
              />
            </div>
          ))}
        </div>
        {disabled && <p className="text-xs text-slate-400 mt-2">Load data to select layout.</p>}
      </div>
      {activeHelpTooltip && <Tooltip {...activeHelpTooltip} />}
    </>
  );
};

export default React.memo(LayoutSelector);