
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
import { FormItem } from '@/components/ui/form';
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
import { ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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
    // Create the update
    const update = { [key]: value } as Partial<ApifyCrawlingOptions>;

    // Special case: if we're updating maxCrawlPages, ensure maxResults is at least as large
    if (key === 'maxCrawlPages' && typeof value === 'number') {
      if (!options.maxResults || options.maxResults < value) {
        update.maxResults = value;
      }
    }

    onChange(update as any);
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
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Maximum number of pages to crawl and save content from
                  </p>
                </div>

                <div>
                  <Label htmlFor="browser-type">Browser Type</Label>
                  <Select
                    value={options.crawlerType || 'cheerio'}
                    onValueChange={(val) => handleOptionChange('crawlerType', val)}
                  >
                    <SelectTrigger id="browser-type">
                      <SelectValue placeholder="Select browser" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cheerio">Raw HTTP (Fastest)</SelectItem>
                      <SelectItem value="playwright:firefox">Firefox</SelectItem>
                      <SelectItem value="playwright:chrome">Chrome</SelectItem>
                      <SelectItem value="playwright:adaptive">Adaptive (Auto-switching)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground mt-1">
                    Browser engine to use for crawling
                  </p>
                </div>
                
                <div>
                  <div className="flex items-center space-x-2 pt-1">
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
                  
                  <div className="flex items-center space-x-2 pt-4">
                    <Checkbox
                      id="include-indirect-links"
                      checked={options.includeIndirectLinks || false}
                      onCheckedChange={(checked) => 
                        handleOptionChange('includeIndirectLinks', checked === true)
                      }
                    />
                    <Label 
                      htmlFor="include-indirect-links"
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      Include indirect links
                    </Label>
                  </div>
                </div>
                
                {options.includeIndirectLinks && (
                  <div>
                    <Label htmlFor="max-indirect-links">Max Indirect Links</Label>
                    <Select
                      value={String(options.maxIndirectLinks || 5)}
                      onValueChange={(val) => handleOptionChange('maxIndirectLinks', Number(val))}
                    >
                      <SelectTrigger id="max-indirect-links">
                        <SelectValue placeholder="Select max indirect links" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 links</SelectItem>
                        <SelectItem value="10">10 links</SelectItem>
                        <SelectItem value="20">20 links</SelectItem>
                        <SelectItem value="50">50 links</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Maximum number of indirect links to crawl
                    </p>
                  </div>
                )}
              </div>

              <Alert variant="destructive" className="bg-muted/50">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Browser-based crawling may have CORS limitations</AlertTitle>
                <AlertDescription>
                  Due to browser security restrictions, some websites may block API requests. 
                  If crawling fails, try using the Raw HTTP (Cheerio) crawler for static sites.
                </AlertDescription>
              </Alert>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </CardHeader>
    </Card>
  );
}
