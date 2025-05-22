
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { CrawlingOptions } from './CrawlingOptions';
import { ApifyCrawlingOptions } from '@/utils/apify-api';

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
  crawlingOptions: ApifyCrawlingOptions;
  onCrawlingOptionsChange: (options: ApifyCrawlingOptions) => void;
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
  crawlingOptions,
  onCrawlingOptionsChange,
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
    <div className="space-y-6">
      {/* Pasted Text Section */}
      <div className="space-y-2">
        <Label htmlFor="pasted-text" className="text-sm md:text-base">Pasted Text</Label>
        <Textarea
          id="pasted-text"
          placeholder="Paste your text here..."
          value={pastedText}
          onChange={handlePastedTextChange}
          rows={6}
          className="resize-none text-sm md:text-base"
        />
        {pastedText && (
          <Button variant="outline" size="sm" onClick={onClearPastedText} className="mt-1">
            Clear Pasted Text
          </Button>
        )}
      </div>

      {/* URLs Section */}
      <div className="space-y-2">
        <Label htmlFor="url-input" className="text-sm md:text-base">Add URL</Label>
        <div className="flex space-x-2">
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com"
            value={currentUrlInput}
            onChange={handleCurrentUrlInputChange}
            className="text-sm md:text-base"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddUrl();
              }
            }}
          />
          <Button onClick={handleAddUrl} className="whitespace-nowrap text-sm md:text-base">Add URL</Button>
        </div>

        {urls.length > 0 && (
          <div className="space-y-2 pt-2">
            <Label className="text-sm md:text-base">Added URLs:</Label>
            <ScrollArea className="h-32 md:h-40 w-full rounded-md border p-2">
              <div className="space-y-2">
                {urls.map((url, index) => (
                  <Badge key={index} variant="secondary" className="flex justify-between items-center w-full pr-1 text-xs md:text-sm">
                    <span className="truncate mr-2 max-w-[200px] md:max-w-md" title={url}>{url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5"
                      onClick={() => onUrlRemove(index)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove URL</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
            <Button variant="outline" size="sm" onClick={onClearUrls} className="mt-1">
              Clear All URLs
            </Button>
          </div>
        )}
      </div>
      
      {/* Crawling Options */}
      {urls.length > 0 && (
        <CrawlingOptions 
          options={crawlingOptions} 
          onChange={onCrawlingOptionsChange}
        />
      )}
    </div>
  );
}
