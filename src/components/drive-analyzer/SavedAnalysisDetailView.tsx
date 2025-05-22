
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Markdown } from '@/components/ui/markdown'; // Using the existing Markdown component
import { toast } from 'sonner';
import { Copy } from 'lucide-react';

// Conceptual - for prop definition, will be moved to a shared types file later
export interface SavedAnalysisSource {
  type: 'file' | 'url' | 'text' | 'savedAnalysis'; // Added 'savedAnalysis'
  name: string;
}
export interface SavedAnalysis {
  id: string;
  title: string;
  timestamp: number;
  prompt: string;
  aiOutput: string;
  sources: SavedAnalysisSource[];
}

interface SavedAnalysisDetailViewProps {
  analysis: SavedAnalysis | null;
}

export function SavedAnalysisDetailView({ analysis }: SavedAnalysisDetailViewProps) {
  if (!analysis) {
    return null;
  }

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(analysis.aiOutput)
      .then(() => toast.success("AI output copied to clipboard!"))
      .catch(err => {
        console.error("Failed to copy output: ", err);
        toast.error("Failed to copy output. Please try again.");
      });
  };

  return (
    <div className="space-y-4 pt-2 pb-4 pr-1"> {/* Adjusted padding for dialog content */}
      <h3 className="text-xl font-semibold tracking-tight">{analysis.title}</h3>
      
      <div className="text-xs text-muted-foreground">
        Saved on: {new Date(analysis.timestamp).toLocaleString()}
      </div>
      
      <div>
        <Label className="text-sm font-medium">Sources:</Label>
        <div className="flex flex-wrap gap-1 mt-1.5">
          {analysis.sources.length > 0 ? (
            analysis.sources.map((source, index) => (
              <Badge key={index} variant="secondary" className="text-xs">
                {source.type === 'text' ? 'Pasted Text' : source.name}
              </Badge>
            ))
          ) : (
            <p className="text-xs text-muted-foreground">No sources recorded.</p>
          )}
        </div>
      </div>

      <Separator />

      <div>
        <Label htmlFor={`promptDetail-${analysis.id}`} className="text-sm font-medium">Original Prompt:</Label>
        <ScrollArea className="h-36 mt-1.5 rounded-md border bg-muted/30 p-3">
          <pre id={`promptDetail-${analysis.id}`} className="text-sm whitespace-pre-wrap font-sans">
            {analysis.prompt}
          </pre>
        </ScrollArea>
      </div>
      
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <Label htmlFor={`aiOutputDetail-${analysis.id}`} className="text-sm font-medium">AI Output:</Label>
          <Button variant="ghost" size="sm" onClick={handleCopyOutput}>
            <Copy className="mr-1.5 h-3.5 w-3.5" />
            Copy Output
          </Button>
        </div>
        <ScrollArea className="h-72 mt-1 rounded-md border p-3">
          <div id={`aiOutputDetail-${analysis.id}`}>
            <Markdown content={analysis.aiOutput} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}
