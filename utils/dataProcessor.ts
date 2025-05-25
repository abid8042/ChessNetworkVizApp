
import { RawChessData, Move, GraphScope, ProcessedNode, ProcessedLink, CommunityGroup, ProcessedGraphData, NodeData, Piece, DataRangesForFilters, NODE_METRIC_KEYS, PIECE_TYPE_MAP, NodeNumericMetricKey } from '../types';

export function processMoveData(moveData: Move, graphScope: GraphScope): ProcessedGraphData {
  const targetGraph = moveData.g[graphScope];
  const dataRangesForFilters: DataRangesForFilters = {};

  NODE_METRIC_KEYS.forEach(key => {
    dataRangesForFilters[key] = { min: Infinity, max: -Infinity };
  });
  
  const pieceMapBySquare = new Map<string, Piece>();
  moveData.p.forEach(p => {
    if (p.st === "active") { // Only consider active pieces for augmentation on squares
        pieceMapBySquare.set(p.sq, p);
    }
  });

  const processedNodes: ProcessedNode[] = targetGraph.nds.map((nd: NodeData) => {
    const augmentedNode: ProcessedNode = {
      ...nd,
      groupTag: `${nd.component_id}-${nd.community_id}`,
    };

    if (nd.has_piece) {
        const pieceOnSquare = pieceMapBySquare.get(nd.id);
        if(pieceOnSquare) {
            augmentedNode.original_piece_id = pieceOnSquare.id;
            augmentedNode.piece_type_name = PIECE_TYPE_MAP[nd.piece_type!] || pieceOnSquare.t; // Use mapping or fallback
            // nd.piece_color and nd.piece_symbol are already from schema for the current scope
        } else if (nd.piece_type !== null && PIECE_TYPE_MAP[nd.piece_type]) {
           // Fallback if piece not in p array but nd has info (e.g. different scopes)
           augmentedNode.piece_type_name = PIECE_TYPE_MAP[nd.piece_type];
        }
    }

    NODE_METRIC_KEYS.forEach(key => {
      const value = (augmentedNode as any)[key];
      if (typeof value === 'number' && !isNaN(value)) {
        if (value < dataRangesForFilters[key].min) dataRangesForFilters[key].min = value;
        if (value > dataRangesForFilters[key].max) dataRangesForFilters[key].max = value;
      }
    });
    return augmentedNode;
  });
  
  // Ensure min <= max, and handle cases where all values were Infinity
  NODE_METRIC_KEYS.forEach(key => {
    if (dataRangesForFilters[key].min === Infinity) dataRangesForFilters[key].min = 0;
    if (dataRangesForFilters[key].max === -Infinity) dataRangesForFilters[key].max = 0;
    if (dataRangesForFilters[key].min > dataRangesForFilters[key].max) {
        // This can happen if only one data point, or all are same.
        // Or if data had NaN/undefined for a metric.
        // Make min slightly less than max, or set a small default range.
        if (dataRangesForFilters[key].min === dataRangesForFilters[key].max) {
            dataRangesForFilters[key].min = Math.max(0, dataRangesForFilters[key].min - 0.5);
            dataRangesForFilters[key].max = dataRangesForFilters[key].max + 0.5;
            if (dataRangesForFilters[key].min === dataRangesForFilters[key].max && dataRangesForFilters[key].min === 0) {
                 dataRangesForFilters[key].max = 1; // Default range for 0-0 case
            }
        } else {
             [dataRangesForFilters[key].min, dataRangesForFilters[key].max] = [dataRangesForFilters[key].max, dataRangesForFilters[key].min]; // Swap
        }
    }
  });


  const processedLinks: ProcessedLink[] = targetGraph.lks.map(lk => ({
    source: lk.source, // D3 will resolve these to node objects
    target: lk.target,
    weight: lk.weight,
    piece_symbol: lk.piece_symbol,
    piece_color: lk.piece_color,
    piece_type: lk.piece_type,
  }));

  const communityGroupsMap = new Map<string, ProcessedNode[]>();
  processedNodes.forEach(node => {
    if (!communityGroupsMap.has(node.groupTag)) {
      communityGroupsMap.set(node.groupTag, []);
    }
    communityGroupsMap.get(node.groupTag)!.push(node);
  });

  const communityGroups: CommunityGroup[] = Array.from(communityGroupsMap.entries()).map(([tag, nodes]) => ({
    groupTag: tag,
    nodes: nodes,
  }));
  
  return {
    nodes: processedNodes,
    links: processedLinks,
    communityGroups,
    aggregateStats: targetGraph.agg,
    dataRangesForFilters,
  };
}

export function applyFiltersAndSort(
  nodes: ProcessedNode[],
  links: ProcessedLink[],
  filters: any, // Using 'any' for FiltersState for simplicity here, should be FiltersState
  sortConfig: any // Using 'any' for SortConfig
): { filteredSortedNodes: ProcessedNode[]; filteredLinks: ProcessedLink[] } {
  
  let filteredNodes = nodes.filter(node => {
    // Search Term Filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      const nodeIdMatch = node.id.toLowerCase().includes(term);
      const pieceSymbolMatch = node.has_piece && node.piece_symbol && node.piece_symbol.toLowerCase().includes(term);
      if (!nodeIdMatch && !pieceSymbolMatch) return false;
    }

    // Piece Type Filter
    if (filters.pieceTypes.length > 0) {
      if (!node.has_piece || !filters.pieceTypes.includes(node.piece_type)) {
        return false;
      }
    }
    
    // Piece Color Filter
    if (filters.pieceColor) {
      if (!node.has_piece || node.piece_color !== filters.pieceColor) {
        return false;
      }
    }

    // Component ID Filter
    if (filters.componentIds.length > 0) {
      if (!filters.componentIds.includes(node.component_id)) {
        return false;
      }
    }

    // Community ID Filter
    if (filters.communityIds.length > 0) {
      if (!filters.communityIds.includes(node.community_id)) {
        return false;
      }
    }
    
    // Numeric Range Filters
    for (const key of NODE_METRIC_KEYS) {
        const filterRange = filters[key as NodeNumericMetricKey];
        const nodeValue = (node as any)[key as NodeNumericMetricKey];
        if (typeof nodeValue === 'number' && !isNaN(nodeValue)) {
            if (nodeValue < filterRange.currentMin || nodeValue > filterRange.currentMax) {
            return false;
            }
        } else if (filterRange.currentMin > filterRange.dataMin || filterRange.currentMax < filterRange.dataMax) {
            // If nodeValue is not a valid number, and the filter range is not the full data range, exclude it.
            // This handles cases like null/undefined for metrics that are actively filtered.
            return false;
        }
    }
    return true;
  });

  // Sorting
  const { key: sortKey, order: sortOrder } = sortConfig;
  const filteredSortedNodes = [...filteredNodes].sort((a, b) => {
    const valA = (a as any)[sortKey];
    const valB = (b as any)[sortKey];

    if (valA === null || valA === undefined) return sortOrder === 'asc' ? -1 : 1;
    if (valB === null || valB === undefined) return sortOrder === 'asc' ? 1 : -1;
    
    if (typeof valA === 'string' && typeof valB === 'string') {
      return sortOrder === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    }
    if (typeof valA === 'number' && typeof valB === 'number') {
      return sortOrder === 'asc' ? valA - valB : valB - valA;
    }
    return 0;
  });

  const filteredNodeIds = new Set(filteredSortedNodes.map(n => n.id));
  const filteredLinks = links.filter(link => {
    const sourceId = typeof link.source === 'string' ? link.source : (link.source as ProcessedNode).id;
    const targetId = typeof link.target === 'string' ? link.target : (link.target as ProcessedNode).id;
    return filteredNodeIds.has(sourceId) && filteredNodeIds.has(targetId);
  });

  return { filteredSortedNodes, filteredLinks };
}


export function getCapturedPieces(allMoves: Move[], currentMoveIndex: number): Piece[] {
    if (!allMoves || allMoves.length === 0) return [];
    
    const relevantPieces = new Map<string, Piece>();

    // Iterate through moves up to the current one to get the latest state of each piece
    for (let i = 0; i <= Math.min(currentMoveIndex, allMoves.length - 1); i++) {
        const move = allMoves[i];
        move.p.forEach(piece => {
            relevantPieces.set(piece.id, piece); // Update with the latest state
        });
    }
    
    return Array.from(relevantPieces.values()).filter(p => 
        p.st === 'captured' && p.cap !== null && p.cap <= currentMoveIndex
    ).sort((a,b) => (a.cap ?? 0) - (b.cap ?? 0));
}
    