
import * as d3 from 'd3';
import { ProcessedNode, ProcessedLink, ForceDirectedLayoutParams } from '../../types'; // Added ForceDirectedLayoutParams
// Correct import path for constants from ../../constants to ../constants
import {
    PHYSICS_NODE_COLLIDE_PADDING,
    PHYSICS_NODE_BASE_RADIUS_PIECE, PHYSICS_NODE_BASE_RADIUS_EMPTY,
    NODE_VISUAL_SCALING_REFERENCE_DIMENSION, 
    NODE_VISUAL_SCALING_MIN_FACTOR, NODE_VISUAL_SCALING_MAX_FACTOR
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

export function applyForceDirectedLayout(
  simulation: d3.Simulation<ProcessedNode, ProcessedLink>,
  nodes: ProcessedNode[],
  links: ProcessedLink[],
  dimensions: { width: number; height: number },
  params: ForceDirectedLayoutParams // Accept layout parameters
): void {
  const { width, height } = dimensions;

  simulation
    .force("link", d3.forceLink<ProcessedNode, ProcessedLink>(links)
      .id((d: any) => d.id)
      .distance(params.linkDistance) // Use param
      .strength(params.linkStrength)) // Use param
    .force("charge", d3.forceManyBody().strength(params.chargeStrength)) // Use param
    .force("collide", d3.forceCollide<ProcessedNode>()
      .radius(d => getScaledNodeCollisionRadius(d, dimensions))
      .strength(params.collideStrength)) // Use param
    .force("center", d3.forceCenter(width / 2, height / 2).strength(params.centerStrength / 2)); // Use param for general centering (halved for component specific too)

  const componentCenters: { [key: number]: { x: number, y: number } } = {};
  const uniqueComponentIds = Array.from(new Set(nodes.map(n => n.component_id)));
  
  // Adjust component layout radius based on the number of components and available space
  // This logic can be refined or made part of params if needed.
  const baseComponentLayoutRadius = Math.min(width, height) / (uniqueComponentIds.length > 2 ? 3 : (uniqueComponentIds.length > 1 ? 2.5 : 10));

  uniqueComponentIds.forEach((id, i) => {
    const angle = (i / uniqueComponentIds.length) * 2 * Math.PI;
    componentCenters[id] = {
      x: width / 2 + (uniqueComponentIds.length > 1 ? baseComponentLayoutRadius * Math.cos(angle) : 0),
      y: height / 2 + (uniqueComponentIds.length > 1 ? baseComponentLayoutRadius * Math.sin(angle) : 0)
    };
  });

  if (uniqueComponentIds.length > 1) {
    simulation
      .force("x", d3.forceX<ProcessedNode>(d => componentCenters[d.component_id]?.x || width / 2)
        .strength(params.componentCenterStrength)) // Use param for component specific X
      .force("y", d3.forceY<ProcessedNode>(d => componentCenters[d.component_id]?.y || height / 2)
        .strength(params.componentCenterStrength)); // Use param for component specific Y
  } else {
    // For a single component, ensure the general center force is fully active
    simulation.force("x", null).force("y", null); 
    simulation.force("center", d3.forceCenter(width / 2, height / 2).strength(params.centerStrength)); // Use full general center strength
  }
}
