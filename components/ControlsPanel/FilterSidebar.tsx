
import React from 'react';
import { FiltersState, DataRangesForFilters, FilterMetricKey, PIECE_TYPE_MAP, PIECE_TYPE_IDS, PIECE_COLOR_MAP, ProcessedNode } from '../../types';
import NodeSearch from './NodeSearch';
import PieceFilter from './PieceFilter';
import CommunityComponentFilter from './CommunityComponentFilter';
import DegreeCentralityFilter from './DegreeCentralityFilter';
import GraphMetricNodeFilters from './GraphMetricNodeFilters';

const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-4 h-4 transition-transform duration-200 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

interface FilterCollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  actionButton?: React.ReactNode; // New prop for an action button in the header
  tooltip?: string; // Added tooltip prop
}

const FilterCollapsibleSection: React.FC<FilterCollapsibleSectionProps> = ({ title, children, defaultOpen = false, actionButton, tooltip }) => {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <div className="bg-slate-600/60 rounded-lg border border-slate-500/70">
      <div className={`flex justify-between items-center w-full p-2.5 text-left hover:bg-slate-500/70 transition-colors duration-150 ${isOpen ? 'rounded-t-lg' : 'rounded-lg'}`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-grow flex items-center text-xs font-medium text-slate-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
          aria-expanded={isOpen}
          title={tooltip || `Click to ${isOpen ? 'collapse' : 'expand'} ${title} section`}
        >
          <span>{title}</span>
          <ChevronDownIcon className={`${isOpen ? 'transform rotate-180' : ''} text-slate-400 ml-1.5`} />
        </button>
        {actionButton && <div className="flex-shrink-0 ml-2">{actionButton}</div>}
      </div>
      {isOpen && (
        <div className="p-2.5 border-t border-slate-500/70 space-y-2.5">
          {children}
        </div>
      )}
    </div>
  );
};

interface FilterSidebarProps {
  filters: FiltersState;
  onFilterChange: <K extends keyof FiltersState>(filterType: K, value: FiltersState[K]) => void;
  onNumericFilterChange: (filterKey: FilterMetricKey, newRange: { min?: number; max?: number }) => void;
  dataRanges: DataRangesForFilters;
  processedNodes: ProcessedNode[]; 
  disabled: boolean;
  isNodeSelected: boolean;
  // onResetFilters prop is now implicitly handled by the actionButton mechanism in App.tsx's CollapsibleSection for "Filters & Search"
}

const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  onFilterChange,
  onNumericFilterChange,
  dataRanges,
  processedNodes,
  disabled,
  isNodeSelected 
}) => {
  const uniqueComponentIds = React.useMemo(() => {
    if (!processedNodes) return [];
    return Array.from(new Set(processedNodes.map(n => n.component_id))).sort((a,b) => a-b);
  }, [processedNodes]);

  const uniqueCommunityIds = React.useMemo(() => {
     if (!processedNodes) return [];
    return Array.from(new Set(processedNodes.map(n => n.community_id))).sort((a,b) => a-b);
  }, [processedNodes]);


  if (disabled) {
    return (
      <div className="opacity-60 p-2">
        <p className="text-xs text-slate-400">Filters are unavailable until data is loaded.</p>
      </div>
    );
  }
  // The main "Filters & Search" CollapsibleSection is now defined in App.tsx,
  // and this component renders its content.
  return (
    <div className="space-y-3"> 
        {/* This component now renders the *content* of the main filter section */}
        {/* The "Reset Filters" button is passed to CollapsibleSection in App.tsx */}
        
        <FilterCollapsibleSection 
          title="Search & Piece Filters" 
          defaultOpen={true}
          tooltip="Filter nodes by text search (square ID or piece symbol), piece type (e.g., Pawn, Knight), or piece color (White/Black)."
        >
            <NodeSearch
              searchTerm={filters.searchTerm}
              onSearchTermChange={(val) => onFilterChange('searchTerm', val)}
            />
            <PieceFilter
                selectedPieceTypes={filters.pieceTypes}
                selectedPieceColor={filters.pieceColor}
                onPieceTypeChange={(val) => onFilterChange('pieceTypes', val)}
                onPieceColorChange={(val) => onFilterChange('pieceColor', val)}
                pieceTypeMap={PIECE_TYPE_MAP}
                pieceTypeIds={PIECE_TYPE_IDS}
                pieceColorMap={PIECE_COLOR_MAP}
            />
        </FilterCollapsibleSection>
        
        <FilterCollapsibleSection 
          title="Structural Filters"
          tooltip="Filter nodes based on their graph component ID (separate subgraphs) or community ID (densely connected clusters within components)."
        >
            <CommunityComponentFilter
                selectedComponentIds={filters.componentIds}
                selectedCommunityIds={filters.communityIds}
                onComponentIdChange={(val) => onFilterChange('componentIds', val)}
                onCommunityIdChange={(val) => onFilterChange('communityIds', val)}
                availableComponentIds={uniqueComponentIds}
                availableCommunityIds={uniqueCommunityIds}
            />
        </FilterCollapsibleSection>
        
        <FilterCollapsibleSection 
          title="Centrality Metric Filters"
          tooltip="Filter nodes by their in-degree or out-degree centrality values. Centrality measures a node's importance in the network based on its connections."
        >
            <DegreeCentralityFilter
                filters={filters}
                dataRanges={dataRanges}
                onNumericFilterChange={onNumericFilterChange}
            />
        </FilterCollapsibleSection>
        
        <FilterCollapsibleSection 
          title="Other Node Metric Filters"
          tooltip="Filter nodes by various other calculated graph metrics, such as degree variance, component averages, and deviation from those averages. These provide more nuanced views of node characteristics."
        >
            <GraphMetricNodeFilters
                filters={filters}
                dataRanges={dataRanges}
                onNumericFilterChange={onNumericFilterChange}
            />
        </FilterCollapsibleSection>
    </div>
  );
};

export default FilterSidebar;
