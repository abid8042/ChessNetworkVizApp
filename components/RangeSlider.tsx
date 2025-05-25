
import React from 'react';

interface RangeSliderProps {
  label: string;
  metricKey: string; // For IDs
  minVal: number;
  maxVal: number;
  dataMin: number;
  dataMax: number;
  onMinChange: (val: number) => void;
  onMaxChange: (val: number) => void;
  step?: number; // Allow explicit step prop
  tooltip?: string; // Optional tooltip for the label
}

const RangeSlider: React.FC<RangeSliderProps> = ({
  label,
  metricKey,
  minVal,
  maxVal,
  dataMin,
  dataMax,
  onMinChange,
  onMaxChange,
  step, // Use provided step
  tooltip,
}) => {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = parseFloat(e.target.value);
    if (newMin <= maxVal) {
      onMinChange(newMin);
    } else {
      // If newMin is greater than maxVal due to direct input or large step,
      // set min to maxVal to maintain invariant minVal <= maxVal
      onMinChange(maxVal); 
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = parseFloat(e.target.value);
    if (newMax >= minVal) {
      onMaxChange(newMax);
    } else {
      // If newMax is less than minVal, set max to minVal
      onMaxChange(minVal);
    }
  };
  
  const range = dataMax - dataMin;
  const dynamicStep = step !== undefined ? step : // Use provided step first
                     range <= 0 ? 0.01 :
                     range < 2 ? 0.01 :
                     range < 10 ? 0.1 :
                     range < 100 ? 0.5 :
                     1;

  const formatValue = (val: number) => {
    if (val === undefined || val === null) return 'N/A';
    const numVal = Number(val);
    if (isNaN(numVal)) return 'N/A';

    const currentStep = step !== undefined ? step : dynamicStep;
    // Determine number of decimal places based on step
    let decimalPlaces = 0;
    if (currentStep < 1) {
        const stepStr = currentStep.toString();
        if (stepStr.includes('.')) {
            decimalPlaces = stepStr.split('.')[1].length;
        }
    }
    
    if (Math.abs(numVal) < 0.0001 && numVal !== 0 && decimalPlaces < 3) return numVal.toExponential(1);

    return numVal.toFixed(decimalPlaces);
  }
  
  const formattedMinVal = formatValue(minVal);
  const formattedMaxVal = formatValue(maxVal);
  const formattedDataMin = formatValue(dataMin);
  const formattedDataMax = formatValue(dataMax);


  return (
    <div className="mb-2">
      <label className="block text-xs font-medium text-slate-300 mb-1" title={tooltip || `Filter nodes by the '${label}' metric. Adjust the sliders to set the desired range (min: ${formattedDataMin}, max: ${formattedDataMax}).`}>{label}</label>
      <div className="space-y-1.5">
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={dataMin}
            max={dataMax}
            value={minVal}
            onChange={handleMinChange}
            step={dynamicStep}
            className="w-full h-1.5 bg-slate-400/70 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300/70 focus:ring-offset-1 focus:ring-offset-slate-600"
            id={`${metricKey}-min-slider`}
            aria-label={`${label} minimum value slider. Current range: ${formattedMinVal} to ${formattedMaxVal}. Data range: ${formattedDataMin} to ${formattedDataMax}.`}
            title={`Set minimum value for ${label}. Current: ${formattedMinVal}. Data range: ${formattedDataMin} to ${formattedDataMax}.`}
          />
          <span className="text-xs text-slate-200 w-10 text-right tabular-nums" title={`Current minimum filter value for ${label}: ${formattedMinVal}`}>{formattedMinVal}</span>
        </div>
        <div className="flex items-center space-x-2">
          <input
            type="range"
            min={dataMin}
            max={dataMax}
            value={maxVal}
            onChange={handleMaxChange}
            step={dynamicStep}
            className="w-full h-1.5 bg-slate-400/70 rounded-lg appearance-none cursor-pointer accent-pink-400 focus:outline-none focus:ring-1 focus:ring-pink-300/70 focus:ring-offset-1 focus:ring-offset-slate-600"
            id={`${metricKey}-max-slider`}
            aria-label={`${label} maximum value slider. Current range: ${formattedMinVal} to ${formattedMaxVal}. Data range: ${formattedDataMin} to ${formattedDataMax}.`}
            title={`Set maximum value for ${label}. Current: ${formattedMaxVal}. Data range: ${formattedDataMin} to ${formattedDataMax}.`}
          />
          <span className="text-xs text-slate-200 w-10 text-right tabular-nums" title={`Current maximum filter value for ${label}: ${formattedMaxVal}`}>{formattedMaxVal}</span>
        </div>
      </div>
    </div>
  );
};

export default React.memo(RangeSlider);
