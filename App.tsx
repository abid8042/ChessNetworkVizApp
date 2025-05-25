
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// Corrected typo in d3 import: changed 'σία' to 'as'
import * as d3 from 'd3';
import {
  RawChessData, Move, ProcessedGraphData, FiltersState, SortConfig,
  LayoutType, GraphScope, TooltipData, ProcessedNode, Piece,
  NODE_METRIC_KEYS, FilterMetricKey, NodeColoringMetricId, NodeNumericMetricKey,
  LayoutParamsState, LayoutParamKey, SequentialColorPaletteId
} from './types';
// Corrected import path for constants
import { INITIAL_FILTERS_STATE, INITIAL_FILTER_VALUE_RANGE } from './constants';
import { DEFAULT_LAYOUT_PARAMS } from './src/constants'; // Import default layout params
import { processMoveData, applyFiltersAndSort, getCapturedPieces } from './utils/dataProcessor';
import { validateSchema } from './utils/schemaValidator'; // Import validateSchema


import FileUpload from './components/ControlsPanel/FileUpload';
import MoveSelector from './components/ControlsPanel/MoveSelector';
import LayoutSelector from './components/ControlsPanel/LayoutSelector';
import GraphScopeSelector from './components/ControlsPanel/GraphScopeSelector';
import NodeColoringSelector from './components/ControlsPanel/NodeColoringSelector';
import SequentialColorPaletteSelector from './components/ControlsPanel/SequentialColorPaletteSelector'; // New Import
import LayoutParametersEditor from './components/ControlsPanel/LayoutParametersEditor';
import FilterSidebar from './components/ControlsPanel/FilterSidebar';
import SortOptions from './components/ControlsPanel/SortOptions';
import NetworkGraph from './components/VisualizationPanel/NetworkGraph';
import Tooltip from './components/VisualizationPanel/Tooltip';
import Legend from './components/VisualizationPanel/Legend';
import StatsDisplay from './components/InfoPanel/StatsDisplay';
import CapturedPiecesDisplay from './components/InfoPanel/CapturedPieces';
import SelectedNodeInfo from './components/InfoPanel/SelectedNodeInfo';
import useResizeObserver from './hooks/useResizeObserver';

// Icons
const ChevronDownIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 transition-transform duration-200 ${className}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);

const RefreshIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`w-4 h-4 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        <path fillRule="evenodd" d="M15.322 10.707a5.001 5.001 0 00-7.59-4.152L6.455 7.83A3.001 3.001 0 0111.95 9.57l.975 1.013a1 1 0 01-1.438 1.392l-1.303-.782a3.001 3.001 0 01-3.583-2.508L2.85 5.505a1 1 0 011.04-1.634l2.692.976A5.001 5.001 0 0015.322 10.707zm-.827 3.289a1 1 0 01-1.04 1.634l-2.691-.976a5.001 5.001 0 00-7.772-5.638L4.678 9.293a1 1 0 011.438-1.392l1.303.782a3.001 3.001 0 013.583 2.508l3.755 2.176a1 1 0 01-.696 1.81z" clipRule="evenodd" />
    </svg>
);

const DatabaseIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M3 5a2 2 0 012-2h10a2 2 0 012 2v2.28a1 1 0 01-.4.8L12 10.4V15a1 1 0 01-1 1H9a1 1 0 01-1-1v-4.6L3.4 8.08A1 1 0 013 7.28V5zm1 0v1.586l4.293 2.146a.5.5 0 00.414 0L13 6.586V5H4zm10.293 8.293a1 1 0 011.414 0l.001.001.001.001a1.002 1.002 0 010 1.413l-.001.001a1.002 1.002 0 01-1.414 0L12 13.414l-2.293 2.293a1 1 0 01-1.414-1.414l2.293-2.293L9.172 10.5H10V8H8v2.5a.5.5 0 00.146.354l2.5 2.5zM10 11.414l-1.293-1.293a1 1 0 010-1.414L10 7.414l1.293 1.293a1 1 0 010 1.414L10 11.414z" clipRule="evenodd" />
    {/* Simplified Database Icon Path:
    <path d="M3 5a2 2 0 012-2h10a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V5zm2 0v2h10V5H5zm0 4v2h10V9H5zm0 4v2h10v-2H5z" />
    */}
  </svg>
);


interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  headerClassName?: string;
  contentClassName?: string;
  actionButton?: React.ReactNode;
  tooltip?: string; // Added tooltip for the section header
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({ title, children, defaultOpen = true, className, headerClassName, contentClassName, actionButton, tooltip }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`bg-slate-700 rounded-xl shadow-md border border-slate-600/80 ${className || ''}`}>
      <div className={`flex justify-between items-center w-full p-3 text-left ${headerClassName || ''} ${isOpen ? 'rounded-t-xl' : 'rounded-xl'} hover:bg-slate-600/70 transition-colors duration-150`}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-grow flex items-center text-sm font-semibold text-slate-100 focus:outline-none"
          aria-expanded={isOpen}
          title={tooltip || `Click to ${isOpen ? 'collapse' : 'expand'} the '${title}' section`}
        >
          <span>{title}</span>
          <ChevronDownIcon className={`ml-2 text-slate-300 ${isOpen ? 'transform rotate-180' : ''}`} />
        </button>
        {actionButton && <div className="flex-shrink-0 ml-2">{actionButton}</div>}
      </div>
      {isOpen && (
        <div className={`p-3 border-t border-slate-600/80 ${contentClassName || ''}`}>
          {children}
        </div>
      )}
    </div>
  );
};


const App: React.FC = () => {
  const [rawData, setRawData] = useState<RawChessData | null>(null);
  const [currentMoveIndex, setCurrentMoveIndex] = useState<number>(0);
  const [currentLayout, setCurrentLayout] = useState<LayoutType>('force-directed');
  const [currentGraphScope, setCurrentGraphScope] = useState<GraphScope>('combined');
  const [nodeColoringMetric, setNodeColoringMetric] = useState<NodeColoringMetricId>('default');
  const [sequentialColorPalette, setSequentialColorPalette] = useState<SequentialColorPaletteId>('plasma'); 
  const [layoutParams, setLayoutParams] = useState<LayoutParamsState>(DEFAULT_LAYOUT_PARAMS);
  
  const [filters, setFilters] = useState<FiltersState>(INITIAL_FILTERS_STATE);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'id', order: 'asc' });
  
  const [tooltipData, setTooltipData] = useState<TooltipData | null>(null);
  const [selectedNodeData, setSelectedNodeData] = useState<ProcessedNode | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [currentDataSourceName, setCurrentDataSourceName] = useState<string | null>(null); // New state

  const visualizationContainerRef = useRef<HTMLDivElement>(null);
  const svgDimensions = useResizeObserver(visualizationContainerRef);

  const currentMoveData: Move | null = useMemo(() => {
    if (!rawData || rawData.moves.length === 0) return null;
    return rawData.moves[Math.min(currentMoveIndex, rawData.moves.length - 1)];
  }, [rawData, currentMoveIndex]);

  const processedGraphData: ProcessedGraphData | null = useMemo(() => {
    if (!currentMoveData) return null;
    return processMoveData(currentMoveData, currentGraphScope);
  }, [currentMoveData, currentGraphScope]);
  
  useEffect(() => {
    if (processedGraphData?.dataRangesForFilters) {
      setFilters(prevFilters => {
        const newFiltersState = { ...prevFilters };
        let hasChanges = false;

        NODE_METRIC_KEYS.forEach(key => {
          const metricKey = key as FilterMetricKey;
          const newDataRange = processedGraphData.dataRangesForFilters[metricKey]; 
          const oldFilterSetting = prevFilters[metricKey] || {...INITIAL_FILTER_VALUE_RANGE}; 

          if (newDataRange) {
            if (oldFilterSetting.dataMin !== newDataRange.min || oldFilterSetting.dataMax !== newDataRange.max) {
              newFiltersState[metricKey] = {
                currentMin: newDataRange.min,
                currentMax: newDataRange.max,
                dataMin: newDataRange.min,
                dataMax: newDataRange.max,
              };
              hasChanges = true;
            } else {
              let currentMin = oldFilterSetting.currentMin;
              let currentMax = oldFilterSetting.currentMax;

              currentMin = Math.max(newDataRange.min, Math.min(newDataRange.max, currentMin));
              currentMax = Math.max(newDataRange.min, Math.min(newDataRange.max, currentMax));

              if (currentMin > currentMax) { 
                currentMax = currentMin; 
              }
              
              if (currentMin !== oldFilterSetting.currentMin || currentMax !== oldFilterSetting.currentMax) {
                newFiltersState[metricKey] = {
                  ...oldFilterSetting, 
                  currentMin: currentMin,
                  currentMax: currentMax,
                };
                hasChanges = true;
              }
            }
          }
        });
        return hasChanges ? newFiltersState : prevFilters;
      });
    }
  }, [processedGraphData]);


  const displayData = useMemo(() => {
    if (!processedGraphData) return { filteredSortedNodes: [], filteredLinks: [] };
    return applyFiltersAndSort(processedGraphData.nodes, processedGraphData.links, filters, sortConfig);
  }, [processedGraphData, filters, sortConfig]);

  const capturedPiecesList: Piece[] = useMemo(() => {
    if (!rawData) return [];
    return getCapturedPieces(rawData.moves, currentMoveIndex);
  }, [rawData, currentMoveIndex]);
  
  const handleDataLoaded = useCallback((data: RawChessData | null, sourceName: string) => {
    setRawData(data);
    setCurrentDataSourceName(sourceName);
    setCurrentMoveIndex(0); 
    setSelectedNodeData(null);
    setError(null); // Clear previous errors
    setNodeColoringMetric('default'); 
    setSequentialColorPalette('plasma');
    setLayoutParams(DEFAULT_LAYOUT_PARAMS);

    if (data && data.moves.length > 0) {
        const initialProcessedData = processMoveData(data.moves[0], currentGraphScope);
        const initialFilters = {...INITIAL_FILTERS_STATE};
        NODE_METRIC_KEYS.forEach(key => {
            const metricKey = key as FilterMetricKey;
            const dataRange = initialProcessedData.dataRangesForFilters[metricKey];
            if (dataRange) {
                initialFilters[metricKey] = {
                    currentMin: dataRange.min,
                    currentMax: dataRange.max,
                    dataMin: dataRange.min,
                    dataMax: dataRange.max,
                };
            }
        });
        setFilters(initialFilters);
    } else {
        setFilters(INITIAL_FILTERS_STATE);
        if (!data && sourceName) { // If data is null but sourceName was attempted (e.g. failed load)
            // Error will be set by the caller
        } else if (!sourceName) { // Explicitly reset
            setCurrentDataSourceName(null);
        }
    }
  }, [currentGraphScope]);


  const handleLoadSampleData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch('sample-chess-data.json'); // Use simple relative path
      if (!response.ok) {
        throw new Error(`Failed to fetch sample data: ${response.status} ${response.statusText}`);
      }
      const text = await response.text();
      const validationResult = validateSchema(text);
      if (validationResult.isValid && validationResult.data) {
        handleDataLoaded(validationResult.data, "Sample Game Data");
      } else {
        setError(validationResult.error || 'Unknown error validating sample data.');
        handleDataLoaded(null, ''); // Clear data if sample load fails
      }
    } catch (err) {
      setError(`Error loading sample data: ${(err as Error).message}`);
      console.error("Sample Data Loading Error:", err);
      handleDataLoaded(null, ''); // Clear data on error
    } finally {
      setIsLoading(false);
    }
  }, [handleDataLoaded]);


  const handleMoveChange = useCallback((newMoveIndex: number) => {
    const totalMoves = rawData?.moves.length || 0;
    if (newMoveIndex >= 0 && newMoveIndex < totalMoves) {
      setCurrentMoveIndex(newMoveIndex);
      setSelectedNodeData(null); 
    }
  }, [rawData]);

  const handleLayoutChange = useCallback((layout: LayoutType) => {
    setCurrentLayout(layout);
  }, []);

  const handleGraphScopeChange = useCallback((scope: GraphScope) => {
    setCurrentGraphScope(scope);
    setSelectedNodeData(null); 
  }, []);

  const handleNodeColoringMetricChange = useCallback((metricId: NodeColoringMetricId) => {
    setNodeColoringMetric(metricId);
  }, []);

  const handleSequentialColorPaletteChange = useCallback((paletteId: SequentialColorPaletteId) => {
    setSequentialColorPalette(paletteId);
  }, []);
  
  const handleLayoutParamChange = useCallback(<T extends LayoutType>(
    layoutType: T, 
    paramName: LayoutParamKey<T>, 
    value: number
  ) => {
    setLayoutParams(prevParams => ({
      ...prevParams,
      [layoutType]: {
        ...prevParams[layoutType],
        [paramName]: value,
      },
    }));
  }, []);

  const handleResetLayoutTypeParams = useCallback((layoutType: LayoutType) => {
    setLayoutParams(prevParams => ({
        ...prevParams,
        [layoutType]: DEFAULT_LAYOUT_PARAMS[layoutType]
    }));
  }, []);


  const handleFilterChange = useCallback(<K extends keyof FiltersState>(filterType: K, value: FiltersState[K]) => {
    setFilters(prev => ({ ...prev, [filterType]: value }));
  }, []);
  
  const handleNumericFilterChange = useCallback((filterKey: FilterMetricKey, newRange: {min?: number, max?: number}) => {
    setFilters(prevFilters => {
        const existingRange = prevFilters[filterKey];
        if (!existingRange) return prevFilters; 

        let currentMin = newRange.min ?? existingRange.currentMin;
        let currentMax = newRange.max ?? existingRange.currentMax;

        currentMin = Math.max(existingRange.dataMin, Math.min(existingRange.dataMax, currentMin));
        currentMax = Math.max(existingRange.dataMin, Math.min(existingRange.dataMax, currentMax));
        
        if (currentMin > currentMax) {
            if (newRange.min !== undefined && newRange.max === undefined) { 
                 currentMax = currentMin;
            } else if (newRange.max !== undefined && newRange.min === undefined) { 
                 currentMin = currentMax;
            }
        }

        return {
            ...prevFilters,
            [filterKey]: {
                ...existingRange,
                currentMin: currentMin,
                currentMax: currentMax,
            }
        };
    });
  }, []);

  const handleResetFilters = useCallback(() => {
    const newFiltersState: FiltersState = {
        searchTerm: '',
        pieceTypes: [],
        pieceColor: null,
        componentIds: [],
        communityIds: [],
        in_degree_centrality: { ...INITIAL_FILTER_VALUE_RANGE },
        out_degree_centrality: { ...INITIAL_FILTER_VALUE_RANGE },
        in_degree_centrality_variance: { ...INITIAL_FILTER_VALUE_RANGE },
        out_degree_centrality_variance: { ...INITIAL_FILTER_VALUE_RANGE },
        in_degree_component_avg: { ...INITIAL_FILTER_VALUE_RANGE },
        in_degree_deviation: { ...INITIAL_FILTER_VALUE_RANGE },
        out_degree_component_avg: { ...INITIAL_FILTER_VALUE_RANGE },
        out_degree_deviation: { ...INITIAL_FILTER_VALUE_RANGE },
    };

    if (processedGraphData?.dataRangesForFilters) {
        NODE_METRIC_KEYS.forEach(key => {
            const metricKey = key as FilterMetricKey;
            const dataRange = processedGraphData.dataRangesForFilters[metricKey];
            if (dataRange) {
                newFiltersState[metricKey] = {
                    currentMin: dataRange.min,
                    currentMax: dataRange.max,
                    dataMin: dataRange.min,
                    dataMax: dataRange.max,
                };
            }
        });
    }
    setFilters(newFiltersState);
  }, [processedGraphData]);


  const handleSortChange = useCallback((key: string, order: 'asc' | 'desc') => {
    setSortConfig({ key, order });
  }, []);

  const handleNodeHover = useCallback((data: TooltipData | null) => {
    setTooltipData(data);
  }, []);

  const handleNodeClick = useCallback((nodeData: ProcessedNode | null) => {
    setSelectedNodeData(nodeData);
  }, []);
  
  const appIsDisabled = !rawData;
  const currentLayoutParams = layoutParams[currentLayout];
  const currentLayoutLabel = currentLayout.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  const isNodeColoringNumeric = useMemo(() => {
    return NODE_METRIC_KEYS.includes(nodeColoringMetric as NodeNumericMetricKey);
  }, [nodeColoringMetric]);

  return (
    <div className="flex flex-col h-screen bg-slate-200 text-slate-800 antialiased">
      <header className="bg-slate-800 text-slate-100 py-2.5 px-4 shadow-lg sticky top-0 z-20 border-b border-slate-700 flex items-center justify-between">
        <div className="flex-none flex items-center space-x-2">
          <FileUpload 
            onFileUpload={handleDataLoaded} 
            setLoading={setIsLoading} 
            setError={setError} 
            disabled={isLoading}
            currentDataSourceName={currentDataSourceName}
          />
           <button
            onClick={handleLoadSampleData}
            disabled={isLoading}
            className={`flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-teal-500 hover:bg-teal-600 rounded-md border border-teal-700 shadow-sm transition-colors duration-150 focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-800 focus:ring-teal-400 ${isLoading ? 'opacity-60 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
            title="Load a built-in sample chess game to explore dashboard features"
          >
            <DatabaseIcon className="mr-1.5 h-4 w-4 text-teal-100 flex-shrink-0" />
            Load Sample
          </button>
        </div>
        <div className="flex-grow text-center px-4">
          <h1 className="text-xl font-semibold text-sky-300 tracking-tight truncate" title="Chess Network Visualization Dashboard">Chess Network Visualization</h1>
        </div>
        <div className="flex-none">
          <MoveSelector
            currentMoveIndex={currentMoveIndex}
            totalMoves={rawData?.moves.length || 0}
            currentMoveSAN={currentMoveData?.m || null}
            onMoveChange={handleMoveChange}
            disabled={appIsDisabled && !currentDataSourceName} // Disable if no data source
          />
        </div>
      </header>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-md relative m-4 shadow-lg" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
      )}
      {isLoading && !rawData && (
         <div className="bg-sky-100 border-l-4 border-sky-500 text-sky-700 px-4 py-3 rounded-md relative m-4 shadow-lg" role="status">
          <strong className="font-bold">Loading data... Please wait.</strong>
        </div>
      )}

      <div className="flex flex-1 overflow-hidden p-4 space-x-4">
        <aside className="w-80 xl:w-96 flex-shrink-0 flex flex-col space-y-3.5 overflow-y-auto custom-scrollbar pr-1.5">
            <CollapsibleSection 
              title="Display Settings" 
              defaultOpen={true}
              tooltip="Configure how the graph is displayed. Includes selecting the layout algorithm (e.g., Force-Directed), data scope (Combined, White, Black), node coloring scheme, sorting criteria for specific layouts, and fine-tuning parameters for the chosen layout."
            >
              <LayoutSelector currentLayout={currentLayout} onLayoutChange={handleLayoutChange} disabled={appIsDisabled} />
              <GraphScopeSelector currentScope={currentGraphScope} onScopeChange={handleGraphScopeChange} disabled={appIsDisabled} />
              <NodeColoringSelector
                currentColoringMetric={nodeColoringMetric}
                onColoringMetricChange={handleNodeColoringMetricChange}
                disabled={appIsDisabled || !processedGraphData}
              />
              {isNodeColoringNumeric && (!appIsDisabled && processedGraphData) && (
                 <CollapsibleSection
                    title="Sequential Color Palette"
                    defaultOpen={false} 
                    className="mt-2.5 !bg-slate-600/70" 
                    headerClassName="!p-2.5 text-xs"
                    contentClassName="!p-2"
                    tooltip="Configure the color palette for nodes when a continuous numeric coloring metric is selected. This section is active only for numeric metrics."
                  >
                    <SequentialColorPaletteSelector
                        currentPalette={sequentialColorPalette}
                        onPaletteChange={handleSequentialColorPaletteChange}
                        disabled={appIsDisabled || !processedGraphData || !isNodeColoringNumeric}
                    />
                </CollapsibleSection>
              )}
              <SortOptions sortConfig={sortConfig} onSortChange={handleSortChange} disabled={appIsDisabled || !processedGraphData} />
              
              {(!appIsDisabled && processedGraphData) && (
                <CollapsibleSection 
                  title={`${currentLayoutLabel} Parameters`} 
                  defaultOpen={false} 
                  className="mt-2.5 !bg-slate-600/70" 
                  headerClassName="!p-2.5 text-xs" 
                  contentClassName="!p-2"
                  tooltip={`Fine-tune the parameters for the selected '${currentLayoutLabel}' layout algorithm to adjust its behavior and appearance. Hover over parameter names for more details.`}
                  actionButton={
                    <button
                        onClick={() => handleResetLayoutTypeParams(currentLayout)}
                        className="flex items-center text-xs text-sky-300 hover:text-sky-200 bg-slate-500 hover:bg-slate-400/80 px-1.5 py-0.5 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
                        title={`Reset all parameters for the '${currentLayoutLabel}' layout to their default values.`}
                        disabled={appIsDisabled || !processedGraphData}
                    >
                        <RefreshIcon className="mr-1 h-3 w-3"/>
                        Reset
                    </button>
                  }
                >
                  <LayoutParametersEditor
                    currentLayout={currentLayout}
                    layoutParams={layoutParams[currentLayout]}
                    onParamChange={handleLayoutParamChange}
                    disabled={appIsDisabled || !processedGraphData}
                  />
                </CollapsibleSection>
              )}

            </CollapsibleSection>
            
            {selectedNodeData && (
              <CollapsibleSection 
                title="Selected Node Details" 
                defaultOpen={true}
                tooltip="View detailed metrics and information about the currently selected node (square) in the graph visualization, such as its ID, piece information, and various centrality measures."
              >
                <SelectedNodeInfo nodeData={selectedNodeData} />
              </CollapsibleSection>
            )}
            
            <CollapsibleSection 
              title="Filters & Search" 
              defaultOpen={!selectedNodeData} 
              tooltip="Refine the displayed graph by searching for specific nodes (squares by ID or piece symbol) or by applying filters based on piece attributes (type, color), structural properties (components, communities), or various node metrics (e.g., centrality, degree deviation)."
              actionButton={
                !appIsDisabled && processedGraphData ? (
                  <button
                    onClick={handleResetFilters}
                    className="flex items-center text-xs text-sky-300 hover:text-sky-200 bg-slate-600 hover:bg-slate-500 px-2 py-1 rounded-md transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
                    aria-label="Reset all filters to default ranges based on current data"
                    title="Reset all active filters to their default states. This will typically show all data within the full range of values for each metric based on the current move and graph scope."
                    disabled={appIsDisabled || !processedGraphData}
                  >
                    <RefreshIcon className="mr-1"/>
                    Reset
                  </button>
                ) : null
              }
            >
              <FilterSidebar
                filters={filters}
                onFilterChange={handleFilterChange}
                onNumericFilterChange={handleNumericFilterChange}
                dataRanges={processedGraphData?.dataRangesForFilters || {}} 
                processedNodes={processedGraphData?.nodes || []} 
                disabled={appIsDisabled || !processedGraphData}
                isNodeSelected={!!selectedNodeData} 
              />
            </CollapsibleSection>

            <CollapsibleSection 
              title="Aggregate Graph Stats" 
              defaultOpen={false}
              tooltip="View overall statistics calculated for the current graph (based on active scope and filters). These metrics provide insights into the global properties of the visualized network, such as its connectivity, community structure, and degree distributions."
            >
              <StatsDisplay stats={processedGraphData?.aggregateStats || null} disabled={appIsDisabled || !processedGraphData} />
            </CollapsibleSection>
            
            <CollapsibleSection 
              title="Captured Pieces" 
              defaultOpen={false}
              tooltip="Lists all pieces captured by White and Black respectively, up to the currently selected move in the game."
            >
              <CapturedPiecesDisplay capturedPieces={capturedPiecesList} disabled={appIsDisabled} />
            </CollapsibleSection>
        </aside>

        <main ref={visualizationContainerRef} className="flex-1 relative bg-white rounded-xl shadow-xl min-w-0 overflow-hidden border border-gray-300/50">
          {(appIsDisabled && !isLoading && !currentDataSourceName) ? ( // Show initial prompt only if no data source attempted
            <div className="flex items-center justify-center h-full">
              <p className="text-xl text-gray-500/90">Please upload a Chess JSON file or load sample data.</p>
            </div>
          ) : processedGraphData && svgDimensions.width > 0 && svgDimensions.height > 0 ? (
            <>
              <NetworkGraph
                nodes={displayData.filteredSortedNodes}
                links={displayData.filteredLinks}
                layoutType={currentLayout}
                svgDimensions={svgDimensions}
                onNodeHover={handleNodeHover}
                onNodeClick={handleNodeClick}
                selectedNodeId={selectedNodeData?.id || null}
                sortConfig={sortConfig}
                appIsDisabled={appIsDisabled && !currentDataSourceName}
                currentMoveIndex={currentMoveIndex}
                currentGraphScope={currentGraphScope}
                nodeColoringMetric={nodeColoringMetric}
                sequentialColorPalette={sequentialColorPalette}
                dataRangesForFilters={processedGraphData.dataRangesForFilters}
                currentLayoutParams={currentLayoutParams}
              />
              <Legend
                nodes={displayData.filteredSortedNodes}
                nodeColoringMetric={nodeColoringMetric}
                sequentialColorPalette={sequentialColorPalette}
                dataRanges={processedGraphData.dataRangesForFilters}
              />
            </>
          ) : (
             <div className="flex items-center justify-center h-full">
                <p className="text-lg text-gray-400/90">{isLoading ? 'Processing data...' : (currentDataSourceName && !error ? 'Initializing visualization...' : 'Load data to start.')}</p>
             </div>
          )}
        </main>
      </div>
      {tooltipData && <Tooltip {...tooltipData} visible={tooltipData.visible} />}
    </div>
  );
};

export default App;
