
import { LayoutParamsState, AllLayoutParameterUIDefinitions } from '../types'; // Corrected path

// Node Visual Constants
export const VISUAL_NODE_BASE_RADIUS_PIECE = 20;    // Base visual radius for piece nodes for rendering (Increased from 15)
export const VISUAL_NODE_BASE_RADIUS_EMPTY = 14;     // Base visual radius for empty square nodes for rendering (Increased from 10)

// Node Physics Constants
export const PHYSICS_NODE_BASE_RADIUS_PIECE = 16;    // Base radius for piece nodes for collision physics (Increased from 12)
export const PHYSICS_NODE_BASE_RADIUS_EMPTY = 11;     // Base radius for empty square nodes for collision physics (Increased from 8)
export const PHYSICS_NODE_COLLIDE_PADDING = 2;       // Padding around collision radius (applied after scaling base radius)

// Shared Node Visual Scaling Constants (used by both visual rendering and physics)
export const NODE_VISUAL_SCALING_REFERENCE_DIMENSION = 800; // SVG dimension (min of width/height) for 1x scale
export const NODE_VISUAL_SCALING_MIN_FACTOR = 0.8;         // Minimum scaling factor
export const NODE_VISUAL_SCALING_MAX_FACTOR = 1.2;         // Maximum scaling factor

// --- Default Layout Parameters ---
export const DEFAULT_LAYOUT_PARAMS: LayoutParamsState = {
  'force-directed': {
    linkDistance: 50,
    linkStrength: 0.07,
    chargeStrength: -120,
    collideStrength: 0.7,
    centerStrength: 0.03, // General center strength for single component
    componentCenterStrength: 0.08, // Strength for pulling components apart/together
  },
  'radial': {
    chargeStrength: -70,
    linkDistanceFactor: 0.4, // Multiplier for default link distance
    linkStrengthFactor: 0.9, // Multiplier for default link strength
    radialStrength: 0.8,     // Strength pulling nodes to their ideal radius
    ringMinRadiusFactor: 4,  // Multiplied by largest node radius to set min ring radius
    maxOuterRadiusFactor: 2.5, // Divides min(width,height) to get max spread
  },
  'spiral': {
    coils: 3,
    maxRadiusMargin: 40,   // Pixels from edge
    linkDistance: 15,
    linkStrength: 0.01,
  },
};

// --- UI Definitions for Layout Parameters ---
export const LAYOUT_PARAMETER_DEFINITIONS: AllLayoutParameterUIDefinitions = {
  'force-directed': [
    { key: 'linkDistance', label: 'Link Distance', type: 'slider', min: 10, max: 200, step: 1, description: 'Target distance between linked nodes. Higher values spread linked nodes further apart.' },
    { key: 'linkStrength', label: 'Link Strength', type: 'slider', min: 0.01, max: 1, step: 0.01, description: 'How strongly links pull nodes together. Higher values make links more rigid.' },
    { key: 'chargeStrength', label: 'Charge Strength', type: 'slider', min: -500, max: -10, step: 1, description: 'Simulates electrostatic charge. Negative values make nodes repel each other. More negative means stronger repulsion.' },
    { key: 'collideStrength', label: 'Collide Strength', type: 'slider', min: 0.1, max: 1, step: 0.05, description: 'Strength of the collision force preventing nodes from overlapping. Higher values make nodes less likely to overlap.' },
    { key: 'centerStrength', label: 'Center Strength (Overall)', type: 'slider', min: 0.01, max: 0.5, step: 0.01, description: 'How strongly all nodes are pulled towards the center of the visualization. Effective when there is a single connected component.' },
    { key: 'componentCenterStrength', label: 'Component Separation', type: 'slider', min: 0.01, max: 0.5, step: 0.01, description: 'Strength of pulling nodes towards their respective component centers. Helps separate distinct components if multiple exist. Higher values increase separation.' },
  ],
  'radial': [
    { key: 'chargeStrength', label: 'Charge Strength', type: 'slider', min: -300, max: -10, step: 1, description: 'Repulsive force between nodes. Helps spread nodes within their rings. More negative means stronger repulsion.' },
    { key: 'linkDistanceFactor', label: 'Link Distance Factor', type: 'slider', min: 0.1, max: 2.0, step: 0.05, description: 'Multiplier for the base link distance. Adjusts how far linked nodes are from each other within the radial constraints.' },
    { key: 'linkStrengthFactor', label: 'Link Strength Factor', type: 'slider', min: 0.1, max: 2.0, step: 0.05, description: 'Multiplier for the base link strength. Adjusts how rigidly links hold nodes together.' },
    { key: 'radialStrength', label: 'Radial Strength', type: 'slider', min: 0.1, max: 1.0, step: 0.05, description: 'How strongly nodes are pulled towards their designated ring/radius. Higher values make rings more defined.' },
    { key: 'ringMinRadiusFactor', label: 'Min. Ring Radius Factor', type: 'slider', min: 1, max: 10, step: 0.5, description: 'Factor multiplied by the largest node radius to determine the minimum radius of the innermost ring. Prevents central crowding.' },
    { key: 'maxOuterRadiusFactor', label: 'Max. Outer Radius Factor', type: 'slider', min: 1.5, max: 5, step: 0.1, description: 'Divides the smaller of SVG width/height to determine the maximum extent of the outermost ring. Controls overall spread of rings.' },
  ],
  'spiral': [
    { key: 'coils', label: 'Number of Coils', type: 'slider', min: 1, max: 10, step: 0.5, description: 'The number of full rotations the spiral makes from center to edge. More coils pack nodes tighter or extend the spiral.' },
    { key: 'maxRadiusMargin', label: 'Max Radius Margin (px)', type: 'slider', min: 10, max: 150, step: 5, description: 'The margin (in pixels) from the edge of the visualization area to the outermost point of the spiral. Controls how close the spiral gets to the borders.' },
    { key: 'linkDistance', label: 'Link Distance', type: 'slider', min: 5, max: 70, step: 1, description: 'Target distance for links in the spiral layout. As nodes are fixed, this mainly affects link rendering and any subtle physics if enabled.' },
    { key: 'linkStrength', label: 'Link Strength', type: 'slider', min: 0.001, max: 0.2, step: 0.001, description: 'Strength of links in the spiral layout. Less impactful as node positions are fixed, but can influence link appearance or minor adjustments if physics are slightly active.' },
  ],
};


// Piece Unicode symbols
export const PIECE_UNICODE_MAP: { [symbol: string]: string } = {
  'P': '♙', 'N': '♘', 'B': '♗', 'R': '♖', 'Q': '♕', 'K': '♔', // White
  'p': '♟', 'n': '♞', 'b': '♝', 'r': '♜', 'q': '♛', 'k': '♚', // Black
};

// Zoom to fit
export const ZOOM_TO_FIT_PADDING = 50; // Pixels
export const ZOOM_SETTLE_DELAY = 300; // ms, for dynamic layouts to settle before zoom-to-fit
