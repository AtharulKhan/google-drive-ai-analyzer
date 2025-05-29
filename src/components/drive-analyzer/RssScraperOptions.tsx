
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
            id="header"
            checked={options.header || false}
            onCheckedChange={(checked) => onOptionChange('header', !!checked)}
          />
          <Label htmlFor="header" className="text-sm">
            Include Header Info
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Include header information at the beginning of results.
        </p>
      </div>
    </div>
  );
}
