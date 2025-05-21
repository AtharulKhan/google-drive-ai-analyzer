
import React from "react";
import { Progress } from "@/components/ui/progress";

interface ProcessingStatusProps {
  status: {
    isProcessing: boolean;
    currentStep: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
  };
}

export function ProcessingStatus({ status }: ProcessingStatusProps) {
  return (
    <div className="space-y-2 mb-4">
      <div className="flex justify-between">
        <span>{status.currentStep}</span>
        <span>
          {status.processedFiles} / {status.totalFiles} files
        </span>
      </div>
      <Progress value={status.progress} />
    </div>
  );
}
