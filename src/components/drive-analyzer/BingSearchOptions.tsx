import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BingSearchScraperInput } from '@/utils/apify-api';

interface BingSearchOptionsProps {
  options: Partial<BingSearchScraperInput>;
  onOptionChange: (optionName: keyof BingSearchScraperInput, value: any) => void;
}

// A small list of common countries for the dropdown. Can be expanded.
const commonCountries = [
  { value: 'US', label: 'United States' },
  { value: 'GB', label: 'United Kingdom' },
  { value: 'DE', label: 'Germany' },
  { value: 'FR', label: 'France' },
  { value: 'CA', label: 'Canada' },
  { value: 'AU', label: 'Australia' },
  { value: 'IN', label: 'India' },
  { value: 'CN', label: 'China' },
  { value: 'JP', label: 'Japan' },
  { value: 'BR', label: 'Brazil' },
];

// A small list of common languages. Can be expanded.
const commonLanguages = [
    { value: 'en', label: 'English' },
    { value: 'es', label: 'Spanish' },
    { value: 'fr', label: 'French' },
    { value: 'de', label: 'German' },
    { value: 'zh', label: 'Chinese' },
    { value: 'ja', label: 'Japanese' },
    { value: 'pt', label: 'Portuguese' },
    { value: 'ar', label: 'Arabic' },
    { value: 'hi', label: 'Hindi' },
    { value: 'ru', label: 'Russian' },
];


export function BingSearchOptions({ options, onOptionChange }: BingSearchOptionsProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground">Bing Search Options</h4>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="resultsPerPage" className="text-sm">
            Results Per Page
          </Label>
          <Input
            id="resultsPerPage"
            type="number"
            placeholder="e.g., 10"
            value={options.resultsPerPage || ''}
            onChange={(e) => onOptionChange('resultsPerPage', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="maxPagesPerQuery" className="text-sm">
            Max Pages Per Query
          </Label>
          <Input
            id="maxPagesPerQuery"
            type="number"
            placeholder="e.g., 1"
            value={options.maxPagesPerQuery || ''}
            onChange={(e) => onOptionChange('maxPagesPerQuery', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          />
        </div>
        
        <div className="space-y-1">
          <Label htmlFor="country" className="text-sm">Country</Label>
          <Select
            value={options.country || ''}
            onValueChange={(value) => onOptionChange('country', value === '' ? undefined : value)}
          >
            <SelectTrigger id="country">
              <SelectValue placeholder="Default (Actor)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default (Actor)</SelectItem>
              {commonCountries.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label} ({c.value})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Country for search results (e.g., US, GB).
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="languageCode" className="text-sm">Language</Label>
           <Select
            value={options.languageCode || ''}
            onValueChange={(value) => onOptionChange('languageCode', value === '' ? undefined : value)}
          >
            <SelectTrigger id="languageCode">
              <SelectValue placeholder="Default (Actor)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default (Actor)</SelectItem>
              {commonLanguages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label} ({lang.value})</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Language preference for search results (e.g., en, es).
          </p>
        </div>
      </div>
       {/* TODO: Add timerange if simple enough, or other fields */}
    </div>
  );
}
