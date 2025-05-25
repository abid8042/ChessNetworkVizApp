
import React from 'react';

interface PieceFilterProps {
  selectedPieceTypes: number[];
  selectedPieceColor: string | null;
  onPieceTypeChange: (types: number[]) => void;
  onPieceColorChange: (color: string | null) => void;
  pieceTypeMap: { [key: number]: string };
  pieceTypeIds: number[];
  pieceColorMap: { [key: string]: string };
}

const PieceFilter: React.FC<PieceFilterProps> = ({
  selectedPieceTypes,
  selectedPieceColor,
  onPieceTypeChange,
  onPieceColorChange,
  pieceTypeMap,
  pieceTypeIds,
  pieceColorMap
}) => {
  const handleTypeChange = (typeId: number) => {
    const newSelectedTypes = selectedPieceTypes.includes(typeId)
      ? selectedPieceTypes.filter(t => t !== typeId)
      : [...selectedPieceTypes, typeId];
    onPieceTypeChange(newSelectedTypes);
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="block text-xs font-medium text-slate-300 mb-1.5" title="Show only nodes (squares) that are currently occupied by the selected piece types (e.g., Pawns, Knights).">Filter by Piece Type</p>
        <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
          {pieceTypeIds.map(typeId => (
            <label 
              key={typeId} 
              className="flex items-center space-x-2 cursor-pointer group p-1 rounded-md hover:bg-slate-500/60 transition-colors"
              title={`Toggle filter for ${pieceTypeMap[typeId]}s. Check to include ${pieceTypeMap[typeId]}s, uncheck to exclude.`}
            >
              <input
                type="checkbox"
                checked={selectedPieceTypes.includes(typeId)}
                onChange={() => handleTypeChange(typeId)}
                className="form-checkbox h-3.5 w-3.5 text-sky-400 bg-slate-500 border-slate-400 rounded focus:ring-1 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-600"
                aria-label={`Filter by piece type ${pieceTypeMap[typeId]}`}
              />
              <span className="text-xs text-slate-300 group-hover:text-sky-300">{pieceTypeMap[typeId]}</span>
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="block text-xs font-medium text-slate-300 mb-1.5" title="Show only nodes (squares) that are currently occupied by pieces of the selected color (White or Black), or any color.">Filter by Piece Color</p>
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          <label 
            className="flex items-center space-x-2 cursor-pointer group p-1 rounded-md hover:bg-slate-500/60 transition-colors"
            title="Show pieces of any color (both White and Black pieces that match other filters)."
          >
            <input
              type="radio"
              name="pieceColor"
              value=""
              checked={selectedPieceColor === null}
              onChange={() => onPieceColorChange(null)}
              className="form-radio h-3.5 w-3.5 text-sky-400 bg-slate-500 border-slate-400 focus:ring-1 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-600"
              aria-label="Filter by any piece color"
            />
            <span className="text-xs text-slate-300 group-hover:text-sky-300">Any</span>
          </label>
          {Object.entries(pieceColorMap).map(([value, label]) => (
            <label 
              key={value} 
              className="flex items-center space-x-2 cursor-pointer group p-1 rounded-md hover:bg-slate-500/60 transition-colors"
              title={`Show only ${label} pieces that match other active filters.`}
            >
              <input
                type="radio"
                name="pieceColor"
                value={value}
                checked={selectedPieceColor === value}
                onChange={() => onPieceColorChange(value)}
                className="form-radio h-3.5 w-3.5 text-sky-400 bg-slate-500 border-slate-400 focus:ring-1 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-600"
                aria-label={`Filter by piece color ${label}`}
              />
              <span className="text-xs text-slate-300 group-hover:text-sky-300">{label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};

export default React.memo(PieceFilter);
