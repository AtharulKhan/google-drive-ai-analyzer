
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { X } from 'lucide-react';

interface TextUrlInputProps {
  pastedText: string;
  onPastedTextChange: (text: string) => void;
  urls: string[];
  onUrlAdd: (url: string) => void;
  onUrlRemove: (index: number) => void;
  onClearPastedText: () => void;
  onClearUrls: () => void;
  currentUrlInput: string;
  onCurrentUrlInputChange: (url: string) => void;
}

export function TextUrlInput({
  pastedText,
  onPastedTextChange,
  urls,
  onUrlAdd,
  onUrlRemove,
  onClearPastedText,
  onClearUrls,
  currentUrlInput,
  onCurrentUrlInputChange,
}: TextUrlInputProps) {
  const handleAddUrl = () => {
    if (currentUrlInput.trim() !== '') {
      onUrlAdd(currentUrlInput.trim());
      onCurrentUrlInputChange(''); // Clear input after adding
    }
  };

  const handlePastedTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPastedTextChange(event.target.value);
  };

  const handleCurrentUrlInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onCurrentUrlInputChange(event.target.value);
  };

  return (
    <Card>
      <CardHeader className="px-3 sm:px-6 py-3 sm:py-4">
        <CardTitle className="text-lg">Content Input</CardTitle>
      </CardHeader>
      <CardContent className="px-3 sm:px-6 py-3 sm:py-4 space-y-4 sm:space-y-6">
        {/* Pasted Text Section */}
        <div className="space-y-2">
          <Label htmlFor="pasted-text">Pasted Text</Label>
          <Textarea
            id="pasted-text"
            placeholder="Paste your text here..."
            value={pastedText}
            onChange={handlePastedTextChange}
            rows={6}
            className="resize-none"
          />
          {pastedText && (
            <Button variant="outline" size="sm" onClick={onClearPastedText} className="mt-2">
              Clear Text
            </Button>
          )}
        </div>

        {/* URLs Section */}
        <div className="space-y-2">
          <Label htmlFor="url-input">Add URL</Label>
          <div className="flex space-x-2">
            <Input
              id="url-input"
              type="url"
              placeholder="https://example.com"
              value={currentUrlInput}
              onChange={handleCurrentUrlInputChange}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleAddUrl();
                }
              }}
              className="text-xs sm:text-sm"
            />
            <Button onClick={handleAddUrl} size="sm" className="whitespace-nowrap">Add URL</Button>
          </div>

          {urls.length > 0 && (
            <div className="space-y-2 pt-2">
              <Label>Added URLs:</Label>
              <ScrollArea className="h-32 w-full rounded-md border p-2">
                <div className="space-y-2">
                  {urls.map((url, index) => (
                    <Badge key={index} variant="secondary" className="flex justify-between items-center text-xs sm:text-sm max-w-full">
                      <span className="truncate mr-2 max-w-[calc(100%-24px)]" title={url}>{url}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 flex-shrink-0"
                        onClick={() => onUrlRemove(index)}
                      >
                        <X className="h-3 w-3" />
                        <span className="sr-only">Remove URL</span>
                      </Button>
                    </Badge>
                  ))}
                </div>
              </ScrollArea>
              <Button variant="outline" size="sm" onClick={onClearUrls} className="mt-2">
                Clear All URLs
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
