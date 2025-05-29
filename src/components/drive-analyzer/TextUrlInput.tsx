
import React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, X } from 'lucide-react';
import { ApifyCrawlingOptions, ArticleExtractorSmartInput, BingSearchScraperInput, RssXmlScraperInput } from '@/utils/apify-api';
import { WebsiteCrawlerOptions } from './WebsiteCrawlerOptions';
import { ArticleExtractorOptions } from './ArticleExtractorOptions';
import { BingSearchOptions } from './BingSearchOptions';
import { RssScraperOptions } from './RssScraperOptions';

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
  
  // Actor selection
  selectedActor: string;
  onSelectedActorChange: (actor: string) => void;
  actorWebsiteCrawler: string;
  actorArticleExtractor: string;
  actorBingSearch: string;
  actorRssScraper: string;
  
  // Actor-specific inputs
  articleExtractorUrl: string;
  onArticleExtractorUrlChange: (url: string) => void;
  bingSearchQuery: string;
  onBingSearchQueryChange: (query: string) => void;
  rssFeedUrl: string;
  onRssFeedUrlChange: (url: string) => void;
  
  // Actor options
  currentActorOptions: any;
  onActorOptionChange: (actor: string, optionName: string, value: any) => void;
  crawlingOptions: ApifyCrawlingOptions;
  onCrawlingOptionsChange: (options: Partial<ApifyCrawlingOptions>) => void;
}

export function TextUrlInput({
  pastedText, onPastedTextChange, urls, onUrlAdd, onUrlRemove, onClearPastedText, onClearUrls,
  currentUrlInput, onCurrentUrlInputChange, selectedActor, onSelectedActorChange,
  actorWebsiteCrawler, actorArticleExtractor, actorBingSearch, actorRssScraper,
  articleExtractorUrl, onArticleExtractorUrlChange, bingSearchQuery, onBingSearchQueryChange,
  rssFeedUrl, onRssFeedUrlChange, currentActorOptions, onActorOptionChange,
  crawlingOptions, onCrawlingOptionsChange
}: TextUrlInputProps) {

  const handleAddUrl = () => {
    if (currentUrlInput.trim()) {
      onUrlAdd(currentUrlInput.trim());
      onCurrentUrlInputChange('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddUrl();
    }
  };

  const renderActorInput = () => {
    switch (selectedActor) {
      case actorWebsiteCrawler:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="url-input">Website URLs to Crawl</Label>
              <div className="flex gap-2">
                <Input
                  id="url-input"
                  placeholder="https://example.com"
                  value={currentUrlInput}
                  onChange={(e) => onCurrentUrlInputChange(e.target.value)}
                  onKeyPress={handleKeyPress}
                  className="flex-1"
                />
                <Button onClick={handleAddUrl} disabled={!currentUrlInput.trim()}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add URL to Session
                </Button>
              </div>
            </div>
            {urls.length > 0 && (
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>URLs in Session ({urls.length})</Label>
                  <Button onClick={onClearUrls} variant="outline" size="sm">
                    <Trash2 className="h-4 w-4 mr-1" />
                    Clear All
                  </Button>
                </div>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {urls.map((url, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                      <span className="flex-1 truncate">{url}</span>
                      <Button
                        onClick={() => onUrlRemove(index)}
                        variant="ghost"
                        size="sm"
                        className="h-6 w-6 p-0"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <WebsiteCrawlerOptions 
              options={crawlingOptions} 
              onChange={onCrawlingOptionsChange} 
            />
          </div>
        );

      case actorArticleExtractor:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="article-url">Article URL to Extract</Label>
              <Input
                id="article-url"
                placeholder="https://example.com/article-page"
                value={articleExtractorUrl}
                onChange={(e) => onArticleExtractorUrlChange(e.target.value)}
              />
            </div>
            <ArticleExtractorOptions
              options={currentActorOptions as Partial<ArticleExtractorSmartInput>}
              onOptionChange={(optionName, value) => onActorOptionChange(selectedActor, optionName, value)}
            />
          </div>
        );

      case actorBingSearch:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bing-query">Search Query</Label>
              <Input
                id="bing-query"
                placeholder="Enter your search query/queries..."
                value={bingSearchQuery}
                onChange={(e) => onBingSearchQueryChange(e.target.value)}
              />
            </div>
            <BingSearchOptions
              options={currentActorOptions as Partial<BingSearchScraperInput>}
              onOptionChange={(optionName, value) => onActorOptionChange(selectedActor, optionName, value)}
            />
          </div>
        );

      case actorRssScraper:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rss-url">RSS/XML Feed URL</Label>
              <Input
                id="rss-url"
                placeholder="https://example.com/feed.xml"
                value={rssFeedUrl}
                onChange={(e) => onRssFeedUrlChange(e.target.value)}
              />
            </div>
            <RssScraperOptions
              options={currentActorOptions as Partial<RssXmlScraperInput>}
              onOptionChange={(optionName, value) => onActorOptionChange(selectedActor, optionName, value)}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Pasted Text Section */}
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <Label htmlFor="pasted-text">Pasted Text Content</Label>
          {pastedText && (
            <Button onClick={onClearPastedText} variant="outline" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <Textarea
          id="pasted-text"
          placeholder="Paste any text content here for analysis..."
          value={pastedText}
          onChange={(e) => onPastedTextChange(e.target.value)}
          className="min-h-[100px]"
        />
      </div>

      <Separator />

      {/* Actor Selection and Configuration */}
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="actor-select">Select Analysis Actor</Label>
          <Select value={selectedActor} onValueChange={onSelectedActorChange}>
            <SelectTrigger id="actor-select">
              <SelectValue placeholder="Choose an actor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={actorWebsiteCrawler}>Website Content Crawler</SelectItem>
              <SelectItem value={actorArticleExtractor}>Article Extractor (Single URL)</SelectItem>
              <SelectItem value={actorBingSearch}>Bing Search Scraper</SelectItem>
              <SelectItem value={actorRssScraper}>RSS/XML Feed Scraper</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {renderActorInput()}
      </div>
    </div>
  );
}
