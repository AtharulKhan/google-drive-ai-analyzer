
import React from 'react';
import DriveAnalyzer from "@/components/DriveAnalyzer";
import PageLayout from "@/components/layout/PageLayout";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

export default function DriveAnalyzerPage() {
  return (
    <PageLayout title="Google Drive AI Analyzer" description="Analyze Google Drive documents with AI">
      <DriveAnalyzer />
      <PWAInstallPrompt />
    </PageLayout>
  );
}
