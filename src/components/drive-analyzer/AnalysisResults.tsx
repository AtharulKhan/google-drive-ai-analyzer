
import React, { useState } from "react";
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
  const [isPdfGenerating, setIsPdfGenerating] = useState(false);
  
  const handleDownloadPdf = async () => {
    try {
      setIsPdfGenerating(true);
      toast.info("Preparing PDF download. This may take a moment...");
      
      await downloadAsPdf(aiOutput, "drive-analysis-result");
      
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPdfGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {processingStatus.isProcessing && (
        <ProcessingStatus status={processingStatus} />
      )}

      {aiOutput ? (
        <div className="relative">
          <div className="absolute top-2 right-2 z-10 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(aiOutput);
                toast.success("Results copied to clipboard");
              }}
              className="text-xs md:text-sm"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadPdf}
              disabled={isPdfGenerating}
              className="text-xs md:text-sm"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              {isPdfGenerating ? "Generating..." : "PDF"}
            </Button>
          </div>
          <ScrollArea className="border rounded-md p-2 md:p-4 h-[450px] md:h-[500px]">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap px-2 pt-10 md:pt-8 md:px-4">
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
        <div className="h-[400px] md:h-[500px] border rounded-md flex items-center justify-center text-muted-foreground p-4 text-center">
          {processingStatus.isProcessing
            ? "Processing... Please wait."
            : "No analysis results yet. Select files and run analysis."}
        </div>
      )}
    </div>
  );
}
