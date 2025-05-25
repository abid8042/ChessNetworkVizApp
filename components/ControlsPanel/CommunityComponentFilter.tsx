
import React from 'react';

interface CommunityComponentFilterProps {
  selectedComponentIds: number[];
  selectedCommunityIds: number[];
  onComponentIdChange: (ids: number[]) => void;
  onCommunityIdChange: (ids: number[]) => void;
  availableComponentIds: number[];
  availableCommunityIds: number[];
}

const MultiSelectCheckboxes: React.FC<{
    label: string;
    options: number[];
    selectedOptions: number[];
    onChange: (newSelected: number[]) => void;
    entityName: string;
    tooltip?: string; // Added tooltip prop
}> = ({ label, options, selectedOptions, onChange, entityName, tooltip}) => {
    
    const handleCheckboxChange = (optionId: number) => {
        const newSelected = selectedOptions.includes(optionId)
            ? selectedOptions.filter(id => id !== optionId)
            : [...selectedOptions, optionId];
        onChange(newSelected);
    };

    if (options.length === 0) {
        return <p className="text-xs text-slate-400/80">No {entityName.toLowerCase()} IDs available for the current data selection.</p>;
    }

    return (
        <div>
            <p className="block text-xs font-medium text-slate-300 mb-1" title={tooltip || `Filter nodes by their ${entityName} ID. Select one or more IDs to include in the visualization.`}>{label}</p>
            <div className="max-h-28 overflow-y-auto bg-slate-500/50 border border-slate-400/60 rounded-md p-1.5 space-y-1 custom-scrollbar">
                {options.map(optionId => (
                    <label 
                        key={optionId} 
                        className="flex items-center space-x-2 cursor-pointer text-xs text-slate-300 hover:text-sky-300 transition-colors px-1.5 py-1 rounded hover:bg-slate-400/40"
                        title={`Toggle filter for ${entityName} ID ${optionId}. Check to include, uncheck to exclude.`}
                    >
                        <input
                            type="checkbox"
                            checked={selectedOptions.includes(optionId)}
                            onChange={() => handleCheckboxChange(optionId)}
                            className="form-checkbox h-3.5 w-3.5 text-sky-400 bg-slate-500 border-slate-400 rounded focus:ring-1 focus:ring-sky-400 focus:ring-offset-1 focus:ring-offset-slate-600"
                            aria-label={`Filter by ${entityName} ID ${optionId}`}
                        />
                        <span>ID: {optionId}</span>
                    </label>
                ))}
            </div>
        </div>
    );
}


const CommunityComponentFilter: React.FC<CommunityComponentFilterProps> = ({
  selectedComponentIds,
  selectedCommunityIds,
  onComponentIdChange,
  onCommunityIdChange,
  availableComponentIds,
  availableCommunityIds
}) => {
  return (
    <div className="space-y-3">
      <MultiSelectCheckboxes 
        label="Filter by Component ID"
        options={availableComponentIds}
        selectedOptions={selectedComponentIds}
        onChange={onComponentIdChange}
        entityName="Component"
        tooltip="Select specific connected components of the graph to display. Components are distinct subgraphs where all nodes are reachable from each other, but there are no paths between different components."
      />
      <MultiSelectCheckboxes
        label="Filter by Community ID"
        options={availableCommunityIds}
        selectedOptions={selectedCommunityIds}
        onChange={onCommunityIdChange}
        entityName="Community"
        tooltip="Select specific communities (groups of densely connected nodes) within components to display. Community detection algorithms identify these clusters. Helps find functional groups or tightly-knit structures."
      />
    </div>
  );
};

export default React.memo(CommunityComponentFilter);
