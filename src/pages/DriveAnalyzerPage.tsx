
import React, { useState } from 'react';
import DriveAnalyzer from "@/components/DriveAnalyzer";
import PageLayout from "@/components/layout/PageLayout";
import LocalFileInput from '@/components/drive-analyzer/LocalFileInput';
import { Button } from '@/components/ui/button';
import { Combine } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnifiedContentView } from '@/components/common/UnifiedContentView';
import useAnalysisState from '@/hooks/useAnalysisState';
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

export default function DriveAnalyzerPage() {
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isUnifiedViewOpen, setIsUnifiedViewOpen] = useState(false);

  const {
    selectedFiles, // Google Drive files
    pastedText,
    urls,
    userPrompt,
  } = useAnalysisState();

  const { accessToken } = useGoogleAuth();

  const handleLocalFilesSelected = (files: File[]) => {
    setLocalFiles(files);
  };

  // Load custom instructions from localStorage
  const customInstructions = React.useMemo(() => {
    return localStorage.getItem('drive-analyzer-custom-instructions') || '';
  }, [isUnifiedViewOpen]); // Re-read when dialog opens

  return (
    <PageLayout title="Google Drive AI Analyzer" description="Analyze Google Drive documents with AI">
      <div className="flex items-start space-x-2 mb-4">
        <LocalFileInput onFilesSelected={handleLocalFilesSelected} className="flex-grow" />
        <Dialog open={isUnifiedViewOpen} onOpenChange={setIsUnifiedViewOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Combine className="mr-2 h-4 w-4" />
              Unified View
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-5xl h-[80vh]">
            <DialogHeader>
              <DialogTitle>Unified Content View - All Sources</DialogTitle>
            </DialogHeader>
            <UnifiedContentView
              googleFiles={selectedFiles}
              localFiles={localFiles}
              pastedText={pastedText}
              urls={urls}
              userPrompt={userPrompt}
              customInstructions={customInstructions}
              accessToken={accessToken}
              isEditable={true}
            />
          </DialogContent>
        </Dialog>
      </div>
      <DriveAnalyzer localFiles={localFiles} />
    </PageLayout>
  );
}
