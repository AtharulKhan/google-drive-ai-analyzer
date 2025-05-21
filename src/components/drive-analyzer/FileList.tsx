
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { FileText, X, FolderIcon } from "lucide-react";
import { GoogleFile } from "@/hooks/useDrivePicker";

interface FileListProps {
  selectedFiles: GoogleFile[];
  displayFiles: GoogleFile[];
  onRemoveFile: (fileId: string) => void;
  onClearFiles: () => void;
}

export function FileList({
  selectedFiles,
  displayFiles,
  onRemoveFile,
  onClearFiles
}: FileListProps) {
  // Helper function to get icon for file type
  const getFileIcon = (mimeType: string) => {
    if (mimeType === "application/vnd.google-apps.folder") {
      return <FolderIcon className="h-4 w-4 shrink-0" />;
    }
    return <FileText className="h-4 w-4 shrink-0" />;
  };

  // Helper function to get display name for file type
  const getFileTypeDisplay = (mimeType: string) => {
    switch (mimeType) {
      case "application/vnd.google-apps.document":
        return "Doc";
      case "application/vnd.google-apps.spreadsheet":
        return "Sheet";
      case "application/vnd.google-apps.presentation":
        return "Slides";
      case "application/pdf":
        return "PDF";
      case "application/vnd.google-apps.folder":
        return "Folder";
      default:
        return mimeType.split(".").pop() || "File";
    }
  };

  return (
    <div>
      {/* Selected Files List */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-medium">Selected Files</h3>
          <Badge
            variant={selectedFiles.length > 0 ? "default" : "outline"}
          >
            {selectedFiles.length} file(s)
          </Badge>
        </div>

        {selectedFiles.length > 0 ? (
          <ScrollArea className="h-48 border rounded-md p-2">
            <ul className="space-y-1">
              {displayFiles.map((file) => (
                <li
                  key={file.id}
                  className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                >
                  {getFileIcon(file.mimeType)}
                  <span className="truncate flex-1">{file.name}</span>
                  <Badge
                    variant="outline"
                    className="text-xs ml-2 shrink-0"
                  >
                    {getFileTypeDisplay(file.mimeType)}
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
          </ScrollArea>
        ) : (
          <div className="h-48 border rounded-md flex items-center justify-center text-muted-foreground">
            No files selected. Use the buttons above to select files
            or a folder.
          </div>
        )}
      </div>
    </div>
  );
}
