
import React from 'react';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ApifyCrawlingOptions } from '@/utils/apify-api';
import { 
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronUp } from 'lucide-react';

interface CrawlingOptionsProps {
  options: ApifyCrawlingOptions;
  onChange: (newOptions: ApifyCrawlingOptions) => void;
}

export function CrawlingOptions({ options, onChange }: CrawlingOptionsProps) {
  const [isOpen, setIsOpen] = React.useState(false);

  const handleOptionChange = <K extends keyof ApifyCrawlingOptions>(
    key: K, 
    value: ApifyCrawlingOptions[K]
  ) => {
    onChange({
      ...options,
      [key]: value
    });
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Crawling Options</CardTitle>
            <CollapsibleTrigger asChild>
              <Button variant="ghost" size="sm" className="p-1 h-auto">
                {isOpen ? (
                  <ChevronUp className="h-4 w-4" />
                ) : (
                  <ChevronDown className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
          <CardDescription>
            Configure how the website crawler should behave
          </CardDescription>
          
          <CollapsibleContent>
            <CardContent className="grid gap-4 pt-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="crawl-depth">Crawl Depth</Label>
                  <Select
                    value={String(options.maxCrawlDepth || 0)}
                    onValueChange={(val) => handleOptionChange('maxCrawlDepth', Number(val))}
                  >
                    <SelectTrigger id="crawl-depth">
                      <SelectValue placeholder="Select depth" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Only the URL (0)</SelectItem>
                      <SelectItem value="1">URL + direct links (1)</SelectItem>
                      <SelectItem value="2">Two levels deep (2)</SelectItem>
                      <SelectItem value="3">Three levels deep (3)</SelectItem>
                      <SelectItem value="5">Five levels deep (5)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    How many levels of links to follow from the start URL
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="max-pages">Maximum Pages</Label>
                  <Select
                    value={String(options.maxCrawlPages || 1)}
                    onValueChange={(val) => handleOptionChange('maxCrawlPages', Number(val))}
                  >
                    <SelectTrigger id="max-pages">
                      <SelectValue placeholder="Select max pages" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 page</SelectItem>
                      <SelectItem value="5">5 pages</SelectItem>
                      <SelectItem value="10">10 pages</SelectItem>
                      <SelectItem value="20">20 pages</SelectItem>
                      <SelectItem value="50">50 pages</SelectItem>
                      <SelectItem value="100">100 pages</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of pages to crawl in total
                  </p>
                </div>

                <div>
                  <Label htmlFor="max-results">Maximum Results</Label>
                  <Select
                    value={String(options.maxResults || 1)}
                    onValueChange={(val) => handleOptionChange('maxResults', Number(val))}
                  >
                    <SelectTrigger id="max-results">
                      <SelectValue placeholder="Select max results" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 result</SelectItem>
                      <SelectItem value="5">5 results</SelectItem>
                      <SelectItem value="10">10 results</SelectItem>
                      <SelectItem value="20">20 results</SelectItem>
                      <SelectItem value="50">50 results</SelectItem>
                      <SelectItem value="100">100 results</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of pages to store as results
                  </p>
                </div>

                <div>
                  <Label htmlFor="browser-type">Browser Type</Label>
                  <Select
                    value={options.crawlerType || 'playwright:adaptive'}
                    onValueChange={(val) => handleOptionChange('crawlerType', val)}
                  >
                    <SelectTrigger id="browser-type">
                      <SelectValue placeholder="Select browser" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="playwright:firefox">Firefox</SelectItem>
                      <SelectItem value="playwright:chrome">Chrome</SelectItem>
                      <SelectItem value="playwright:adaptive">Adaptive (Auto-switching)</SelectItem>
                      <SelectItem value="cheerio">Raw HTTP (Fastest)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Browser engine to use for crawling
                  </p>
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="use-sitemaps"
                    checked={options.useSitemaps || false}
                    onCheckedChange={(checked) => 
                      handleOptionChange('useSitemaps', checked === true)
                    }
                  />
                  <Label 
                    htmlFor="use-sitemaps"
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Use website sitemaps
                  </Label>
                </div>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
