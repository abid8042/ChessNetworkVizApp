
import * as d3 from 'd3';
import { ProcessedNode, ProcessedLink, SpiralLayoutParams } from '../../types'; // Added SpiralLayoutParams

export function applySpiralLayout(
  simulation: d3.Simulation<ProcessedNode, ProcessedLink>,
  nodes: ProcessedNode[],
  links: ProcessedLink[],
  dimensions: { width: number; height: number },
  params: SpiralLayoutParams // Accept layout parameters
): void {
  const { width, height } = dimensions;
  const numNodes = nodes.length;

  if (numNodes === 0) {
    simulation.force("link", d3.forceLink<ProcessedNode, ProcessedLink>([]).id((d: any) => d.id));
    simulation.force("charge", null);
    simulation.force("collide", null);
    simulation.force("x", null);
    simulation.force("y", null);
    simulation.force("center", null);
    nodes.forEach(n => { 
        n.fx = null;
        n.fy = null;
    });
    return;
  }

  const maxRadius = Math.max(0, Math.min(width, height) / 2 - params.maxRadiusMargin); // Use param

  nodes.forEach((node, i) => {
    const t = numNodes > 1 ? i / (numNodes - 1) : 0.5; 
    const angle = 2 * Math.PI * params.coils * t; // Use param
    const radius = numNodes > 1 ? maxRadius * t : 0; 
    
    const targetX = width / 2 + radius * Math.cos(angle);
    const targetY = height / 2 + radius * Math.sin(angle);
    
    node.x = targetX; 
    node.y = targetY;
    node.fx = targetX; 
    node.fy = targetY;
  });

  simulation
    .force("link", d3.forceLink<ProcessedNode, ProcessedLink>(links)
      .id((d: any) => d.id)
      .distance(params.linkDistance) // Use param
      .strength(params.linkStrength)) // Use param
    .force("charge", null) 
    .force("collide", null) 
    .force("x", null)       
    .force("y", null)       
    .force("center", null); 
}
