
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, X, History } from "lucide-react";
import { GoogleFile } from "@/hooks/useDrivePicker";
import { SavedAnalysis } from "@/hooks/useAnalysisState";

interface FileListProps {
  selectedFiles: GoogleFile[];
  displayFiles: GoogleFile[];
  onRemoveFile: (fileId: string) => void;
  onClearFiles: () => void;
  selectedAnalysisIdsForPrompt?: string[];
  savedAnalyses?: SavedAnalysis[];
}

export function FileList({
  selectedFiles,
  displayFiles,
  onRemoveFile,
  onClearFiles,
  selectedAnalysisIdsForPrompt = [],
  savedAnalyses = []
}: FileListProps) {
  // Filter saved analyses that are selected for inclusion in the prompt
  const selectedAnalyses = savedAnalyses.filter(analysis => 
    selectedAnalysisIdsForPrompt.includes(analysis.id)
  );

  return (
    <div>
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        {/* File action buttons are in the parent component */}
      </div>

      {/* Selected Files List */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Selected Files</h3>
          <div className="flex gap-2">
            {selectedAnalyses.length > 0 && (
              <Badge variant="secondary">
                {selectedAnalyses.length} analysis/analyses
              </Badge>
            )}
            <Badge
              variant={selectedFiles.length > 0 ? "default" : "outline"}
            >
              {selectedFiles.length} file(s)
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
                    <Badge
                      variant="outline"
                      className="text-xs ml-2 shrink-0"
                    >
                      Analysis
                    </Badge>
                  </li>
                ))}
              </ul>
              {selectedAnalyses.length > 0 && selectedFiles.length > 0 && (
                <div className="border-t my-2"></div>
              )}
            </div>
          )}

          {selectedFiles.length > 0 ? (
            <ul className="space-y-1">
              {displayFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                >
                  <FileText className="h-4 w-4 shrink-0" />
                  <span className="truncate flex-1">{file.name}</span>
                  <Badge
                    variant="outline"
                    className="text-xs ml-2 shrink-0"
                  >
                    {file.mimeType.split(".").pop()}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                    onClick={() => onRemoveFile(file.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {selectedFiles.length > displayFiles.length && (
                <li className="text-center text-sm text-muted-foreground pt-2">
                  + {selectedFiles.length - displayFiles.length} more
                  files
                </li>
              )}
            </ul>
          ) : selectedAnalyses.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-muted-foreground">
              No files selected. Use the buttons above to select files
              or a folder.
            </div>
          ) : null}
          
          {selectedFiles.length === 0 && selectedAnalyses.length > 0 && (
            <div className="border-t mt-2 pt-2">
              <div className="text-sm text-muted-foreground">
                Selected analyses will be used as context for AI processing. You can still add files or other sources.
              </div>
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
