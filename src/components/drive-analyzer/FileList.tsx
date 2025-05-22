
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, X, Brain } from "lucide-react"; // Added Brain for saved analyses
import { GoogleFile } from "@/hooks/useDrivePicker";
import { SavedAnalysisContentSource } from "@/hooks/useAnalysisState";

// Define a union type for the items in the sources list
export type DisplayableSource = 
  | { id: string; name: string; type: 'file'; original: GoogleFile; icon?: string; webViewLink?: string; }
  | { id: string; name: string; type: 'savedAnalysis'; original: SavedAnalysisContentSource; icon?: undefined; webViewLink?: undefined; };

interface FileListProps {
  sources: DisplayableSource[];
  onRemoveSource: (id: string, type: 'file' | 'savedAnalysis') => void;
  onClearAllSources: () => void; 
}

export function FileList({
  sources,
  onRemoveSource,
  onClearAllSources 
}: FileListProps) {
  // The parent component DriveAnalyzer.tsx will now handle the "Clear All Sources" button
  // and pass the onClearAllSources (which is handleClearFiles from useAnalysisState)
  
  return (
    <div>
      {/* Selected Sources List */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Selected Sources</h3>
          <Badge
            variant={sources.length > 0 ? "default" : "outline"}
          >
            {sources.length} source(s)
          </Badge>
        </div>

        {sources.length > 0 ? (
          <ScrollArea className="h-48 border rounded-md p-2">
            <ul className="space-y-1">
              {sources.map((source) => (
                <li
                  key={source.id + '-' + source.type} // Ensure unique key if IDs could overlap (though unlikely here)
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                >
                  {source.type === 'file' && source.icon && (
                    <img src={source.icon} alt="file icon" className="h-4 w-4 shrink-0" />
                  )}
                  {source.type === 'file' && !source.icon && (
                    <FileText className="h-4 w-4 shrink-0" />
                  )}
                  {source.type === 'savedAnalysis' && (
                    <Brain className="h-4 w-4 shrink-0 text-blue-500" /> // Icon for saved analysis
                  )}
                  <span className="truncate flex-1">
                    {source.type === 'file' && source.webViewLink ? (
                      <a href={source.webViewLink} target="_blank" rel="noopener noreferrer" className="hover:underline" title={source.name}>
                        {source.name}
                      </a>
                    ) : (
                      <span title={source.name}>{source.name}</span>
                    )}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-xs ml-2 shrink-0"
                  >
                    {source.type === 'file' ? (source.original as GoogleFile).mimeType.split(".").pop() : 'Analysis'}
                  </Badge>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                    onClick={() => onRemoveSource(source.id, source.type)}
                    title={`Remove ${source.name}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </li>
              ))}
              {/* Display of "X more sources" can be added if needed, similar to previous "more files" */}
            </ul>
          </ScrollArea>
        ) : (
          <div className="h-48 border rounded-md flex items-center justify-center text-muted-foreground">
            No sources selected. Use the buttons to add files or select saved analyses.
          </div>
        )}
      </div>
    </div>
  );
}
