import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, FileText, Download, RefreshCw } from "lucide-react"; // Added Download and RefreshCw icons
import { toast } from "sonner";
import { ProcessingStatus } from "./ProcessingStatus";
import { SavedAnalysis } from "@/hooks/useAnalysisState"; // Import SavedAnalysis type
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Markdown } from "@/components/ui/markdown";

interface AnalysisResultsProps {
  processingStatus: {
    isProcessing: boolean;
    currentStep: string;
    progress: number;
    totalFiles: number;
    processedFiles: number;
  };
  aiOutput: string;
  currentAnalysisResult: SavedAnalysis | null; // Added prop for current analysis result
}

// Helper function to trigger download
function downloadJson(data: object, filename: string) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = filename;
  document.body.appendChild(link); // Required for Firefox
  link.click();
  document.body.removeChild(link); // Clean up
}

export function AnalysisResults({ processingStatus, aiOutput, currentAnalysisResult }: AnalysisResultsProps) {
  const [isMarkdownDialogOpen, setIsMarkdownDialogOpen] = useState(false);
  const [markdownContent, setMarkdownContent] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  
  const handleViewMarkdown = () => {
    setMarkdownContent(aiOutput);
    setIsMarkdownDialogOpen(true);
    setIsEditing(false);
  };

  const toggleEditMode = () => {
    setIsEditing(!isEditing);
  };

  return (
    <div className="space-y-6">
      {processingStatus.isProcessing && (
        <div className="animate-slide-in-up">
          <ProcessingStatus status={processingStatus} />
        </div>
      )}

      {aiOutput ? (
        <div className="relative animate-expand-fade-in">
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(aiOutput);
                toast.success("Results copied to clipboard");
              }}
              className="text-xs md:text-sm backdrop-soft hover:shadow-glow"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewMarkdown}
              className="text-xs md:text-sm backdrop-soft hover:shadow-glow"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              View
            </Button>
            {currentAnalysisResult && !processingStatus.isProcessing && aiOutput && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  if (currentAnalysisResult) {
                    const titleForFile = currentAnalysisResult.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    downloadJson(currentAnalysisResult, `analysis-${titleForFile || currentAnalysisResult.id}.json`);
                    toast.success("Downloaded analysis as JSON");
                  }
                }}
                className="text-xs md:text-sm backdrop-soft hover:shadow-glow"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                JSON
              </Button>
            )}
          </div>
          <ScrollArea className="gradient-card border rounded-xl p-2 md:p-4 h-[450px] md:h-[500px] custom-scrollbar">
            <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap px-2 pt-12 md:pt-10 md:px-4">
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
        <div className="h-[400px] md:h-[500px] gradient-card border rounded-xl flex items-center justify-center text-muted-foreground p-4 text-center">
          <div className="space-y-3">
            <div className="floating-animation">
              <div className="w-16 h-16 rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 flex items-center justify-center mx-auto">
                <RefreshCw className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <p className="gradient-text font-medium">
              {processingStatus.isProcessing
                ? "Processing... Please wait."
                : "No analysis results yet. Select files and run analysis."}
            </p>
          </div>
        </div>
      )}

      <Dialog open={isMarkdownDialogOpen} onOpenChange={setIsMarkdownDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col gradient-card">
          <DialogHeader>
            <DialogTitle>Markdown Viewer</DialogTitle>
            <div className="flex justify-end">
              <Button variant="outline" onClick={toggleEditMode}>
                {isEditing ? "Preview" : "Edit"}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <Textarea 
                className="h-full w-full resize-none p-4 font-mono" 
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
              />
            ) : (
              <ScrollArea className="h-full p-4 border rounded-md">
                <Markdown content={markdownContent} className="p-4" />
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
