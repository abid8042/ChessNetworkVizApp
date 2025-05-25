
import React from 'react';
import { SequentialColorPaletteId } from '../../types';
import { SEQUENTIAL_COLOR_PALETTE_OPTIONS } from '../../src/colorPaletteConstants';

interface SequentialColorPaletteSelectorProps {
  currentPalette: SequentialColorPaletteId;
  onPaletteChange: (paletteId: SequentialColorPaletteId) => void;
  disabled: boolean; // This should be true if app is disabled OR node coloring is not numeric
}

const SequentialColorPaletteSelector: React.FC<SequentialColorPaletteSelectorProps> = ({
  currentPalette,
  onPaletteChange,
  disabled,
}) => {
  if (disabled) { // If explicitly disabled (e.g. not numeric coloring or app disabled)
    return null; // Or render a disabled-looking version if preferred for layout consistency
  }

  return (
    <div className={`py-2 ${disabled ? 'opacity-60' : ''}`}>
      <label 
        htmlFor="sequential-color-palette-selector" 
        className="block text-sm font-medium text-slate-200 mb-1.5" 
        title="Choose a color scheme for visualizing continuous numeric data. Different palettes offer various aesthetic and perceptual properties."
      >
        Sequential Color Palette
      </label>
      <select
        id="sequential-color-palette-selector"
        value={currentPalette}
        onChange={(e) => onPaletteChange(e.target.value as SequentialColorPaletteId)}
        className="block w-full pl-3 pr-10 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-400/80 focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 rounded-lg shadow-sm transition-colors duration-150 disabled:opacity-70 disabled:cursor-not-allowed disabled:bg-slate-300/20 disabled:text-slate-400"
        disabled={disabled}
        aria-label="Select sequential color palette for numeric node coloring"
        title="Select the color palette for nodes when a numeric coloring metric is active."
      >
        {SEQUENTIAL_COLOR_PALETTE_OPTIONS.map(option => (
          <option 
            key={option.value} 
            value={option.value} 
            className="text-slate-800"
            title={option.description || `Use ${option.label} palette`}
          >
            {option.label}
          </option>
        ))}
      </select>
      {disabled && <p className="text-xs text-slate-400 mt-2">Palette selection available for numeric coloring metrics.</p>}
    </div>
  );
};

export default React.memo(SequentialColorPaletteSelector);
