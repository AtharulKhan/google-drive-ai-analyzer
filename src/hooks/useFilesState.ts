
import { useState, useCallback, useEffect } from 'react';
import { GoogleFile } from '@/hooks/useDrivePicker';

export default function useFilesState() {
  // Files state
  const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([]);
  const [displayFiles, setDisplayFiles] = useState<GoogleFile[]>([]);
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  
  // When selected files change, update display files
  useEffect(() => {
    setDisplayFiles(selectedFiles.slice(0, 100)); // Limit display to first 100 files
  }, [selectedFiles]);
  
  // Handle file operations
  const handleAddFiles = useCallback((newFiles: GoogleFile[]) => {
    setSelectedFiles(prev => {
      // Merge new files with existing ones, avoiding duplicates by file ID
      const existingFileIds = new Set(prev.map(file => file.id));
      const filesToAdd = newFiles.filter(file => !existingFileIds.has(file.id));
      
      return [...prev, ...filesToAdd];
    });
  }, []);
  
  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);
  
  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    setDisplayFiles([]);
  }, []);

  // Handle local file operations
  const handleAddLocalFiles = useCallback((newFiles: File[]) => {
    setLocalFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleRemoveLocalFile = useCallback((fileKey: string) => {
    setLocalFiles(prev => prev.filter(file => `${file.name}-${file.lastModified}` !== fileKey));
  }, []);

  const handleClearLocalFiles = useCallback(() => {
    setLocalFiles([]);
  }, []);

  return {
    selectedFiles,
    setSelectedFiles,
    displayFiles,
    handleAddFiles,
    handleRemoveFile,
    handleClearFiles,
    localFiles,
    setLocalFiles,
    handleAddLocalFiles,
    handleRemoveLocalFile,
    handleClearLocalFiles,
  };
}
