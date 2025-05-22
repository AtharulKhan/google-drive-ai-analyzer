
import React from 'react';
import { SavedAnalysis } from '@/components/DriveAnalyzer';
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Copy, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { downloadAsPdf } from "@/utils/pdf-generator";

interface MarkdownProps {
  content: string; 
}

// Simple Markdown component that renders line breaks
function Markdown({ content }: MarkdownProps) {
  return (
    <div className="prose dark:prose-invert max-w-none p-4">
      {content.split('\n').map((line, i) => (
        <React.Fragment key={i}>
          {line}
          <br />
        </React.Fragment>
      ))}
    </div>
  );
}

interface SavedAnalysisDetailViewProps {
  analysis: SavedAnalysis;
}

export function SavedAnalysisDetailView({ analysis }: SavedAnalysisDetailViewProps) {
  const handleCopyContent = (content: string, type: string) => {
    navigator.clipboard.writeText(content);
    toast.success(`${type} copied to clipboard`);
  };

  const handleDownloadPdf = async () => {
    try {
      toast.info("Preparing PDF download...");
      await downloadAsPdf(analysis.aiOutput, `analysis-${analysis.id}`);
      toast.success("PDF downloaded successfully");
    } catch (error) {
      console.error("PDF download error:", error);
      toast.error(`Failed to download PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  return (
    <Card className="w-full">
      <CardContent className="p-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <h3 className="text-lg font-medium mr-2">Created:</h3>
          <span className="text-muted-foreground">
            {new Date(analysis.timestamp).toLocaleString()}
          </span>
        </div>
        
        <div className="mb-4">
          <h3 className="text-lg font-medium mb-2">Sources:</h3>
          <div className="flex flex-wrap gap-2">
            {analysis.sources.map((source, index) => (
              <Badge key={index} variant="outline" className="flex items-center gap-1">
                {source.type === 'file' && "📄"}
                {source.type === 'url' && "🌐"}
                {source.type === 'text' && "📝"}
                {source.name}
              </Badge>
            ))}
          </div>
        </div>
        
        <Tabs defaultValue="output" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="output">AI Output</TabsTrigger>
            <TabsTrigger value="prompt">Prompt</TabsTrigger>
          </TabsList>
          
          <TabsContent value="output">
            <div className="relative">
              <div className="absolute top-2 right-2 z-10 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleCopyContent(analysis.aiOutput, "Output")}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                  <Download className="h-4 w-4 mr-1" />
                  PDF
                </Button>
              </div>
              <ScrollArea className="border rounded-md h-[400px] mt-2">
                <Markdown content={analysis.aiOutput} />
              </ScrollArea>
            </div>
          </TabsContent>
          
          <TabsContent value="prompt">
            <div className="relative">
              <div className="absolute top-2 right-2 z-10">
                <Button size="sm" variant="outline" onClick={() => handleCopyContent(analysis.prompt, "Prompt")}>
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
              </div>
              <ScrollArea className="border rounded-md h-[400px] mt-2">
                <div className="p-4 whitespace-pre-wrap">
                  {analysis.prompt}
                </div>
              </ScrollArea>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
