
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BingSearchScraperInput } from '@/utils/apify-api';

interface BingSearchOptionsProps {
  options: Partial<BingSearchScraperInput>;
  onOptionChange: (optionName: keyof BingSearchScraperInput, value: any) => void;
}

const commonMarkets = [
  { value: 'en-US', label: 'United States (en-US)' },
  { value: 'en-GB', label: 'United Kingdom (en-GB)' },
  { value: 'de-DE', label: 'Germany (de-DE)' },
  { value: 'fr-FR', label: 'France (fr-FR)' },
  { value: 'en-CA', label: 'Canada (en-CA)' },
  { value: 'en-AU', label: 'Australia (en-AU)' },
  { value: 'en-IN', label: 'India (en-IN)' },
  { value: 'zh-CN', label: 'China (zh-CN)' },
  { value: 'ja-JP', label: 'Japan (ja-JP)' },
  { value: 'pt-BR', label: 'Brazil (pt-BR)' },
];

const commonLanguages = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
  { value: 'zh-hans', label: 'Chinese (Simplified)' },
  { value: 'ja', label: 'Japanese' },
  { value: 'pt-br', label: 'Portuguese (Brazil)' },
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
          <Label htmlFor="marketCode" className="text-sm">Market</Label>
          <Select
            value={options.marketCode || 'default'}
            onValueChange={(value) => onOptionChange('marketCode', value === 'default' ? undefined : value)}
          >
            <SelectTrigger id="marketCode">
              <SelectValue placeholder="Default (Auto)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Auto)</SelectItem>
              {commonMarkets.map(market => (
                <SelectItem key={market.value} value={market.value}>{market.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Market for search results localization.
          </p>
        </div>

        <div className="space-y-1">
          <Label htmlFor="languageCode" className="text-sm">Language</Label>
          <Select
            value={options.languageCode || 'default'}
            onValueChange={(value) => onOptionChange('languageCode', value === 'default' ? undefined : value)}
          >
            <SelectTrigger id="languageCode">
              <SelectValue placeholder="Default (Auto)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="default">Default (Auto)</SelectItem>
              {commonLanguages.map(lang => (
                <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            Language preference for search results.
          </p>
        </div>
      </div>
    </div>
  );
}
