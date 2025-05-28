
import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown';
import { Copy, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { GoogleFile } from '@/hooks/useDrivePicker';
import { extractTextFromFile } from '@/utils/local-file-processor';
import { fetchFileContent } from '@/utils/google-api';

interface UnifiedContentViewProps {
  initialContent?: string;
  onContentChange?: (newContent: string) => void;
  isEditable?: boolean;
  // New props for comprehensive content display
  googleFiles?: GoogleFile[];
  localFiles?: File[];
  pastedText?: string;
  urls?: string[];
  userPrompt?: string;
  customInstructions?: string;
  accessToken?: string;
}

export const UnifiedContentView: React.FC<UnifiedContentViewProps> = ({
  initialContent = "",
  onContentChange,
  isEditable = true, // Changed default to true for editing
  googleFiles = [],
  localFiles = [],
  pastedText = "",
  urls = [],
  userPrompt = "",
  customInstructions = "",
  accessToken,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [editedContent, setEditedContent] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedContent, setExtractedContent] = useState('');
  const [useExtractedContent, setUseExtractedContent] = useState(true);

  // Extract all content from sources
  const extractAllContent = async (): Promise<string> => {
    const contentSections: string[] = [];

    // Add Custom Instructions
    if (customInstructions.trim()) {
      contentSections.push(`=== CUSTOM INSTRUCTIONS (Saved Automatically) ===\n\n${customInstructions.trim()}\n`);
    }

    // Add User Prompt
    if (userPrompt.trim()) {
      contentSections.push(`=== PROMPT (Instructions for AI) ===\n\n${userPrompt.trim()}\n`);
    }

    // Add Pasted Text
    if (pastedText.trim()) {
      contentSections.push(`=== PASTED TEXT ===\n\n${pastedText.trim()}\n`);
    }

    // Add URLs
    if (urls.length > 0) {
      contentSections.push(`=== URLs ===\n\n${urls.map(url => `• ${url}`).join('\n')}\n\n[Note: URL content would be scraped during analysis]\n`);
    }

    // Extract Google Drive Files content
    if (googleFiles.length > 0 && accessToken) {
      contentSections.push(`=== GOOGLE DRIVE FILES ===\n`);
      for (const file of googleFiles.slice(0, 10)) { // Limit to first 10 files for performance
        try {
          const content = await fetchFileContent(file, accessToken);
          const truncatedContent = content.slice(0, 50000); // Limit content length
          contentSections.push(`\n--- File: ${file.name} (ID: ${file.id}) ---\n${truncatedContent}\n`);
        } catch (error) {
          contentSections.push(`\n--- File: ${file.name} (ID: ${file.id}) ---\n(Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'})\n`);
        }
      }
      if (googleFiles.length > 10) {
        contentSections.push(`\n[... and ${googleFiles.length - 10} more Google Drive files]\n`);
      }
    } else if (googleFiles.length > 0) {
      contentSections.push(`=== GOOGLE DRIVE FILES ===\n\n${googleFiles.map(file => `• ${file.name} (ID: ${file.id})`).join('\n')}\n\n[Note: Sign in to Google Drive to extract file content]\n`);
    }

    // Extract Local Files content
    if (localFiles.length > 0) {
      contentSections.push(`=== LOCAL FILES ===\n`);
      for (const file of localFiles) {
        try {
          const content = await extractTextFromFile(file);
          contentSections.push(`\n--- Local File: ${file.name} ---\n${content}\n`);
        } catch (error) {
          contentSections.push(`\n--- Local File: ${file.name} ---\n(Error extracting content: ${error instanceof Error ? error.message : 'Unknown error'})\n`);
        }
      }
    }

    return contentSections.join('\n');
  };

  // Initialize content extraction on mount and when sources change
  React.useEffect(() => {
    const initializeContent = async () => {
      if (useExtractedContent && (googleFiles.length > 0 || localFiles.length > 0 || pastedText || urls.length > 0 || userPrompt || customInstructions)) {
        setIsExtracting(true);
        try {
          const content = await extractAllContent();
          setExtractedContent(content);
          setEditedContent(content);
        } catch (error) {
          console.error('Error extracting content:', error);
          toast.error('Failed to extract some content');
          setExtractedContent(initialContent);
          setEditedContent(initialContent);
        } finally {
          setIsExtracting(false);
        }
      } else {
        setExtractedContent(initialContent);
        setEditedContent(initialContent);
      }
    };

    initializeContent();
  }, [googleFiles, localFiles, pastedText, urls, userPrompt, customInstructions, accessToken, useExtractedContent, initialContent]);

  const handleRefreshContent = async () => {
    setIsExtracting(true);
    try {
      const content = await extractAllContent();
      setExtractedContent(content);
      setEditedContent(content);
      toast.success('Content refreshed successfully');
    } catch (error) {
      console.error('Error refreshing content:', error);
      toast.error('Failed to refresh content');
    } finally {
      setIsExtracting(false);
    }
  };

  const currentContent = useExtractedContent ? editedContent : initialContent;

  const filteredContent = useMemo(() => {
    if (!searchTerm) {
      return currentContent;
    }
    return currentContent
      .split('\n')
      .filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
      .join('\n');
  }, [currentContent, searchTerm]);

  const handleCopy = () => {
    navigator.clipboard.writeText(filteredContent)
      .then(() => {
        toast.success('Content copied to clipboard!');
      })
      .catch(err => {
        toast.error('Failed to copy content.');
        console.error('Failed to copy content: ', err);
      });
  };

  const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = event.target.value;
    if (useExtractedContent) {
      setEditedContent(newContent);
    }
    if (isEditable && onContentChange) {
      onContentChange(newContent);
    }
  };

  const contentStats = useMemo(() => {
    const chars = filteredContent.length;
    const words = filteredContent.split(/\s+/).filter(word => word.length > 0).length;
    const lines = filteredContent.split('\n').length;
    return { chars, words, lines };
  }, [filteredContent]);

  return (
    <div className="flex flex-col h-full space-y-4 p-1">
      <div className="flex items-center space-x-2">
        <Input
          type="text"
          placeholder="Search content..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-grow"
        />
        <Button 
          onClick={handleRefreshContent} 
          variant="outline" 
          size="icon" 
          disabled={isExtracting}
          aria-label="Refresh content"
        >
          <RefreshCw className={`h-4 w-4 ${isExtracting ? 'animate-spin' : ''}`} />
        </Button>
        <Button onClick={handleCopy} variant="outline" size="icon" aria-label="Copy content">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <Switch
              id="content-source-toggle"
              checked={useExtractedContent}
              onCheckedChange={setUseExtractedContent}
            />
            <Label htmlFor="content-source-toggle">Show Extracted Content</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Switch
              id="markdown-toggle"
              checked={showMarkdown}
              onCheckedChange={setShowMarkdown}
            />
            <Label htmlFor="markdown-toggle">Show as Markdown</Label>
          </div>
        </div>
        <div className="text-xs text-muted-foreground">
          {contentStats.chars} chars, {contentStats.words} words, {contentStats.lines} lines
        </div>
      </div>

      <ScrollArea className="flex-grow border rounded-md p-2 text-sm">
        {isExtracting ? (
          <div className="flex items-center justify-center h-32">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Extracting content...</span>
          </div>
        ) : showMarkdown ? (
          <Markdown content={filteredContent} />
        ) : (
          <Textarea
            value={filteredContent}
            onChange={handleContentChange}
            readOnly={!isEditable}
            placeholder="Content will appear here..."
            className="w-full h-full resize-none border-none focus:outline-none"
            rows={20}
          />
        )}
      </ScrollArea>

      {isEditable && useExtractedContent && (
        <p className="text-xs text-muted-foreground text-center">
          This view shows extracted content from all sources. You can edit it here, but changes won't affect the original sources.
        </p>
      )}
      
      {!useExtractedContent && (
        <p className="text-xs text-muted-foreground text-center">
          Toggle "Show Extracted Content" to see content from all sources (Google Drive, local files, prompts, etc.)
        </p>
      )}
    </div>
  );
};
