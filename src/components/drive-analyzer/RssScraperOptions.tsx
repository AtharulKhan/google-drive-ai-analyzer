import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { RssXmlScraperInput } from '@/utils/apify-api';

interface RssScraperOptionsProps {
  options: Partial<RssXmlScraperInput>;
  onOptionChange: (optionName: keyof RssXmlScraperInput, value: any) => void;
}

export function RssScraperOptions({ options, onOptionChange }: RssScraperOptionsProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground">RSS/XML Scraper Options</h4>
      
      <div className="space-y-1">
        <Label htmlFor="maxItems" className="text-sm">
          Max Items Per Feed
        </Label>
        <Input
          id="maxItems"
          type="number"
          placeholder="e.g., 25"
          value={options.maxItems || ''}
          onChange={(e) => onOptionChange('maxItems', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="w-full sm:w-1/2 md:w-1/3"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="handleFromAtom"
            checked={options.handleFromAtom === undefined ? true : options.handleFromAtom} // Default to true if undefined
            onCheckedChange={(checked) => onOptionChange('handleFromAtom', !!checked)}
          />
          <Label htmlFor="handleFromAtom" className="text-sm">
            Enable Atom Feed Handling
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Process items specific to Atom feeds (e.g. content, summary, updated).
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="handleFromRdf"
            checked={options.handleFromRdf === undefined ? true : options.handleFromRdf} // Default to true if undefined
            onCheckedChange={(checked) => onOptionChange('handleFromRdf', !!checked)}
          />
          <Label htmlFor="handleFromRdf" className="text-sm">
            Enable RDF Feed Handling
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Process items specific to RDF feeds (e.g. dc:creator, dc:date).
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="xmlToJson"
            checked={options.xmlToJson || false}
            onCheckedChange={(checked) => onOptionChange('xmlToJson', !!checked)}
          />
          <Label htmlFor="xmlToJson" className="text-sm">
            Convert XML to JSON
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Include a JSON representation of the original XML (mainly for debugging).
        </p>
      </div>
    </div>
  );
}
