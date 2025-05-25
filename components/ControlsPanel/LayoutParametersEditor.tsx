
import React, { useState } from 'react'; // Added useState for tooltip
import { LayoutType, LayoutParamsState, LayoutParamKey, SpecificLayoutParameterUIDefinitions } from '../../types';
import { LAYOUT_PARAMETER_DEFINITIONS } from '../../src/constants';
import Tooltip from '../VisualizationPanel/Tooltip'; // Import Tooltip
import { TooltipData } from '../../types'; // Import TooltipData

const HelpIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-3.5 h-3.5 text-slate-400 hover:text-sky-300 cursor-help ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.504l-1.414 2.121A1 1 0 008.586 10H9v2a1 1 0 102 0v-2.414a1 1 0 00-.293-.707l-1.414-1.414A1 1 0 009 7zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
  </svg>
);


interface LayoutParametersEditorProps<T extends LayoutType> {
  currentLayout: T;
  layoutParams: LayoutParamsState[T];
  onParamChange: <K extends LayoutParamKey<T>>(layoutType: T, paramName: K, value: number) => void;
  // onResetParams prop is removed as it's handled by parent CollapsibleSection
  disabled: boolean;
}

const LayoutParametersEditor = <T extends LayoutType>({
  currentLayout,
  layoutParams,
  onParamChange,
  disabled,
}: LayoutParametersEditorProps<T>) => {
  const [activeHelpTooltip, setActiveHelpTooltip] = useState<TooltipData | null>(null);

  const paramDefinitions = LAYOUT_PARAMETER_DEFINITIONS[currentLayout] as SpecificLayoutParameterUIDefinitions<T>;

  if (disabled || !paramDefinitions || paramDefinitions.length === 0) {
    return (
      <div className={`py-1 ${disabled ? 'opacity-60' : ''}`}>
        <p className="text-xs text-slate-400/80">
          {disabled ? 'Load data to configure layout parameters.' : 'No parameters for this layout.'}
        </p>
      </div>
    );
  }
  
  return (
    <>
      <div className={`space-y-2.5 ${disabled ? 'opacity-60' : ''}`}>
        {/* Title and Reset All button are removed from here */}
        {paramDefinitions.map(paramDef => {
          const paramKey = paramDef.key as LayoutParamKey<T>;
          const currentValue = layoutParams[paramKey] as number;
          const inputId = `layout-param-${currentLayout}-${String(paramKey)}`;
          const formattedValue = typeof currentValue === 'number' ? currentValue.toFixed(paramDef.step && paramDef.step < 1 ? (paramDef.step.toString().split('.')[1]?.length || 2) : 0) : 'N/A';

          return (
            <div key={String(paramKey)} className="grid grid-cols-[auto,1fr,minmax(0,max-content)] items-center gap-x-2">
              <div className="flex items-center space-x-1 col-span-1">
                <label htmlFor={inputId} className="text-xs text-slate-300 truncate" title={`${paramDef.label} (Current: ${formattedValue}). ${paramDef.description || ''}`}>
                  {paramDef.label}
                </label>
                {paramDef.description && (
                  <span
                    onMouseOver={(e) => setActiveHelpTooltip({ content: paramDef.description || 'No description available.', x: e.pageX, y: e.pageY, visible: true })}
                    onMouseOut={() => setActiveHelpTooltip(null)}
                    className="flex-shrink-0"
                    aria-label={`Help for ${paramDef.label}`}
                  >
                    <HelpIcon />
                  </span>
                )}
              </div>
              <input
                id={inputId}
                type="range"
                min={paramDef.min}
                max={paramDef.max}
                step={paramDef.step}
                value={currentValue}
                onChange={(e) => onParamChange(currentLayout, paramKey, parseFloat(e.target.value))}
                className="w-full h-1.5 bg-slate-400/70 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300/70 focus:ring-offset-1 focus:ring-offset-slate-700 col-span-1 disabled:opacity-50"
                disabled={disabled}
                aria-label={`${paramDef.label}. Min: ${paramDef.min}, Max: ${paramDef.max}, Current: ${formattedValue}`}
                title={`Adjust ${paramDef.label}. Range: ${paramDef.min} to ${paramDef.max}. Current: ${formattedValue}. ${paramDef.description || ''}`}
              />
              <span className="text-xs text-slate-200 text-right tabular-nums col-span-1" title={`Current value for ${paramDef.label}: ${formattedValue}`}>
                {formattedValue}
              </span>
            </div>
          );
        })}
      </div>
      {activeHelpTooltip && <Tooltip {...activeHelpTooltip} />}
    </>
  );
};

export default React.memo(LayoutParametersEditor);
