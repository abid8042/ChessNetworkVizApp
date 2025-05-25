
import React from 'react';
import { Piece } from '../../types';
import { PIECE_UNICODE_MAP } from '../../src/constants';

interface CapturedPiecesDisplayProps { 
  capturedPieces: Piece[];
  disabled: boolean;
}

const CapturedPiecesDisplay: React.FC<CapturedPiecesDisplayProps> = ({ capturedPieces, disabled }) => {
  if (disabled) { 
    return (
      <div className={`py-1 ${disabled ? 'opacity-60' : ''}`}>
        <p className="text-xs text-slate-400">Load data to view captured pieces.</p>
      </div>
    );
  }

  const whiteCaptured = capturedPieces.filter(p => p.c === 'black'); 
  const blackCaptured = capturedPieces.filter(p => p.c === 'white'); 

  const renderPieceList = (pieces: Piece[], capturerColor: string) => (
    <div className="mt-1">
      <h4 
        className="text-xs font-medium text-slate-300"
        title={`List of ${capturerColor === 'White' ? 'Black' : 'White'} pieces that have been captured by ${capturerColor} up to the current move.`}
      >
        {capturerColor}'s Captures:
      </h4>
      {pieces.length === 0 ? <p className="text-xs text-slate-400 italic ml-1">None</p> :
        <div className="flex flex-wrap gap-x-1.5 gap-y-0.5 text-xl leading-none text-slate-100 pt-1">
          {pieces.map(p => {
            let pieceKeyForUnicode: string | undefined = undefined;
            const pieceTypeInitial = p.t === "Knight" ? "N" : p.t[0]?.toUpperCase();

            if (pieceTypeInitial) {
                pieceKeyForUnicode = p.c === 'white' ? pieceTypeInitial.toUpperCase() : pieceTypeInitial.toLowerCase();
                if (p.t === "Knight") {
                    pieceKeyForUnicode = p.c === 'white' ? "N" : "n";
                }
            }
            const unicodeSymbol = pieceKeyForUnicode ? (PIECE_UNICODE_MAP[pieceKeyForUnicode] || pieceKeyForUnicode) : p.t[0];
            return (
              <span 
                key={p.id} 
                title={`${p.c.charAt(0).toUpperCase() + p.c.slice(1)} ${p.t} (ID: ${p.id}) captured on move ${p.cap}. Originally on square ${p.sq}.`}
                className="transition-transform hover:scale-110"
                aria-label={`${p.c} ${p.t} captured`}
              >
                {unicodeSymbol}
              </span>
            );
          })}
        </div>
      }
    </div>
  );

  return (
    <div className="py-1">
      {renderPieceList(whiteCaptured, 'White')}
      {renderPieceList(blackCaptured, 'Black')}
      {whiteCaptured.length === 0 && blackCaptured.length === 0 && (
        <p className="text-xs text-slate-400 italic mt-1">No pieces captured yet in the game up to the current move.</p>
      )}
    </div>
  );
};
export default React.memo(CapturedPiecesDisplay);
