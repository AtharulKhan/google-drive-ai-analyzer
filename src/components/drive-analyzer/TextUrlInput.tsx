
import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { X, Save, Trash2 } from 'lucide-react'; // Added Save and Trash2 icons
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
  const SAVED_URLS_STORAGE_KEY = 'driveAnalyzer_savedUrls';
  const [savedUrls, setSavedUrls] = useState<string[]>([]);

  // Load saved URLs from localStorage on mount
  useEffect(() => {
    const storedUrls = localStorage.getItem(SAVED_URLS_STORAGE_KEY);
    if (storedUrls) {
      try {
        const parsedUrls = JSON.parse(storedUrls);
        if (Array.isArray(parsedUrls)) {
          setSavedUrls(parsedUrls);
        }
      } catch (error) {
        console.error("Failed to parse saved URLs from localStorage:", error);
        // Optionally clear corrupted data
        // localStorage.removeItem(SAVED_URLS_STORAGE_KEY); 
      }
    }
  }, []);

  // Effect to update localStorage when savedUrls changes
  useEffect(() => {
    localStorage.setItem(SAVED_URLS_STORAGE_KEY, JSON.stringify(savedUrls));
  }, [savedUrls]);

  const handleAddUrl = () => {
    if (currentUrlInput.trim() !== '') {
      onUrlAdd(currentUrlInput.trim());
      // Optionally clear input: onCurrentUrlInputChange(''); 
    }
  };

  const handleSaveUrl = useCallback(() => {
    const urlToSave = currentUrlInput.trim();
    if (urlToSave && !savedUrls.includes(urlToSave)) {
      setSavedUrls(prev => [...prev, urlToSave]);
      // Optionally clear input: onCurrentUrlInputChange('');
    }
  }, [currentUrlInput, savedUrls]);

  const handleDeleteSavedUrl = useCallback((urlToDelete: string) => {
    setSavedUrls(prev => prev.filter(url => url !== urlToDelete));
  }, []);

  const handleSavedUrlClick = useCallback((url: string) => {
    onCurrentUrlInputChange(url);
  }, [onCurrentUrlInputChange]);

  const handlePastedTextChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    onPastedTextChange(event.target.value);
  };

  const handleCurrentUrlInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    onCurrentUrlInputChange(event.target.value);
  };
  
  const isUrlSavable = currentUrlInput.trim() !== '' && !savedUrls.includes(currentUrlInput.trim());

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
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <Input
            id="url-input"
            type="url"
            placeholder="https://example.com"
            value={currentUrlInput}
            onChange={handleCurrentUrlInputChange}
            className="text-sm md:text-base flex-grow"
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleAddUrl();
              }
            }}
          />
          <div className="flex space-x-2">
            <Button onClick={handleAddUrl} className="whitespace-nowrap text-sm md:text-base flex-1 sm:flex-none">
              Add URL to Session
            </Button>
            <Button 
              onClick={handleSaveUrl} 
              variant="outline" 
              className="whitespace-nowrap text-sm md:text-base flex-1 sm:flex-none"
              disabled={!isUrlSavable}
            >
              <Save className="mr-2 h-4 w-4" /> Save URL
            </Button>
          </div>
        </div>

        {/* Display Saved URLs */}
        <div className="space-y-2 pt-2">
          <Label className="text-sm md:text-base">Saved URLs:</Label>
          {savedUrls.length > 0 ? (
            <ScrollArea className="h-32 md:h-40 w-full rounded-md border p-2">
              <div className="space-y-2">
                {savedUrls.map((url) => (
                  <div key={url} className="flex items-center justify-between p-1.5 bg-muted/50 rounded-md group">
                    <span 
                      className="truncate cursor-pointer hover:underline text-xs md:text-sm flex-grow mr-2" 
                      title={`Load: ${url}`}
                      onClick={() => handleSavedUrlClick(url)}
                    >
                      {url}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-50 group-hover:opacity-100 transition-opacity"
                      onClick={() => handleDeleteSavedUrl(url)}
                      title={`Delete: ${url}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Delete Saved URL</span>
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <p className="text-xs md:text-sm text-muted-foreground p-2 border rounded-md">No URLs saved yet.</p>
          )}
        </div>


        {urls.length > 0 && (
          <div className="space-y-2 pt-4"> {/* Added pt-4 for separation */}
            <Label className="text-sm md:text-base">URLs for Current Session:</Label>
            <ScrollArea className="h-32 md:h-40 w-full rounded-md border p-2">
              <div className="space-y-2">
                {urls.map((url, index) => (
                  <Badge key={index} variant="secondary" className="flex justify-between items-center w-full pr-1 text-xs md:text-sm">
                    <span className="truncate mr-2 max-w-[200px] md:max-w-md lg:max-w-lg" title={url}>{url}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-5 w-5 shrink-0"
                      onClick={() => onUrlRemove(index)}
                    >
                      <X className="h-3 w-3" />
                      <span className="sr-only">Remove URL from Session</span>
                    </Button>
                  </Badge>
                ))}
              </div>
            </ScrollArea>
            <Button variant="outline" size="sm" onClick={onClearUrls} className="mt-1">
              Clear Session URLs
            </Button>
          </div>
        )}
      </div>
      
      {/* Crawling Options - unchanged */}
      {urls.length > 0 && (
        <CrawlingOptions 
          options={crawlingOptions} 
          onChange={onCrawlingOptionsChange}
        />
      )}
    </div>
  );
}
