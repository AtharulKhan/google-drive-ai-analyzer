
import React, { useState } from 'react';
import DriveAnalyzer from "@/components/DriveAnalyzer";
import PageLayout from "@/components/layout/PageLayout";
import LocalFileInput from '@/components/drive-analyzer/LocalFileInput'; // Added import
import { Button } from '@/components/ui/button';
import { Combine } from 'lucide-react'; // Assuming Combine icon is available
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnifiedContentView } from '@/components/common/UnifiedContentView';
import useAnalysisState from '@/hooks/useAnalysisState'; // Import the hook

export default function DriveAnalyzerPage() {
  const [localFiles, setLocalFiles] = useState<File[]>([]); // State for local files (from LocalFileInput)
  const [isUnifiedViewOpen, setIsUnifiedViewOpen] = useState(false);

  const {
    selectedFiles, // These are Google Drive files from useAnalysisState
    pastedText,
    urls,
  } = useAnalysisState();

  const handleLocalFilesSelected = (files: File[]) => { // Added callback
    setLocalFiles(files);
    // Note: localFiles state is separate from useAnalysisState().selectedFiles
    // If local files should also be in useAnalysisState().selectedFiles, that's a different integration.
  };

  const getCombinedContent = (): string => {
    let combined = "";

    if (pastedText) {
      combined += "--- Pasted Text ---\n";
      combined += pastedText + "\n\n";
    }

    if (urls.length > 0) {
      combined += "--- URLs ---\n";
      urls.forEach(url => {
        combined += `URL: ${url}\n[Scraped content for ${url} will appear here]\n\n`;
      });
    }

    // Handling Google Drive files from useAnalysisState
    if (selectedFiles.length > 0) {
      combined += "--- Google Drive Files ---\n";
      selectedFiles.forEach(file => {
        combined += `Google Drive File: ${file.name} (ID: ${file.id})\n`;
        combined += `[Content of ${file.name} will be processed]\n\n`;
      });
    }
    
    // Handling Local files from DriveAnalyzerPage's own state
    if (localFiles.length > 0) {
      combined += "--- Local Files ---\n";
      localFiles.forEach(file => {
        combined += `Local File: ${file.name}\n`;
        // Actual content of local files is not read here.
        // If available, it could be included. For now, placeholder.
        combined += `[Content of ${file.name} will be processed]\n\n`;
      });
    }

    if (!combined) {
      return "No content sources have been added yet. Add files, text, or URLs to see them here.";
    }

    return combined;
  };

  return (
    <PageLayout title="Google Drive AI Analyzer" description="Analyze Google Drive documents with AI">
      <div className="flex items-start space-x-2 mb-4"> {/* Flex container for inputs and button */}
        <LocalFileInput onFilesSelected={handleLocalFilesSelected} className="flex-grow" />
        <Dialog open={isUnifiedViewOpen} onOpenChange={setIsUnifiedViewOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Combine className="mr-2 h-4 w-4" />
              Unified View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl h-[70vh]">
            <DialogHeader>
              <DialogTitle>Unified Content View</DialogTitle>
            </DialogHeader>
            <UnifiedContentView
              initialContent={getCombinedContent()}
              isEditable={false}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DriveAnalyzer localFiles={localFiles} /> {/* Pass localFiles to DriveAnalyzer */}
    </PageLayout>
  );
}
