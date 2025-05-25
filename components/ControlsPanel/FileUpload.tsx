
import React, { ChangeEvent, useCallback } from 'react';
import { validateSchema } from '../../utils/schemaValidator';
import { RawChessData } from '../../types';

interface FileUploadProps {
  onFileUpload: (data: RawChessData, fileName: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  disabled?: boolean;
  currentDataSourceName: string | null; // New prop
}

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);


const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, setLoading, setError, disabled, currentDataSourceName }) => {

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = event.target.files?.[0];
    if (file) {
      // No longer sets local fileName state
      setLoading(true);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const validationResult = validateSchema(text);
          if (validationResult.isValid && validationResult.data) {
            onFileUpload(validationResult.data, file.name); // Pass file.name
          } else {
            setError(validationResult.error || 'Unknown validation error.');
            console.error("Validation Error:", validationResult.error);
            onFileUpload(null as any, ''); // Signal error or reset in App.tsx if needed
          }
        } catch (err) {
          setError(`Error processing file: ${(err as Error).message}`);
          console.error("File Processing Error:", err);
          onFileUpload(null as any, ''); // Signal error
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file.');
        setLoading(false);
        onFileUpload(null as any, ''); // Signal error
      };
      reader.readAsText(file);
    }
    if (event.target) {
        event.target.value = ''; // Reset file input
    }
  }, [onFileUpload, setLoading, setError, disabled]);

  return (
    <div className={`flex items-center space-x-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <label
        htmlFor="file-upload-header"
        className={`flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-md border border-sky-700 shadow-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-sky-400 ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}
        title={currentDataSourceName ? `Change data source (currently: ${currentDataSourceName})` : "Load a chess game data file (JSON format) to visualize the network"}
      >
        <UploadIcon className="mr-1.5 h-4 w-4 text-sky-100 flex-shrink-0" />
        <span>{currentDataSourceName ? 'Change Data' : 'Load Game Data'}</span>
        <input
          id="file-upload-header"
          type="file"
          accept=".json"
          onChange={handleFileChange}
          className="sr-only"
          aria-describedby="file-upload-status"
          disabled={disabled}
        />
      </label>
      {currentDataSourceName && (
         <p id="file-upload-status" className="text-xs text-slate-300 truncate max-w-[100px] sm:max-w-[150px]" title={`Currently loaded: ${currentDataSourceName}`}>
          {currentDataSourceName}
        </p>
      )}
    </div>
  );
};

export default React.memo(FileUpload);
