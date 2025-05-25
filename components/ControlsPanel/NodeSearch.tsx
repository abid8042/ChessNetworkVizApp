
import React from 'react';

interface NodeSearchProps {
  searchTerm: string;
  onSearchTermChange: (term: string) => void;
}

const NodeSearch: React.FC<NodeSearchProps> = ({ searchTerm, onSearchTermChange }) => {
  return (
    <div>
      <label htmlFor="node-search" className="block text-xs font-medium text-slate-300 mb-1">
        Search Nodes (ID or Piece)
      </label>
      <input
        id="node-search"
        type="text"
        value={searchTerm}
        onChange={(e) => onSearchTermChange(e.target.value)}
        placeholder="e.g., e4 or N"
        className="block w-full px-3 py-2 text-sm bg-slate-100 text-slate-800 border border-slate-400/70 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-sky-400 focus:border-sky-400 placeholder-slate-400"
        aria-label="Search nodes by ID or piece symbol"
        title="Filter nodes by searching their square ID (e.g., 'a1', 'h8') or the symbol of the piece currently on them (e.g., 'N' for Knight, 'q' for black Queen, 'P' for white Pawn). Case-insensitive."
      />
    </div>
  );
};
export default React.memo(NodeSearch);
