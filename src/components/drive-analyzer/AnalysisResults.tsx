
import React from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { ProcessingStatus } from "./ProcessingStatus";
import { downloadAsPdf } from "@/utils/pdf-generator";

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
  const handleDownloadPdf = async () => {
    try {
      toast.info("Preparing PDF download...");
      await downloadAsPdf(aiOutput, "drive-analysis-result");
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {processingStatus.isProcessing && (
        <ProcessingStatus status={processingStatus} />
      )}

      {aiOutput ? (
        <div className="relative">
          <div className="absolute top-1 sm:top-2 right-1 sm:right-2 z-10 flex gap-1 sm:gap-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 h-7 sm:h-auto sm:py-2 sm:text-sm"
              onClick={() => {
                navigator.clipboard.writeText(aiOutput);
                toast.success("Results copied to clipboard");
              }}
            >
              <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 h-7 sm:h-auto sm:py-2 sm:text-sm"
              onClick={handleDownloadPdf}
            >
              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              PDF
            </Button>
          </div>
          <ScrollArea className="border rounded-md p-2 sm:p-4 h-[400px] sm:h-[500px] mt-10 sm:mt-0">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap pt-6 sm:pt-0">
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
        <div className="h-[400px] sm:h-[500px] border rounded-md flex items-center justify-center text-muted-foreground px-4 text-center">
          {processingStatus.isProcessing
            ? "Processing... Please wait."
            : "No analysis results yet. Select files, paste text, or add URLs and run analysis."}
        </div>
      )}
    </div>
  );
}
