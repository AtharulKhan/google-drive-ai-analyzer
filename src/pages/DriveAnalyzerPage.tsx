
import React, { useState } from 'react';
import DriveAnalyzer from "@/components/DriveAnalyzer";
import PageLayout from "@/components/layout/PageLayout";
import LocalFileInput from '@/components/drive-analyzer/LocalFileInput'; // Added import

export default function DriveAnalyzerPage() {
  const [localFiles, setLocalFiles] = useState<File[]>([]); // Added state for local files

  const handleLocalFilesSelected = (files: File[]) => { // Added callback
    setLocalFiles(files);
  };

  return (
    <PageLayout title="Google Drive AI Analyzer" description="Analyze Google Drive documents with AI">
      {/* TODO: Add some margin or spacing for LocalFileInput if needed */}
      <LocalFileInput onFilesSelected={handleLocalFilesSelected} className="mb-4" />
      <DriveAnalyzer localFiles={localFiles} /> {/* Pass localFiles to DriveAnalyzer */}
    </PageLayout>
  );
}
