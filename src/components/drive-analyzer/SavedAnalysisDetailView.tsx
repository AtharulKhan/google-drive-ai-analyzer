
import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Markdown } from '@/components/ui/markdown';
import { toast } from 'sonner';
import { Copy, FileText, Link2, Type, Search, Rss } from 'lucide-react'; // Added icons
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"; // Added Tooltip

// Updated SavedAnalysisSource to include new types and actor
export type SavedAnalysisSourceType = 'file' | 'url' | 'text' | 'search' | 'feed';
export interface SavedAnalysisSource {
  type: SavedAnalysisSourceType;
  name: string;
  actor?: string; // Optional: to know which actor generated this source
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
  actorConstants?: Record<string, string>; // To map actor keys to display names
}

export function SavedAnalysisDetailView({ analysis, actorConstants = {} }: SavedAnalysisDetailViewProps) {
  if (!analysis) {
    return null;
  }

  const getActorDisplayName = (actorKey?: string) => {
    if (!actorKey) return "";
    const entry = Object.entries(actorConstants).find(([key, val]) => val === actorKey);
    if (entry) {
        return entry[0]
            .replace("ACTOR_", "")
            .split("_")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(" ");
    }
    return actorKey; // Fallback to the key itself if not found in constants
  };

  const renderSource = (source: SavedAnalysisSource, index: number) => {
    const actorDisplayName = getActorDisplayName(source.actor);
    const tooltipText = actorDisplayName ? `${source.name} (via ${actorDisplayName})` : source.name;
    let icon;

    switch (source.type) {
      case 'file':
        icon = <FileText className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />;
        break;
      case 'url':
        icon = <Link2 className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />;
        break;
      case 'text':
        icon = <Type className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />;
        break;
      case 'search':
        icon = <Search className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />;
        break;
      case 'feed':
        icon = <Rss className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" />;
        break;
      default:
        icon = null;
    }

    return (
      <TooltipProvider key={index}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge variant="secondary" className="text-xs flex items-center cursor-default">
              {icon}
              <span className="truncate max-w-[150px] sm:max-w-[200px]" title={tooltipText}>{source.name}</span>
              {actorDisplayName && <span className="ml-1 text-muted-foreground truncate hidden sm:inline">({actorDisplayName})</span>}
            </Badge>
          </TooltipTrigger>
          <TooltipContent>
            <p>{source.type.charAt(0).toUpperCase() + source.type.slice(1)}: {tooltipText}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  };

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(analysis.aiOutput)
      .then(() => toast.success("AI output copied to clipboard!"))
      .catch(err => {
        console.error("Failed to copy output: ", err);
        toast.error("Failed to copy output. Please try again.");
      });
  };

  return (
    <div className="space-y-4 pt-2 pb-4 pr-1">
      <h3 className="text-xl font-semibold tracking-tight">{analysis.title}</h3>
      
      <div className="text-xs text-muted-foreground">
        Saved on: {new Date(analysis.timestamp).toLocaleString()}
      </div>
      
      <div>
        <Label className="text-sm font-medium">Sources:</Label>
        <div className="flex flex-wrap gap-1.5 mt-1.5"> {/* Increased gap slightly */}
          {analysis.sources.length > 0 ? (
            analysis.sources.map((source, index) => renderSource(source, index))
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
