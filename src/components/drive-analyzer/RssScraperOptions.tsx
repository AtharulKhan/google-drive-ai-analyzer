
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
            id="dev_dataset_clear"
            checked={options.dev_dataset_clear || false}
            onCheckedChange={(checked) => onOptionChange('dev_dataset_clear', !!checked)}
          />
          <Label htmlFor="dev_dataset_clear" className="text-sm">
            Clear Storage
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Clear Dataset before insert/update.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="dev_no_strip"
            checked={options.dev_no_strip || false}
            onCheckedChange={(checked) => onOptionChange('dev_no_strip', !!checked)}
          />
          <Label htmlFor="dev_no_strip" className="text-sm">
            Disable Data Cleansing
          </Label>
        </div>
        <p className="text-xs text-muted-foreground pl-6">
          Keep/Save empty values (NULL, FALSE, empty arrays, etc.).
        </p>
      </div>
    </div>
  );
}
