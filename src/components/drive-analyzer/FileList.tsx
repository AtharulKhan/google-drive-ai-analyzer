import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { FileText, X, History, Save, Trash2 } from "lucide-react";
import { GoogleFile } from "@/hooks/useDrivePicker";
import { SavedAnalysis } from "@/hooks/useAnalysisState";
import { saveDocumentToCache } from "@/utils/local-cache";
import { fetchFileContent } from "@/utils/google-api";
import { toast } from "sonner";

interface FileListProps {
  googleFiles?: GoogleFile[];
  localFiles?: File[];
  displayFiles?: GoogleFile[];
  onRemoveGoogleFile?: (fileId: string) => void;
  onRemoveLocalFile?: (fileKey: string) => void; // Add handler for local files
  onClearGoogleFiles?: () => void;
  selectedAnalysisIdsForPrompt?: string[];
  savedAnalyses?: SavedAnalysis[];
  accessToken?: string | null;
}

// Helper to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function FileList({
  googleFiles = [],
  localFiles = [],
  displayFiles = [],
  onRemoveGoogleFile,
  onRemoveLocalFile, // Add to props
  onClearGoogleFiles,
  selectedAnalysisIdsForPrompt = [],
  savedAnalyses = [],
  accessToken = null
}: FileListProps) {
  const [selectedGoogleFiles, setSelectedGoogleFiles] = useState<Set<string>>(new Set());
  const [selectedLocalFiles, setSelectedLocalFiles] = useState<Set<string>>(new Set());

  const selectedAnalyses = savedAnalyses.filter(analysis => 
    selectedAnalysisIdsForPrompt.includes(analysis.id)
  );

  const totalFilesCount = googleFiles.length + localFiles.length;
  const displayGoogleFiles = displayFiles.length > 0 ? displayFiles : googleFiles;

  const handleSaveGoogleFile = async (file: GoogleFile) => {
    if (!accessToken) {
      toast.error("Please sign in to Google Drive to save documents");
      return;
    }

    try {
      toast.loading(`Extracting content from "${file.name}"...`);
      
      // Fetch the actual content from Google Drive
      const content = await fetchFileContent(file, accessToken);
      
      const documentId = saveDocumentToCache({
        name: file.name,
        type: 'google',
        content: content,
        mimeType: file.mimeType,
        originalId: file.id,
      });
      
      toast.success(`Document "${file.name}" saved to cache with full content`);
    } catch (error) {
      console.error('Error saving Google Drive document to cache:', error);
      toast.error(`Failed to save document "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleSaveLocalFile = async (file: File) => {
    try {
      const content = await file.text();
      const documentId = saveDocumentToCache({
        name: file.name,
        type: 'local',
        content: content.slice(0, 200000), // Limit content size
        mimeType: file.type,
        size: file.size,
      });
      
      toast.success(`Document "${file.name}" saved to cache`);
    } catch (error) {
      console.error('Error saving local file to cache:', error);
      toast.error('Failed to save document to cache');
    }
  };

  const handleGoogleFileSelection = (fileId: string, checked: boolean) => {
    setSelectedGoogleFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileId);
      } else {
        newSet.delete(fileId);
      }
      return newSet;
    });
  };

  const handleLocalFileSelection = (fileKey: string, checked: boolean) => {
    setSelectedLocalFiles(prev => {
      const newSet = new Set(prev);
      if (checked) {
        newSet.add(fileKey);
      } else {
        newSet.delete(fileKey);
      }
      return newSet;
    });
  };

  const handleSelectAllGoogleFiles = (checked: boolean) => {
    if (checked) {
      setSelectedGoogleFiles(new Set(displayGoogleFiles.map(file => file.id)));
    } else {
      setSelectedGoogleFiles(new Set());
    }
  };

  const handleSelectAllLocalFiles = (checked: boolean) => {
    if (checked) {
      setSelectedLocalFiles(new Set(localFiles.map(file => `${file.name}-${file.lastModified}`)));
    } else {
      setSelectedLocalFiles(new Set());
    }
  };

  const handleRemoveSelectedFiles = () => {
    let removedCount = 0;
    
    // Remove Google Drive files
    if (onRemoveGoogleFile && selectedGoogleFiles.size > 0) {
      selectedGoogleFiles.forEach(fileId => {
        onRemoveGoogleFile(fileId);
        removedCount++;
      });
      setSelectedGoogleFiles(new Set());
    }
    
    // Remove local files
    if (onRemoveLocalFile && selectedLocalFiles.size > 0) {
      selectedLocalFiles.forEach(fileKey => {
        onRemoveLocalFile(fileKey);
        removedCount++;
      });
      setSelectedLocalFiles(new Set());
    }
    
    // Handle case where removal handlers are not provided
    if (!onRemoveGoogleFile && selectedGoogleFiles.size > 0) {
      toast.error("Cannot remove Google Drive files: no removal handler provided");
      return;
    }
    
    if (!onRemoveLocalFile && selectedLocalFiles.size > 0) {
      toast.error("Cannot remove local files: no removal handler provided");
      return;
    }
    
    if (removedCount > 0) {
      toast.success(`Removed ${removedCount} file(s)`);
    } else {
      toast.info("No files selected for removal");
    }
  };

  const hasSelectedFiles = selectedGoogleFiles.size > 0 || selectedLocalFiles.size > 0;

  return (
    <div>
      {/* Selected Files List */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Selected Sources</h3>
          <div className="flex gap-2">
            {selectedAnalyses.length > 0 && (
              <Badge variant="secondary">
                {selectedAnalyses.length} analysis/analyses
              </Badge>
            )}
            <Badge
              variant={totalFilesCount > 0 ? "default" : "outline"}
            >
              {totalFilesCount} file(s)
            </Badge>
          </div>
        </div>

        {/* Bulk Actions */}
        {totalFilesCount > 0 && (
          <div className="flex justify-between items-center mb-2 p-2 bg-muted/30 rounded-md">
            <div className="flex items-center gap-4">
              {displayGoogleFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-google"
                    checked={selectedGoogleFiles.size === displayGoogleFiles.length && displayGoogleFiles.length > 0}
                    onCheckedChange={handleSelectAllGoogleFiles}
                  />
                  <label htmlFor="select-all-google" className="text-sm">
                    Select all Google Drive files
                  </label>
                </div>
              )}
              {localFiles.length > 0 && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-local"
                    checked={selectedLocalFiles.size === localFiles.length && localFiles.length > 0}
                    onCheckedChange={handleSelectAllLocalFiles}
                  />
                  <label htmlFor="select-all-local" className="text-sm">
                    Select all local files
                  </label>
                </div>
              )}
            </div>
            {hasSelectedFiles && (
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemoveSelectedFiles}
                className="flex items-center gap-1"
              >
                <Trash2 className="h-4 w-4" />
                Remove Selected ({selectedGoogleFiles.size + selectedLocalFiles.size})
              </Button>
            )}
          </div>
        )}

        <ScrollArea className="h-48 border rounded-md p-2">
          {selectedAnalyses.length > 0 && (
            <div className="mb-2">
              <h4 className="text-sm font-medium text-muted-foreground mb-1">Selected Saved Analyses:</h4>
              <ul className="space-y-1 mb-2">
                {selectedAnalyses.map((analysis) => (
                  <li
                    key={`analysis-${analysis.id}`}
                    className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                  >
                    <History className="h-4 w-4 shrink-0" />
                    <span className="truncate flex-1">{analysis.title}</span>
                    <Badge variant="outline" className="text-xs ml-2 shrink-0">Analysis</Badge>
                  </li>
                ))}
              </ul>
              {(selectedAnalyses.length > 0 && totalFilesCount > 0) && (
                <div className="border-t my-2"></div>
              )}
            </div>
          )}

          {totalFilesCount > 0 ? (
            <ul className="space-y-1">
              {/* Display Google Drive Files */}
              {displayGoogleFiles.map((file) => (
                <li
                  key={`gdrive-${file.id}`}
                  className={`flex items-center gap-2 p-1 hover:bg-muted/50 rounded group ${
                    selectedGoogleFiles.has(file.id) ? 'bg-muted/50' : ''
                  }`}
                >
                  <Checkbox
                    checked={selectedGoogleFiles.has(file.id)}
                    onCheckedChange={(checked) => handleGoogleFileSelection(file.id, checked as boolean)}
                  />
                  <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="truncate flex-1">{file.name}</span>
                  <Badge variant="outline" className="text-xs ml-2 shrink-0">
                    {file.mimeType.split("/").pop()?.split(".").pop() || "gdrive"}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                    onClick={() => handleSaveGoogleFile(file)}
                    title="Save to cache"
                    disabled={!accessToken}
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  {onRemoveGoogleFile && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => onRemoveGoogleFile(file.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
              {googleFiles.length > displayGoogleFiles.length && (
                <li className="text-center text-sm text-muted-foreground pt-2">
                  + {googleFiles.length - displayGoogleFiles.length} more Google Drive files
                </li>
              )}

              {/* Display Local Files */}
              {localFiles.map((file) => {
                const fileKey = `${file.name}-${file.lastModified}`;
                return (
                  <li
                    key={`local-${fileKey}`}
                    className={`flex items-center gap-2 p-1 hover:bg-muted/50 rounded group ${
                      selectedLocalFiles.has(fileKey) ? 'bg-muted/50' : ''
                    }`}
                  >
                    <Checkbox
                      checked={selectedLocalFiles.has(fileKey)}
                      onCheckedChange={(checked) => handleLocalFileSelection(fileKey, checked as boolean)}
                    />
                    <FileText className="h-4 w-4 shrink-0 text-green-500" />
                    <span className="truncate flex-1">{file.name}</span>
                    <Badge variant="outline" className="text-xs ml-1 shrink-0">
                      {file.type.split("/").pop() || "local"}
                    </Badge>
                    <Badge variant="outline" className="text-xs ml-1 shrink-0">
                      {formatFileSize(file.size)}
                    </Badge>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                      onClick={() => handleSaveLocalFile(file)}
                      title="Save to cache"
                    >
                      <Save className="h-3 w-3" />
                    </Button>
                    {onRemoveLocalFile && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                        onClick={() => onRemoveLocalFile(fileKey)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : selectedAnalyses.length === 0 ? (
            <div className="h-full flex items-center justify-center text-muted-foreground">
              No files or analyses selected.
            </div>
          ) : null}
          
          {totalFilesCount === 0 && selectedAnalyses.length > 0 && (
            <div className="border-t mt-2 pt-2">
              <div className="text-sm text-muted-foreground">
                Selected analyses will be used as context. You can add files to include them in the analysis.
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
