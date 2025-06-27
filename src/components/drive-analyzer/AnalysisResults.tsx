
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
        <div className="relative animate-fade-in">
          <div className="absolute top-3 right-3 z-10 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(aiOutput);
                toast.success("Results copied to clipboard");
              }}
              className="text-xs md:text-sm bg-white/90 backdrop-blur-sm hover:bg-blue-50 border-blue-200 hover:border-blue-300 shadow-md hover:shadow-lg"
            >
              <Copy className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              Copy
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleViewMarkdown}
              className="text-xs md:text-sm bg-white/90 backdrop-blur-sm hover:bg-green-50 border-green-200 hover:border-green-300 shadow-md hover:shadow-lg"
            >
              <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
              View Markdown
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
                className="text-xs md:text-sm bg-white/90 backdrop-blur-sm hover:bg-purple-50 border-purple-200 hover:border-purple-300 shadow-md hover:shadow-lg"
              >
                <Download className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                Download JSON
              </Button>
            )}
          </div>
          <div className="bg-gradient-to-br from-white/80 to-slate-50/60 backdrop-blur-sm border border-white/20 rounded-xl shadow-xl">
            <ScrollArea className="p-2 md:p-4 h-[450px] md:h-[500px]">
              <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap px-2 pt-12 md:pt-10 md:px-4 text-slate-700">
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
        <div className="h-[400px] md:h-[500px] bg-gradient-to-br from-slate-50/80 to-blue-50/40 backdrop-blur-sm border border-slate-200/50 rounded-xl flex items-center justify-center text-slate-500 p-4 text-center shadow-inner">
          <div className="text-center space-y-3">
            <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-4">
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
            <p className="text-lg font-medium">
              {processingStatus.isProcessing
                ? "Processing your analysis..."
                : "Ready for analysis"}
            </p>
            <p className="text-sm text-slate-400">
              {processingStatus.isProcessing
                ? "Please wait while we process your files."
                : "Select files and run analysis to see results here."}
            </p>
          </div>
        </div>
      )}

      <Dialog open={isMarkdownDialogOpen} onOpenChange={setIsMarkdownDialogOpen}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col backdrop-blur-sm bg-white/95 border-white/20">
          <DialogHeader>
            <DialogTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Markdown Viewer
            </DialogTitle>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={toggleEditMode}
                className="hover:scale-105 transition-all duration-300"
              >
                {isEditing ? "Preview" : "Edit"}
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden">
            {isEditing ? (
              <Textarea 
                className="h-full w-full resize-none p-4 font-mono bg-slate-50/50 border-slate-200 focus:border-blue-300 transition-colors duration-300" 
                value={markdownContent}
                onChange={(e) => setMarkdownContent(e.target.value)}
              />
            ) : (
              <ScrollArea className="h-full p-4 bg-gradient-to-br from-white/80 to-slate-50/60 backdrop-blur-sm border border-white/20 rounded-md">
                <Markdown content={markdownContent} className="p-4" />
              </ScrollArea>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
