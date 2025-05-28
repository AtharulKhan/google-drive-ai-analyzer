
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, X, History } from "lucide-react";
import { GoogleFile } from "@/hooks/useDrivePicker";
import { SavedAnalysis } from "@/hooks/useAnalysisState";

interface FileListProps {
  googleFiles?: GoogleFile[];      // Renamed from selectedFiles, made optional
  localFiles?: File[];             // Added for local files
  displayFiles?: GoogleFile[];     // This prop might need re-evaluation. Is it only for Google Files pagination?
                                   // For now, assuming it's for Google Files. Local files are typically fewer.
  onRemoveGoogleFile?: (fileId: string) => void; // Renamed
  onClearGoogleFiles?: () => void;               // Renamed
  // TODO: Add onRemoveLocalFile and onClearLocalFiles if needed in the future
  // onRemoveLocalFile?: (fileName: string) => void;
  // onClearLocalFiles?: () => void;

  selectedAnalysisIdsForPrompt?: string[];
  savedAnalyses?: SavedAnalysis[];
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
  googleFiles = [],    // Default to empty array
  localFiles = [],     // Default to empty array
  displayFiles = [],   // Default to empty array (primarily for Google Files)
  onRemoveGoogleFile,
  onClearGoogleFiles,
  selectedAnalysisIdsForPrompt = [],
  savedAnalyses = []
}: FileListProps) {
  const selectedAnalyses = savedAnalyses.filter(analysis => 
    selectedAnalysisIdsForPrompt.includes(analysis.id)
  );

  const totalFilesCount = googleFiles.length + localFiles.length;
  // displayGoogleFiles will be 'displayFiles' if provided and populated, otherwise all googleFiles.
  // This handles the "X more files" scenario for Google Drive files.
  const displayGoogleFiles = displayFiles.length > 0 ? displayFiles : googleFiles;


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
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                >
                  <FileText className="h-4 w-4 shrink-0 text-blue-500" />
                  <span className="truncate flex-1">{file.name}</span>
                  <Badge variant="outline" className="text-xs ml-2 shrink-0">
                    {file.mimeType.split("/").pop()?.split(".").pop() || "gdrive"}
                  </Badge>
                  {onRemoveGoogleFile && (
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
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
              {localFiles.map((file) => (
                <li
                  key={`local-${file.name}-${file.lastModified}`} // Using name and lastModified for a more unique key
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                >
                  <FileText className="h-4 w-4 shrink-0 text-green-500" />
                  <span className="truncate flex-1">{file.name}</span>
                  <Badge variant="outline" className="text-xs ml-1 shrink-0">
                    {file.type.split("/").pop() || "local"}
                  </Badge>
                  <Badge variant="outline" className="text-xs ml-1 shrink-0">
                    {formatFileSize(file.size)}
                  </Badge>
                  {/* Placeholder for remove button if onRemoveLocalFile is implemented */}
                  {/* <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0">
                       <X className="h-4 w-4" />
                     </Button> */}
                </li>
              ))}
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
