
import * as d3 from 'd3';
import { SequentialColorPaletteId } from '../types';

export interface SequentialColorPaletteOption {
  value: SequentialColorPaletteId;
  label: string;
  description: string;
}

export const SEQUENTIAL_COLOR_PALETTE_OPTIONS: SequentialColorPaletteOption[] = [
  { value: 'viridis', label: 'Viridis', description: 'Perceptually uniform, vibrant, and good for colorblindness. Ranges from purple through blue, green to yellow.' },
  { value: 'magma', label: 'Magma', description: 'Perceptually uniform. Ranges from black through purple, red, orange, to yellow.' },
  { value: 'plasma', label: 'Plasma', description: 'Perceptually uniform. Ranges from blue/purple through red, orange, to yellow.' },
  { value: 'cividis', label: 'Cividis', description: 'Perceptually uniform and designed for viewers with color vision deficiency (deuteranomaly and protanomaly). Ranges from blue to yellow.' },
  { value: 'cool', label: 'Cool', description: 'Sequential palette from cyan to magenta.' },
  { value: 'blues', label: 'Blues', description: 'Sequential single-hue palette from light blue to dark blue.' },
];

export const D3_SEQUENTIAL_INTERPOLATORS: Record<SequentialColorPaletteId, (t: number) => string> = {
  viridis: d3.interpolateViridis,
  magma: d3.interpolateMagma,
  plasma: d3.interpolatePlasma,
  cividis: d3.interpolateCividis,
  cool: d3.interpolateCool,
  blues: d3.interpolateBlues,
};
