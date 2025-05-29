
import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BingSearchScraperInput } from '@/utils/apify-api';

interface BingSearchOptionsProps {
  options: Partial<BingSearchScraperInput>;
  onOptionChange: (optionName: keyof BingSearchScraperInput, value: any) => void;
}

export function BingSearchOptions({ options, onOptionChange }: BingSearchOptionsProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground">Bing Search Options</h4>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label htmlFor="resultsPerPage" className="text-sm">
            Results Per Page
          </Label>
          <Select
            value={String(options.resultsPerPage || 10)}
            onValueChange={(value) => onOptionChange('resultsPerPage', parseInt(value, 10))}
          >
            <SelectTrigger id="resultsPerPage">
              <SelectValue placeholder="Select results per page" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5">5 results</SelectItem>
              <SelectItem value="10">10 results</SelectItem>
              <SelectItem value="20">20 results</SelectItem>
              <SelectItem value="50">50 results</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="maxPagesPerQuery" className="text-sm">
            Max Pages Per Query
          </Label>
          <Select
            value={String(options.maxPagesPerQuery || 1)}
            onValueChange={(value) => onOptionChange('maxPagesPerQuery', parseInt(value, 10))}
          >
            <SelectTrigger id="maxPagesPerQuery">
              <SelectValue placeholder="Select max pages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">1 page</SelectItem>
              <SelectItem value="2">2 pages</SelectItem>
              <SelectItem value="3">3 pages</SelectItem>
              <SelectItem value="5">5 pages</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="marketCode" className="text-sm">
            Market/Country
          </Label>
          <Select
            value={options.marketCode || ''}
            onValueChange={(value) => onOptionChange('marketCode', value || undefined)}
          >
            <SelectTrigger id="marketCode">
              <SelectValue placeholder="Select market" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="en-US">United States</SelectItem>
              <SelectItem value="en-GB">United Kingdom</SelectItem>
              <SelectItem value="en-CA">Canada</SelectItem>
              <SelectItem value="en-AU">Australia</SelectItem>
              <SelectItem value="de-DE">Germany</SelectItem>
              <SelectItem value="fr-FR">France</SelectItem>
              <SelectItem value="es-ES">Spain</SelectItem>
              <SelectItem value="it-IT">Italy</SelectItem>
              <SelectItem value="ja-JP">Japan</SelectItem>
              <SelectItem value="zh-CN">China</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="languageCode" className="text-sm">
            Language
          </Label>
          <Select
            value={options.languageCode || ''}
            onValueChange={(value) => onOptionChange('languageCode', value || undefined)}
          >
            <SelectTrigger id="languageCode">
              <SelectValue placeholder="Select language" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Default</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
              <SelectItem value="it">Italian</SelectItem>
              <SelectItem value="pt">Portuguese</SelectItem>
              <SelectItem value="ru">Russian</SelectItem>
              <SelectItem value="ja">Japanese</SelectItem>
              <SelectItem value="zh">Chinese</SelectItem>
              <SelectItem value="ar">Arabic</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
