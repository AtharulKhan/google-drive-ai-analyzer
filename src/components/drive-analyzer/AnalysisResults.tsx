
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy } from "lucide-react";
import { toast } from "sonner";
import { ProcessingStatus } from "./ProcessingStatus";

interface AnalysisResultsProps {
  processingStatus: {
    isProcessing: boolean;
    currentStep: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
  };
  aiOutput: string;
}

export function AnalysisResults({ processingStatus, aiOutput }: AnalysisResultsProps) {
  return (
    <div className="space-y-4">
      {processingStatus.isProcessing && (
        <ProcessingStatus status={processingStatus} />
      )}

      {aiOutput ? (
        <div className="relative">
          <Button
            className="absolute top-2 right-2 z-10"
            size="sm"
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(aiOutput);
              toast.success("Results copied to clipboard");
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy
          </Button>
          <ScrollArea className="border rounded-md p-4 h-[500px]">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
              {aiOutput.split("\n").map((line, i) => (
                <React.Fragment key={i}>
                  {line}
                  <br />
                </React.Fragment>
              ))}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="h-[500px] border rounded-md flex items-center justify-center text-muted-foreground">
          {processingStatus.isProcessing
            ? "Processing... Please wait."
            : "No analysis results yet. Select files and run analysis."}
        </div>
      )}
    </div>
  );
}
