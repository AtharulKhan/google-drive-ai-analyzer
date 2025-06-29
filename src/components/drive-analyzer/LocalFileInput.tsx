import React, { useCallback } from 'react';
import { Button } from '@/components/ui/button'; // Assuming this path is correct

interface LocalFileInputProps {
  onFilesSelected: (files: File[]) => void;
  className?: string;
}

const LocalFileInput: React.FC<LocalFileInputProps> = ({ onFilesSelected, className }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files) {
        onFilesSelected(Array.from(files));
      }
    },
    [onFilesSelected]
  );

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className={className}>
      <input
        data-testid="local-file-input" // Added data-testid for testing
        type="file"
        multiple
        ref={fileInputRef}
        onChange={handleFileChange}
        style={{ display: 'none' }} // Hide the default input
      />
      <Button onClick={handleClick} variant="outline">
        Select Files
      </Button>
    </div>
  );
};

export default LocalFileInput;
