
import React, { ChangeEvent, useCallback } from 'react';
import { validateSchema } from '../../utils/schemaValidator';
import { RawChessData } from '../../types';

interface FileUploadProps {
  onFileUpload: (data: RawChessData) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  disabled?: boolean;
}

const UploadIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={`w-5 h-5 ${className || ''}`} viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
  </svg>
);


const FileUpload: React.FC<FileUploadProps> = ({ onFileUpload, setLoading, setError, disabled }) => {
  const [fileName, setFileName] = React.useState<string | null>(null);

  const handleFileChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    if (disabled) return;
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setLoading(true);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          const validationResult = validateSchema(text);
          if (validationResult.isValid && validationResult.data) {
            onFileUpload(validationResult.data);
          } else {
            setError(validationResult.error || 'Unknown validation error.');
            console.error("Validation Error:", validationResult.error);
            setFileName(null); 
          }
        } catch (err) {
          setError(`Error processing file: ${(err as Error).message}`);
          console.error("File Processing Error:", err);
          setFileName(null); 
        } finally {
          setLoading(false);
        }
      };
      reader.onerror = () => {
        setError('Failed to read file.');
        setLoading(false);
        setFileName(null); 
      };
      reader.readAsText(file);
    } else {
      setFileName(null);
    }
    if (event.target) {
        event.target.value = '';
    }
  }, [onFileUpload, setLoading, setError, disabled]);

  return (
    <div className={`flex items-center space-x-2 ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}>
      <label
        htmlFor="file-upload-header"
        className={`flex items-center px-3 py-1.5 text-xs sm:text-sm font-medium text-white bg-sky-500 hover:bg-sky-600 rounded-md border border-sky-700 shadow-sm transition-colors duration-150 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-sky-400 ${disabled ? 'pointer-events-none' : 'cursor-pointer'}`}
        title={fileName ? "Change the loaded chess game data file (JSON format)" : "Load a chess game data file (JSON format) to visualize the network"}
      >
        <UploadIcon className="mr-1.5 h-4 w-4 text-sky-100 flex-shrink-0" />
        <span>{fileName ? 'Change Data' : 'Load Game Data'}</span>
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
      {fileName && (
         <p id="file-upload-status" className="text-xs text-slate-300 truncate max-w-[100px] sm:max-w-[150px]" title={`Currently loaded file: ${fileName}`}>
          {fileName}
        </p>
      )}
    </div>
  );
};

export default React.memo(FileUpload);
