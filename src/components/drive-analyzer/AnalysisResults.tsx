
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, FileText, Download } from "lucide-react";
import { toast } from "sonner";
import { ProcessingStatus } from "./ProcessingStatus";
import { SavedAnalysis } from "@/hooks/useAnalysisState";
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
  currentAnalysisResult: SavedAnalysis | null;
}

function downloadJson(data: object, filename: string) {
  const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
    JSON.stringify(data, null, 2)
  )}`;
  const link = document.createElement("a");
  link.href = jsonString;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
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
        <div className="animate-fade-in">
          <ProcessingStatus status={processingStatus} />
        </div>
      )}

      {aiOutput ? (
        <div className="relative animate-slide-up">
          <div className="absolute top-4 right-4 z-10 flex gap-2 animate-stagger">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(aiOutput);
                toast.success("Results copied to clipboard");
              }}
              className="text-xs md:text-sm shadow-md hover:shadow-lg transition-all duration-300"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewMarkdown}
              className="text-xs md:text-sm shadow-md hover:shadow-lg transition-all duration-300"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Markdown
            </Button>
            {currentAnalysisResult && !processingStatus.isProcessing && aiOutput && (
              <Button
                size="sm"
                variant="success"
                onClick={() => {
                  if (currentAnalysisResult) {
                    const titleForFile = currentAnalysisResult.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                    downloadJson(currentAnalysisResult, `analysis-${titleForFile || currentAnalysisResult.id}.json`);
                    toast.success("Downloaded analysis as JSON");
                  }
                }}
                className="text-xs md:text-sm shadow-md hover:shadow-lg transition-all duration-300"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Export
              </Button>
            )}
          </div>
          
          <div className="modern-card overflow-hidden">
            <div className="bg-gradient-to-r from-blue-50/50 to-purple-50/30 p-4 border-b border-blue-200/30">
              <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                Analysis Complete
              </h4>
            </div>
            <ScrollArea className="h-[450px] md:h-[500px] p-4 custom-scrollbar">
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap pt-12 px-2">
                {aiOutput.split("\n").map((line, i) => (
                  <React.Fragment key={i}>
                    {line}
                    <br />
                  </React.Fragment>
                ))}
              </div>
            </ScrollArea>
          </div>
        </div>
      ) : (
        <div className="modern-card">
          <div className="h-[400px] md:h-[500px] flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-3xl flex items-center justify-center">
              <svg className="w-12 h-12 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-gray-700">Ready for Analysis</h3>
              <p className="text-sm">
                {processingStatus.isProcessing
                  ? "Processing your content..."
                  : "Select files, add text, or URLs to begin AI analysis"}
              </p>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isMarkdownDialogOpen} onOpenChange={setIsMarkdownDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col modern-card">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Markdown Viewer</span>
              <Button variant="outline" onClick={toggleEditMode} className="text-sm">
                {isEditing ? "Preview" : "Edit"}
              </Button>
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <Textarea 
                className="h-full w-full resize-none p-4 font-mono form-input-modern" 
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
              />
            ) : (
              <ScrollArea className="h-full p-4 modern-card custom-scrollbar">
                <Markdown content={markdownContent} className="p-4" />
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
