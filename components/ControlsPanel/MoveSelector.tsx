
import React, { useState, useEffect } from 'react';

const ChevronLeftIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
  </svg>
);

const ChevronRightIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);

// SlidersIcon is no longer needed
// const SlidersIcon: React.FC<{ className?: string }> = ({ className }) => (
//   <svg className={`w-4 h-4 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
//     <path d="M5 4a1 1 0 00-2 0v2.586a1 1 0 00.293.707l5.414 5.414a1 1 0 00.707.293H15a1 1 0 000-2H8.414l-4.707-4.707A1 1 0 003.586 5H4a1 1 0 100-2z" />
//     <path fillRule="evenodd" d="M15 10a1 1 0 011 1v.086l1.707 1.707a1 1 0 01-1.414 1.414L15 12.914V15a1 1 0 11-2 0v-2.086l-1.707-1.707a1 1 0 011.414-1.414L14 11.086V11a1 1 0 011-1z" clipRule="evenodd" />
//   </svg>
// );


interface MoveSelectorProps {
  currentMoveIndex: number;
  totalMoves: number;
  currentMoveSAN: string | null;
  onMoveChange: (newMoveIndex: number) => void;
  disabled: boolean;
}

const MoveSelector: React.FC<MoveSelectorProps> = ({ currentMoveIndex, totalMoves, currentMoveSAN, onMoveChange, disabled }) => {
  const [inputValue, setInputValue] = useState<string>(currentMoveIndex.toString());

  useEffect(() => {
    setInputValue(currentMoveIndex.toString());
  }, [currentMoveIndex]);

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const processInput = () => {
    const num = parseInt(inputValue, 10);
    if (!isNaN(num) && totalMoves > 0) {
      const newIndex = Math.max(0, Math.min(num, totalMoves - 1));
      if (newIndex !== currentMoveIndex) {
        onMoveChange(newIndex);
      }
      setInputValue(newIndex.toString()); // Sync input with potentially clamped value
    } else {
      // Revert to current move index if input is invalid or no moves
      setInputValue(currentMoveIndex.toString());
    }
  };

  const handleInputBlur = () => {
    processInput();
  };

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      processInput();
      event.currentTarget.blur(); // Optionally blur input after enter
    }
  };

  if (disabled || totalMoves === 0) {
    return (
      <div className="flex flex-col items-start space-y-1.5 text-sm text-slate-400 opacity-70">
        <div className="flex items-center space-x-2">
            <button 
              className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 cursor-not-allowed" 
              disabled
              title="Previous move (disabled: no data loaded)"
            >
            <ChevronLeftIcon className="text-slate-500"/>
            </button>
            <div className="text-center w-24 sm:w-28">
                <span className="font-medium block" title="Current move number / Total moves">Move: --/--</span>
                <span className="text-xs block h-4" title="Standard Algebraic Notation (SAN) of the current move">Load data</span>
            </div>
             <input 
                type="number" 
                value="--"
                className="w-12 text-center bg-slate-700 border border-slate-600 rounded-md px-1 py-0.5 text-xs text-slate-500 cursor-not-allowed"
                disabled
                title="Go to move number (disabled: no data loaded)"
            />
            <button 
              className="p-1.5 rounded-md bg-slate-700 hover:bg-slate-600 cursor-not-allowed" 
              disabled
              title="Next move (disabled: no data loaded)"
            >
            <ChevronRightIcon className="text-slate-500"/>
            </button>
        </div>
        <div className="w-full pt-1 px-1">
             <input
                type="range"
                min="0"
                max="0"
                value="0"
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-not-allowed accent-slate-500"
                disabled
                aria-label="Move slider (disabled). Load data to enable."
                title="Move slider (disabled: no data loaded)"
            />
        </div>
      </div>
    );
  }
  
  const displaySAN = currentMoveSAN && currentMoveSAN !== "start" ? `${currentMoveSAN}` : 'Initial Position';
  const uniqueSliderId = "move-selector-range-header";

  const handlePrev = () => onMoveChange(currentMoveIndex - 1);
  const handleNext = () => onMoveChange(currentMoveIndex + 1);

  return (
    <div className={`flex flex-col items-start space-y-1.5 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <div className="flex items-center space-x-1.5 sm:space-x-2">
        <button 
          onClick={handlePrev} 
          disabled={disabled || currentMoveIndex === 0}
          className="p-1.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow"
          aria-label="Previous Move"
          title="Go to the previous move in the game"
        >
          <ChevronLeftIcon />
        </button>

        <div className="text-center flex-shrink-0 w-28 sm:w-32">
          <label htmlFor={uniqueSliderId} className="text-xs sm:text-sm font-medium text-slate-100 whitespace-nowrap block" title="Current move number out of total moves available">
            Move <span className="font-bold text-sky-300">{currentMoveIndex}</span> / {totalMoves - 1}
          </label>
          <p 
            className="text-[10px] sm:text-xs text-slate-300 mt-0.5 h-3 sm:h-4 truncate" 
            title={`Current move in Standard Algebraic Notation (SAN): ${displaySAN}`}
          >
            {displaySAN}
          </p>
        </div>
        
        <input
            type="number"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            min="0"
            max={totalMoves > 0 ? totalMoves - 1 : 0}
            className="w-12 sm:w-14 text-center bg-slate-700 text-slate-100 border border-slate-600 rounded-md px-1 py-0.5 text-xs focus:ring-1 focus:ring-sky-400 focus:border-sky-400 disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed"
            disabled={disabled}
            aria-label="Go to move number"
            title="Enter a move number (0 to total moves - 1) to jump directly to it"
        />

        <button 
          onClick={handleNext} 
          disabled={disabled || currentMoveIndex >= totalMoves - 1}
          className="p-1.5 rounded-md bg-sky-500 hover:bg-sky-600 text-white disabled:bg-slate-600 disabled:text-slate-400 disabled:cursor-not-allowed transition-colors shadow"
          aria-label="Next Move"
          title="Go to the next move in the game"
        >
          <ChevronRightIcon />
        </button>
        {/* Removed Slider Toggle Button */}
      </div>
      
      {/* Slider is now always visible if not disabled */}
      <div id="move-slider-details-header" className="w-full pt-1 px-1">
        <input
          id={uniqueSliderId}
          type="range"
          min="0"
          max={totalMoves - 1}
          value={currentMoveIndex}
          onChange={(e) => onMoveChange(parseInt(e.target.value, 10))}
          className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-sky-400 focus:outline-none focus:ring-1 focus:ring-sky-300/50 focus:ring-offset-1 focus:ring-offset-slate-800 disabled:accent-slate-500 disabled:cursor-not-allowed"
          disabled={disabled}
          aria-label={`Move slider: Current move ${currentMoveIndex} of ${totalMoves -1}. SAN: ${displaySAN}. Use this slider to quickly scrub through the game's moves.`}
          title={`Move slider: ${currentMoveIndex} / ${totalMoves - 1}. SAN: ${displaySAN}. Drag to navigate moves.`}
        />
      </div>
    </div>
  );
};

export default React.memo(MoveSelector);
