import React, { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Markdown } from '@/components/ui/markdown'; // Assuming this component exists and works
import { Copy } from 'lucide-react';
import { toast } from 'sonner';

interface UnifiedContentViewProps {
  initialContent: string;
  onContentChange?: (newContent: string) => void; // Optional: for future editing functionality
  isEditable?: boolean; // Optional: to control if content can be edited
}

export const UnifiedContentView: React.FC<UnifiedContentViewProps> = ({
  initialContent,
  onContentChange,
  isEditable = false, // Default to not editable for now
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showMarkdown, setShowMarkdown] = useState(false);
  const [editedContent, setEditedContent] = useState(initialContent);

  // Update editedContent if initialContent changes (e.g., when dialog is reopened with new data)
  React.useEffect(() => {
    setEditedContent(initialContent);
  }, [initialContent]);

  const filteredContent = useMemo(() => {
    if (!searchTerm) {
      return editedContent;
    }
    // Basic search: case-insensitive
    return editedContent
      .split('\n')
      .filter(line => line.toLowerCase().includes(searchTerm.toLowerCase()))
      .join('\n');
  }, [editedContent, searchTerm]);

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
    setEditedContent(newContent);
    if (isEditable && onContentChange) {
      onContentChange(newContent);
    }
  };

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
        <Button onClick={handleCopy} variant="outline" size="icon" aria-label="Copy content">
          <Copy className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="markdown-toggle"
          checked={showMarkdown}
          onCheckedChange={setShowMarkdown}
        />
        <Label htmlFor="markdown-toggle">Show as Markdown</Label>
      </div>

      <ScrollArea className="flex-grow border rounded-md p-2 text-sm">
        {showMarkdown ? (
          <Markdown content={filteredContent} />
        ) : (
          <Textarea
            value={filteredContent}
            onChange={handleContentChange}
            readOnly={!isEditable}
            placeholder="Unified content will appear here..."
            className="w-full h-full resize-none border-none focus:outline-none"
            rows={15} // Adjust as needed
          />
        )}
      </ScrollArea>
      {!isEditable && (
        <p className="text-xs text-muted-foreground p-2 text-center">
          This is a read-only combined view of all content sources. Edits made here will not be saved.
        </p>
      )}
      {isEditable && onContentChange && (
         <p className="text-xs text-muted-foreground">
           Note: Editing here will attempt to update the original source. This functionality is experimental.
         </p>
       )}
    </div>
  );
};
