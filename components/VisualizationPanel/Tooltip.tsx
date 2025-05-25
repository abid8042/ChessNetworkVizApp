import React from 'react';
import { TooltipData } from '../../types';

const Tooltip: React.FC<TooltipData> = ({ content, x, y, visible }) => {
  // Do not render if not visible to avoid unnecessary DOM elements
  // The visibility is now primarily controlled by the 'visible' class in index.html
  if (!visible) return null; 

  return (
    <div
      className={`tooltip ${visible ? 'visible' : ''}`} // Add 'visible' class conditionally
      style={{
        left: `${x + 15}px`,
        top: `${y + 15}px`,
        // Opacity and transform are now handled by CSS in index.html
      }}
      role="tooltip"
      aria-hidden={!visible}
    >
      {typeof content === 'string' ? <pre>{content}</pre> : content}
    </div>
  );
};

export default Tooltip;