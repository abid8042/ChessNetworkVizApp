
import * as d3 from 'd3';
import { ProcessedNode, ProcessedLink, SortConfig, NodeNumericMetricKey, NODE_METRIC_KEYS, RadialLayoutParams } from '../../types'; // Added RadialLayoutParams
// Correct import path for constants
import {
    PHYSICS_NODE_COLLIDE_PADDING,
    PHYSICS_NODE_BASE_RADIUS_PIECE, PHYSICS_NODE_BASE_RADIUS_EMPTY,
    NODE_VISUAL_SCALING_REFERENCE_DIMENSION,
    NODE_VISUAL_SCALING_MIN_FACTOR, NODE_VISUAL_SCALING_MAX_FACTOR,
    // Default link distance/strength needed if factors are applied to them
    DEFAULT_LAYOUT_PARAMS
} from '../constants';

const getScaledNodeCollisionRadius = (
    node: ProcessedNode, 
    dims: { width: number; height: number }
): number => {
    const baseRadius = node.has_piece ? PHYSICS_NODE_BASE_RADIUS_PIECE : PHYSICS_NODE_BASE_RADIUS_EMPTY;
    
    if (dims.width === 0 || dims.height === 0) {
         return baseRadius + PHYSICS_NODE_COLLIDE_PADDING;
    }
    
    const minDim = Math.min(dims.width, dims.height);
    let scale = minDim / NODE_VISUAL_SCALING_REFERENCE_DIMENSION;
    scale = Math.max(NODE_VISUAL_SCALING_MIN_FACTOR, Math.min(NODE_VISUAL_SCALING_MAX_FACTOR, scale));
    return (baseRadius * scale) + PHYSICS_NODE_COLLIDE_PADDING;
};

export function applyRadialLayout(
  simulation: d3.Simulation<ProcessedNode, ProcessedLink>,
  nodes: ProcessedNode[], 
  links: ProcessedLink[],
  dimensions: { width: number; height: number },
  sortConfig: SortConfig,
  params: RadialLayoutParams // Accept layout parameters
): void {
  const { width, height } = dimensions;

  let uniqueGroupTags = Array.from(new Set(nodes.map(n => n.groupTag)));
  
  const sortKeyIsNumericMetric = NODE_METRIC_KEYS.includes(sortConfig.key as NodeNumericMetricKey);

  if (sortKeyIsNumericMetric) {
    const groupAvgs = new Map<string, number>();
    uniqueGroupTags.forEach(tag => {
      const nodesInGroup = nodes.filter(n => n.groupTag === tag);
      if (nodesInGroup.length > 0) {
        const sum = nodesInGroup.reduce((acc, curr) => {
          const val = (curr as any)[sortConfig.key];
          return acc + (typeof val === 'number' && !isNaN(val) ? val : 0);
        }, 0);
        groupAvgs.set(tag, sum / nodesInGroup.length);
      } else {
        groupAvgs.set(tag, 0);
      }
    });
    uniqueGroupTags.sort((a, b) => {
      const valA = groupAvgs.get(a) || 0;
      const valB = groupAvgs.get(b) || 0;
      return (valA - valB) * (sortConfig.order === 'asc' ? 1 : -1);
    });
  } else if (sortConfig.key === 'component_id') {
    uniqueGroupTags.sort((a, b) => {
      const compA = parseInt(a.split('-')[0]);
      const compB = parseInt(b.split('-')[0]);
      return (compA - compB) * (sortConfig.order === 'asc' ? 1 : -1);
    });
  } else if (sortConfig.key === 'community_id') {
     uniqueGroupTags.sort((a, b) => { 
      const compA = parseInt(a.split('-')[0]);
      const compB = parseInt(b.split('-')[0]);
      if (compA !== compB) {
        return (compA - compB) * (sortConfig.order === 'asc' ? 1 : -1);
      }
      const commA = parseInt(a.split('-')[1]);
      const commB = parseInt(b.split('-')[1]);
      return (commA - commB) * (sortConfig.order === 'asc' ? 1 : -1);
    });
  } else { 
    uniqueGroupTags.sort((a, b) => {
      return a.localeCompare(b) * (sortConfig.order === 'asc' ? 1 : -1);
    });
  }

  const numRings = uniqueGroupTags.length;
  const maxOuterRadius = Math.min(width, height) / params.maxOuterRadiusFactor; // Use param
  
  const groupTagToRadius = new Map<string, number>();
  uniqueGroupTags.forEach((tag, i) => {
    let radius;
    if (numRings <= 1) { 
      radius = numRings === 1 ? maxOuterRadius / 2 : 0; 
    } else {
      const largestUnscaledPhysicsRadius = Math.max(PHYSICS_NODE_BASE_RADIUS_PIECE, PHYSICS_NODE_BASE_RADIUS_EMPTY);
      const minInnerRadius = (largestUnscaledPhysicsRadius + PHYSICS_NODE_COLLIDE_PADDING) * params.ringMinRadiusFactor; // Use param
      
      const availableRadiusSpace = maxOuterRadius - minInnerRadius;
      const ringSpacing = availableRadiusSpace > 0 && numRings > 1 ? availableRadiusSpace / (numRings - 1) : 0;
      radius = minInnerRadius + ringSpacing * i ;
    }
    groupTagToRadius.set(tag, Math.max(0, radius));
  });

  nodes.forEach(node => {
    node.targetRadius = groupTagToRadius.get(node.groupTag) ?? (maxOuterRadius / 2);
  });
  
  // Use default link distance/strength from 'force-directed' for baseline, then apply factors
  const baseLinkDistance = DEFAULT_LAYOUT_PARAMS['force-directed'].linkDistance;
  const baseLinkStrength = DEFAULT_LAYOUT_PARAMS['force-directed'].linkStrength;

  simulation
    .force("link", d3.forceLink<ProcessedNode, ProcessedLink>(links)
      .id((d: any) => d.id)
      .distance(baseLinkDistance * params.linkDistanceFactor) // Use param factor
      .strength(baseLinkStrength * params.linkStrengthFactor)) // Use param factor
    .force("charge", d3.forceManyBody().strength(params.chargeStrength)) // Use param
    .force("collide", d3.forceCollide<ProcessedNode>()
      .radius(d => getScaledNodeCollisionRadius(d, dimensions))
      .strength(DEFAULT_LAYOUT_PARAMS["force-directed"].collideStrength)) // Keep collide strength from defaults for now, or make it a radial param too
    .force("r", d3.forceRadial<ProcessedNode>(
      d => d.targetRadius!, // Added non-null assertion
      width / 2,
      height / 2
     ).strength(params.radialStrength)) // Use param
    .force("center", d3.forceCenter(width/2, height/2).strength(0.02)); 

    simulation.force("x", null).force("y", null); 
}
