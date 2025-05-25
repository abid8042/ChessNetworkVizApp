import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import * as d3 from 'd3';
import { 
    ProcessedNode, ProcessedLink, LayoutType, TooltipData, SortConfig, GraphScope, 
    NodeColoringMetricId, NodeNumericMetricKey, DataRangesForFilters,
    LayoutParamsState, SequentialColorPaletteId, NODE_METRIC_KEYS
} from '../../types';
import { 
    PIECE_UNICODE_MAP,
    VISUAL_NODE_BASE_RADIUS_PIECE, VISUAL_NODE_BASE_RADIUS_EMPTY,
    NODE_VISUAL_SCALING_REFERENCE_DIMENSION,
    NODE_VISUAL_SCALING_MIN_FACTOR, NODE_VISUAL_SCALING_MAX_FACTOR,
    ZOOM_TO_FIT_PADDING, ZOOM_SETTLE_DELAY
} from '../../src/constants'; 
import { D3_SEQUENTIAL_INTERPOLATORS } from '../../src/colorPaletteConstants';


import { applyForceDirectedLayout } from '../../src/layouts/forceDirectedLayout';
import { applyRadialLayout } from '../../src/layouts/radialLayout';
import { applySpiralLayout } from '../../src/layouts/spiralLayout';

const ArrowsExpandIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
        {/* Updated path for a clearer "fit to screen" icon (four L-corners) */}
        <path d="M2 3h3v1H3v2H2V3zm13 0h3v3h-2V4h-1V3zM2 14h3v2H3v1H2v-3zm13 0h3v3h-2v-1h-1v-2z"/>
    </svg>
);

const DownloadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
  </svg>
);


interface NetworkGraphProps {
  nodes: ProcessedNode[];
  links: ProcessedLink[];
  layoutType: LayoutType;
  svgDimensions: { width: number; height: number };
  onNodeHover: (data: TooltipData | null) => void;
  onNodeClick: (nodeData: ProcessedNode | null) => void;
  selectedNodeId: string | null;
  sortConfig: SortConfig;
  appIsDisabled: boolean; 
  currentMoveIndex: number;
  currentGraphScope: GraphScope;
  nodeColoringMetric: NodeColoringMetricId;
  sequentialColorPalette: SequentialColorPaletteId;
  dataRangesForFilters: DataRangesForFilters;
  currentLayoutParams: LayoutParamsState[LayoutType]; 
}

const getNodeVisualRadius = (
    node: ProcessedNode, 
    svgDims: { width: number; height: number }
): number => {
    const baseRadius = node.has_piece ? VISUAL_NODE_BASE_RADIUS_PIECE : VISUAL_NODE_BASE_RADIUS_EMPTY;
    if (svgDims.width === 0 || svgDims.height === 0) return baseRadius;

    const minDim = Math.min(svgDims.width, svgDims.height);
    let scale = minDim / NODE_VISUAL_SCALING_REFERENCE_DIMENSION;
    scale = Math.max(NODE_VISUAL_SCALING_MIN_FACTOR, Math.min(NODE_VISUAL_SCALING_MAX_FACTOR, scale));
    return baseRadius * scale;
};


const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes, // These are filteredSortedNodes from App.tsx
  links,
  layoutType,
  svgDimensions,
  onNodeHover,
  onNodeClick,
  selectedNodeId,
  sortConfig,
  appIsDisabled,
  currentMoveIndex,
  currentGraphScope,
  nodeColoringMetric,
  sequentialColorPalette,
  dataRangesForFilters, // These are the global ranges for the current scope
  currentLayoutParams, 
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const simulationRef = useRef<d3.Simulation<ProcessedNode, ProcessedLink> | null>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);
  const gRef = useRef<SVGGElement>(null); 
  const zoomTimeoutRef = useRef<number | null>(null);

  const colorScale: d3.ScaleOrdinal<string, string> | d3.ScaleSequential<string> = useMemo(() => {
    if (nodeColoringMetric === 'default') {
      return d3.scaleOrdinal(d3.schemeCategory10);
    }
    if (nodeColoringMetric === 'component_id_color') {
      const uniqueComponentIds = Array.from(new Set(nodes.map(n => n.component_id.toString()))).sort((a,b) => parseInt(a) - parseInt(b));
      return d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueComponentIds);
    }
    if (nodeColoringMetric === 'community_id_color') {
      const uniqueCommunityIds = Array.from(new Set(nodes.map(n => n.community_id.toString()))).sort((a,b) => parseInt(a) - parseInt(b));
      return d3.scaleOrdinal(d3.schemeTableau10).domain(uniqueCommunityIds);
    }
    
    // Numeric Metrics
    const metricKey = nodeColoringMetric as NodeNumericMetricKey;
    const dataRangeForMetricFromScope = dataRangesForFilters[metricKey]; 

    let finalDomain: [number, number] = [0, 1]; // Default domain

    // `nodes` here are the filtered nodes passed to the component
    const visibleNodeValues = nodes.map(n => (n as any)[metricKey] as number)
                                 .filter(v => typeof v === 'number' && !isNaN(v));

    if (visibleNodeValues.length > 0) {
        let minVal = Math.min(...visibleNodeValues);
        let maxVal = Math.max(...visibleNodeValues);

        if (minVal === maxVal) { 
            finalDomain = [minVal - 0.5, maxVal + 0.5];
            if (minVal === 0) finalDomain = [-0.5, 0.5];
        } else {
            finalDomain = [minVal, maxVal];
        }
    } else if (dataRangeForMetricFromScope) { 
        let scopeMin = dataRangeForMetricFromScope.min;
        let scopeMax = dataRangeForMetricFromScope.max;

        if (scopeMin === scopeMax) {
            finalDomain = [scopeMin - 0.5, scopeMax + 0.5];
            if (scopeMin === 0) finalDomain = [-0.5, 0.5];
        } else {
            finalDomain = [scopeMin, scopeMax];
        }
    }
    // else, finalDomain remains [0, 1] if no data at all

    if (typeof finalDomain[0] !== 'number' || typeof finalDomain[1] !== 'number' || isNaN(finalDomain[0]) || isNaN(finalDomain[1]) || finalDomain[0] > finalDomain[1]) {
        finalDomain = [0, 1];
    }
    if (finalDomain[0] === 0 && finalDomain[1] === 0) { // Handles case where domain might resolve to [0,0]
        finalDomain = [-0.5, 0.5];
    }
    
    const interpolator = D3_SEQUENTIAL_INTERPOLATORS[sequentialColorPalette] || d3.interpolateViridis; // Use selected palette
    return d3.scaleSequential(interpolator).domain(finalDomain);

  }, [nodes, nodeColoringMetric, dataRangesForFilters, sequentialColorPalette]);


  const getNodeFillColor = useCallback((node: ProcessedNode) => {
    switch (nodeColoringMetric) {
      case 'default':
        return (colorScale as d3.ScaleOrdinal<string, string>)(node.groupTag);
      case 'component_id_color':
        return (colorScale as d3.ScaleOrdinal<string, string>)(node.component_id.toString());
      case 'community_id_color':
        return (colorScale as d3.ScaleOrdinal<string, string>)(node.community_id.toString());
      default: 
        // Check if it's a known numeric metric key
        if (NODE_METRIC_KEYS.includes(nodeColoringMetric as NodeNumericMetricKey)) {
          const value = (node as any)[nodeColoringMetric as NodeNumericMetricKey];
          if (typeof value === 'number' && !isNaN(value)) {
            return (colorScale as d3.ScaleSequential<string>)(value);
          }
        }
        return '#ccc'; // Fallback for nodes with no valid metric value or unknown metric
    }
  }, [colorScale, nodeColoringMetric]);


  const connectedNodeIds = useMemo(() => {
    if (!selectedNodeId || !links) return new Set<string>();
    const ids = new Set<string>();
    links.forEach(link => {
        const sourceId = typeof link.source === 'string' ? link.source : (link.source as ProcessedNode).id;
        const targetId = typeof link.target === 'string' ? link.target : (link.target as ProcessedNode).id;

        if (sourceId === selectedNodeId) {
            ids.add(targetId);
        }
        if (targetId === selectedNodeId) {
            ids.add(sourceId);
        }
    });
    return ids;
  }, [selectedNodeId, links]);

  const performZoomToFit = useCallback(() => {
    if (!svgRef.current || !gRef.current || !zoomRef.current || !nodes || nodes.length === 0 || svgDimensions.width === 0 || svgDimensions.height === 0) {
        return;
    }
    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);
    const zoomBehavior = zoomRef.current!;
    const { width, height } = svgDimensions;

    const gNode = g.node();
    if (!gNode) return;
    const bounds = gNode.getBBox();
    
    if (bounds.width === 0 || bounds.height === 0 || !isFinite(bounds.x) || !isFinite(bounds.y)) { 
        svg.transition().duration(layoutType === 'spiral' ? 0 : 600) 
           .call(zoomBehavior.transform, d3.zoomIdentity.translate(width / 2, height / 2).scale(1));
       return;
    }

    const fullWidth = bounds.width + ZOOM_TO_FIT_PADDING * 2;
    const fullHeight = bounds.height + ZOOM_TO_FIT_PADDING * 2;
    
    const midX = bounds.x + bounds.width / 2;
    const midY = bounds.y + bounds.height / 2;

    const scale = Math.min(2.0, Math.max(0.1, Math.min(width / fullWidth, height / fullHeight))); 
    const translateX = width / 2 - midX * scale;
    const translateY = height / 2 - midY * scale;
    
    svg.transition().duration(layoutType === 'spiral' ? 0 : 600) 
       .call(zoomBehavior.transform, d3.zoomIdentity.translate(translateX, translateY).scale(scale));
  }, [nodes, layoutType, svgDimensions]);


  const handleDownloadPNG = useCallback(() => {
    if (!svgRef.current || !nodes || nodes.length === 0 || svgDimensions.width === 0 || svgDimensions.height === 0) return;

    const PNG_EXPORT_SCALE = 2.0; 
    const currentSvgWidth = svgDimensions.width;
    const currentSvgHeight = svgDimensions.height;

    const canvasWidth = currentSvgWidth * PNG_EXPORT_SCALE;
    const canvasHeight = currentSvgHeight * PNG_EXPORT_SCALE;

    const clonedSvgElement = svgRef.current.cloneNode(true) as SVGSVGElement;

    clonedSvgElement.setAttribute('width', currentSvgWidth.toString());
    clonedSvgElement.setAttribute('height', currentSvgHeight.toString());
    clonedSvgElement.removeAttribute('viewBox');

    const backgroundRect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    backgroundRect.setAttribute('width', "100%");
    backgroundRect.setAttribute('height', "100%");
    backgroundRect.setAttribute('fill', '#f9fafb'); 
    if (clonedSvgElement.firstChild) {
        clonedSvgElement.insertBefore(backgroundRect, clonedSvgElement.firstChild);
    } else {
        clonedSvgElement.appendChild(backgroundRect);
    }

    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(clonedSvgElement);

    if (!svgString.includes('xmlns="http://www.w3.org/2000/svg"')) {
        svgString = svgString.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (svgString.includes("marker-end") && !svgString.includes('xmlns:xlink="http://www.w3.org/1999/xlink"')) {
         svgString = svgString.replace('<svg', '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }


    const img = new Image();
    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
        console.error("Failed to get canvas 2D context for PNG export.");
        return;
    }

    img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height); 
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height); 
        URL.revokeObjectURL(img.src); 

        const pngUrl = canvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `chess_network_move_${currentMoveIndex}_${currentGraphScope}_${layoutType}_color_${nodeColoringMetric}_palette_${sequentialColorPalette}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    img.onerror = (e) => {
        console.error("Error loading SVG into image for PNG conversion:", e);
        URL.revokeObjectURL(img.src); 
    };
    
    const svgBlob = new Blob([svgString], {type: 'image/svg+xml;charset=utf-8'});
    img.src = URL.createObjectURL(svgBlob);

  }, [nodes, layoutType, currentMoveIndex, currentGraphScope, svgDimensions, nodeColoringMetric, sequentialColorPalette]);


  useEffect(() => {
    if (!svgRef.current || !gRef.current || svgDimensions.width === 0 || svgDimensions.height === 0) return;

    const svg = d3.select(svgRef.current);
    const g = d3.select(gRef.current);

    let defs = svg.select<SVGDefsElement>("defs");
    if (defs.empty()) {
      defs = svg.append<SVGDefsElement>("defs");
    }
    
    let marker = defs.select<SVGMarkerElement>("marker#arrowhead");
    if (marker.empty()) {
        marker = defs.append("marker")
            .attr("id", "arrowhead") 
            .attr("viewBox", "0 0 10 10") 
            .attr("refX", 9) 
            .attr("refY", 5)
            .attr("markerWidth", 6) 
            .attr("markerHeight", 6)
            .attr("orient", "auto-start-reverse");
        marker.append("path")
            .attr("d", "M 0 0 L 10 5 L 0 10 z") 
            .attr("fill", "#a0a0a0"); 
    }

    function ticked() {
      if (!gRef.current) return;
      const currentG = d3.select(gRef.current);

      currentG.selectAll<SVGLineElement, ProcessedLink>('.link')
        .attr("x1", d => (d.source as ProcessedNode).x!)
        .attr("y1", d => (d.source as ProcessedNode).y!)
        .attr("x2", d_link => {
            const s = d_link.source as ProcessedNode;
            const t = d_link.target as ProcessedNode;
            if (!s.x || !s.y || !t.x || !t.y) return t.x || 0;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist === 0) return t.x;
            const targetRadius = getNodeVisualRadius(t, svgDimensions) + 3; 
            const scaleFactor = Math.max(0, (dist - targetRadius) / dist);
            return s.x + dx * scaleFactor; 
         })
         .attr("y2", d_link => {
            const s = d_link.source as ProcessedNode;
            const t = d_link.target as ProcessedNode;
            if (!s.x || !s.y || !t.x || !t.y) return t.y || 0;
            const dx = t.x - s.x;
            const dy = t.y - s.y;
            const dist = Math.sqrt(dx*dx + dy*dy);
            if (dist === 0) return t.y;
            const targetRadius = getNodeVisualRadius(t, svgDimensions) + 3; 
            const scaleFactor = Math.max(0, (dist - targetRadius) / dist);
            return s.y + dy * scaleFactor;
         });

      currentG.selectAll<SVGGElement, ProcessedNode>('.node')
        .attr("transform", d => `translate(${d.x},${d.y})`);
    }

    if (!simulationRef.current) {
      simulationRef.current = d3.forceSimulation<ProcessedNode>()
        .on("tick", ticked); 
    }
    const simulation = simulationRef.current!;
    
    simulation.nodes(nodes); 

    if (!zoomRef.current) {
        zoomRef.current = d3.zoom<SVGSVGElement, unknown>()
            .scaleExtent([0.1, 10]) 
            .on("zoom", (event) => {
              if (gRef.current) { 
                d3.select(gRef.current).attr("transform", event.transform);
              }
            });
        svg.call(zoomRef.current);
    }
    
    simulation.force("link", null)
              .force("charge", null)
              .force("collide", null)
              .force("center", null)
              .force("x", null)
              .force("y", null)
              .force("r", null); 
    
    nodes.forEach(n => { 
      n.fx = null; 
      n.fy = null; 
    });

    switch (layoutType) {
      case 'force-directed':
        applyForceDirectedLayout(simulation, nodes, links, svgDimensions, currentLayoutParams as LayoutParamsState['force-directed']);
        break;
      case 'radial':
        applyRadialLayout(simulation, nodes, links, svgDimensions, sortConfig, currentLayoutParams as LayoutParamsState['radial']);
        break;
      case 'spiral':
        applySpiralLayout(simulation, nodes, links, svgDimensions, currentLayoutParams as LayoutParamsState['spiral']); 
        break;
    }
    
    const linkForce = simulation.force("link") as d3.ForceLink<ProcessedNode, ProcessedLink> | undefined;
    if (linkForce) {
       linkForce.links(links); 
    }

    simulation.alpha(0.3).restart(); 

  }, [nodes, links, layoutType, svgDimensions, sortConfig, currentLayoutParams]); 


  useEffect(() => {
    if (!svgRef.current || !onNodeClick) return;
    const svgElement = svgRef.current;

    const handleClick = (event: MouseEvent) => {
        if (event.target === svgElement || (event.target as SVGElement).classList?.contains('svg-background-rect')) {
             onNodeClick(null);
        }
    };

    svgElement.addEventListener('click', handleClick);
    return () => {
        svgElement.removeEventListener('click', handleClick);
    };
  }, [onNodeClick]); 


  useEffect(() => {
    if (!gRef.current || svgDimensions.width === 0 || !nodes ) return; 
    const g = d3.select(gRef.current);

    g.selectAll<SVGPathElement, any>('.spiral-guide-path').remove(); 
    if (layoutType === 'spiral' && svgDimensions.width > 0 && svgDimensions.height > 0 && nodes.length > 0) {
        const { width, height } = svgDimensions;
        const centerX = width / 2;
        const centerY = height / 2;
        const spiralParams = currentLayoutParams as LayoutParamsState['spiral'];
        const maxRadius = Math.max(0, Math.min(width, height) / 2 - spiralParams.maxRadiusMargin);
        const coils = spiralParams.coils;
        
        const numPathPoints = Math.max(100, nodes.length * 2); 
        const spiralPoints: [number, number][] = d3.range(numPathPoints + 1).map(i => {
            const t = i / numPathPoints; 
            const angle = 2 * Math.PI * coils * t;
            const radius = maxRadius * t;
            return [centerX + radius * Math.cos(angle), centerY + radius * Math.sin(angle)];
        });

        g.insert('path', ':first-child') 
            .datum(spiralPoints)
            .attr('class', 'spiral-guide-path')
            .attr('fill', 'none')
            .attr('stroke', '#cbd5e1') 
            .attr('stroke-width', 0.8) 
            .attr('stroke-dasharray', '2,3') 
            .attr('d', d3.line());
    }

    g.selectAll('.hull').remove(); 

    g.selectAll<SVGLineElement, ProcessedLink>('.link')
      .data(links, d => `${(d.source as ProcessedNode)?.id || String(d.source)}-${(d.target as ProcessedNode)?.id || String(d.target)}`)
      .join(
        enter => enter.append("line")
          .attr("class", "link")
          .attr("stroke", "#a0a0a0") 
          .attr("marker-end", "url(#arrowhead)"),
        update => update,
        exit => exit.remove()
      )
      .attr("stroke-width", d => Math.max(0.7, Math.sqrt(d.weight || 1) / 2))
      .transition().duration(300)
      .style("stroke-opacity", d_link => {
        if (!selectedNodeId) return 0.5; 
        const sourceId = typeof d_link.source === 'string' ? d_link.source : (d_link.source as ProcessedNode).id;
        const targetId = typeof d_link.target === 'string' ? d_link.target : (d_link.target as ProcessedNode).id;
        return (sourceId === selectedNodeId || targetId === selectedNodeId) ? 0.7 : 0.1;
      });

    const nodeSelection = g.selectAll<SVGGElement, ProcessedNode>('.node')
      .data(nodes, d => d.id);
    
    nodeSelection.exit().remove();

    const nodeEnter = nodeSelection.enter().append("g")
        .attr("class", "node cursor-pointer group") 
        .on("mouseover", (event: PointerEvent, d_node: ProcessedNode) => {
          d3.select(event.currentTarget as SVGGElement).select("circle").attr("stroke-width", 2.5).attr("stroke", "#3b82f6"); 
          const pieceInfo = d_node.has_piece ? `${d_node.piece_type_name} (${d_node.piece_color}, ${d_node.piece_symbol})` : 'Empty';
          onNodeHover({
            content: `ID: ${d_node.id}\nPiece: ${pieceInfo}\nGroup: ${d_node.groupTag}\nIn-Deg: ${d_node.in_degree_centrality.toFixed(2)}\nOut-Deg: ${d_node.out_degree_centrality.toFixed(2)}`,
            x: event.pageX,
            y: event.pageY,
            visible: true,
          });
        })
        .on("mouseout", (event: PointerEvent, d_node: ProcessedNode) => { 
            const currentTarget = event.currentTarget as SVGGElement;
            const isSelected = d_node.id === selectedNodeId;
            const nodeFill = getNodeFillColor(d_node);
            d3.select(currentTarget).select("circle")
            .attr("stroke-width", isSelected ? 2.5 : 1) 
            .attr("stroke", isSelected ? "#0ea5e9" : (d3.color(nodeFill)?.darker(0.6).toString() || '#9ca3af')); 
             onNodeHover(null);
        })
        .on("click", (event: PointerEvent, d_node: ProcessedNode) => {
          event.stopPropagation(); 
          onNodeClick(d_node);
        });

    nodeEnter.append("circle")
        .attr("r", d => getNodeVisualRadius(d, svgDimensions));
        
    nodeEnter.append("text") // Main text for piece symbol or square ID
        .attr("class", "node-label-main")
        .attr("dy", ".35em")
        .attr("text-anchor", "middle")
        .style("pointer-events", "none")
        .attr("aria-hidden", "true");

    nodeEnter.append("text") // Additional text for position if piece exists
        .attr("class", "node-position-label")
        .attr("text-anchor", "middle")
        .style("pointer-events", "none")
        .attr("aria-hidden", "true");

    const nodeUpdate = nodeEnter.merge(nodeSelection);
    
    nodeUpdate
        .transition().duration(300)
        .style("opacity", d_node => {
            if (!selectedNodeId) return 1;
            return (d_node.id === selectedNodeId || connectedNodeIds.has(d_node.id)) ? 1 : 0.15;
        });

    nodeUpdate.select("circle")
      .transition().duration(150) 
      .attr("r", d => getNodeVisualRadius(d, svgDimensions))
      .attr("fill", d => getNodeFillColor(d))
      .attr("stroke", d => {
          const nodeFill = getNodeFillColor(d);
          return d.id === selectedNodeId ? "#0ea5e9" : (d3.color(nodeFill)?.darker(0.6).toString() || '#9ca3af');
      }) 
      .attr("stroke-width", d => d.id === selectedNodeId ? 2.5 : 1);

    nodeUpdate.select<SVGTextElement>(".node-label-main") // Select main label
      .style("font-size", d => {
        const radius = getNodeVisualRadius(d, svgDimensions);
        if (d.has_piece) { 
          return Math.max(10, Math.min(radius * 1.25, 26)) + 'px';
        } else { 
          return Math.max(8, Math.min(radius * 1.0, 13)) + 'px';
        }
      })
      .style("font-weight", "bold") 
      .style("fill", d => {
        if (d.has_piece && d.piece_color) {
          return d.piece_color === 'black' ? "#111827" : "#f8fafc"; 
        }
        else {
          const baseFill = getNodeFillColor(d); 
          const baseHsl = d3.hsl(baseFill);
          return baseHsl.l > 0.58 ? "#1f2937" : "#f3f4f6"; 
        }
      })
      .text(d => {
        if (d.has_piece && d.piece_symbol) {
            return PIECE_UNICODE_MAP[d.piece_symbol] || d.piece_symbol;
        } else {
            return d.id; 
        }
      });
    
    nodeUpdate.select<SVGTextElement>(".node-position-label")
        .text(d => d.has_piece ? d.id : "") 
        .attr("dy", d => getNodeVisualRadius(d, svgDimensions) + (getNodeVisualRadius(d, svgDimensions) * 0.6) + 3) // Adjusted dy for new font size
        .style("font-size", d => Math.max(8, Math.min(getNodeVisualRadius(d, svgDimensions) * 0.6, 14)) + 'px') // Made larger
        .style("font-weight", "bold") // Made bold
        .style("fill", "#111827") // Made near black
        .style("display", d => d.has_piece ? null : 'none');


  }, [nodes, links, getNodeFillColor, onNodeHover, onNodeClick, selectedNodeId, svgDimensions, layoutType, connectedNodeIds, nodeColoringMetric, currentLayoutParams]); 


  useEffect(() => {
    if (zoomTimeoutRef.current) {
      clearTimeout(zoomTimeoutRef.current);
      zoomTimeoutRef.current = null;
    }
    
    const timeoutDuration = ZOOM_SETTLE_DELAY + (layoutType === 'force-directed' ? 200 : (layoutType === 'radial' ? 100 : 0));

    if (layoutType === 'spiral') {
      performZoomToFit(); 
    } else {
      zoomTimeoutRef.current = window.setTimeout(performZoomToFit, timeoutDuration); 
    }
    
    return () => {
      if (zoomTimeoutRef.current) {
        clearTimeout(zoomTimeoutRef.current);
      }
    };
  }, [performZoomToFit, layoutType, currentLayoutParams]); 

  return (
    <div className="w-full h-full bg-gray-50/60 relative overflow-hidden" role="figure" aria-label="Network graph visualization"> 
      <svg ref={svgRef} width={svgDimensions.width} height={svgDimensions.height} className="block">
        <g ref={gRef}></g> 
      </svg>
      {!appIsDisabled && nodes.length > 0 && (
        <div className="absolute top-3 right-3 flex space-x-2">
            <button
                onClick={handleDownloadPNG}
                className="p-2 bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 rounded-full shadow-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Download graph as HD PNG"
                title="Download the current graph view as a high-resolution PNG image. Includes current layout, colors, and filters."
                disabled={appIsDisabled || nodes.length === 0}
            >
                <DownloadIcon className="w-4 h-4" />
            </button>
            <button
                onClick={performZoomToFit}
                className="p-2 bg-slate-700/70 hover:bg-slate-600/90 text-slate-100 rounded-full shadow-lg transition-all duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-opacity-75 disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Zoom to fit all nodes"
                title="Adjust zoom and pan to fit all currently visible nodes (after filtering) within the view."
                disabled={appIsDisabled || nodes.length === 0}
            >
                <ArrowsExpandIcon className="w-4 h-4" />
            </button>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;