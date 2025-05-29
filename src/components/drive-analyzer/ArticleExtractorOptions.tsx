
import React from 'react';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { ArticleExtractorSmartInput } from '@/utils/apify-api';

interface ArticleExtractorOptionsProps {
  options: Partial<ArticleExtractorSmartInput>;
  onOptionChange: (optionName: keyof ArticleExtractorSmartInput, value: any) => void;
}

export function ArticleExtractorOptions({ options, onOptionChange }: ArticleExtractorOptionsProps) {
  return (
    <div className="space-y-4 pt-4 border-t">
      <h4 className="text-sm font-medium text-muted-foreground">Article Extractor Options</h4>
      
      <div className="flex items-center space-x-2">
        <Checkbox
          id="mustHaveDate"
          checked={options.mustHaveDate || false}
          onCheckedChange={(checked) => onOptionChange('mustHaveDate', !!checked)}
        />
        <Label htmlFor="mustHaveDate" className="text-sm">
          Must Have Date
        </Label>
      </div>
      
      <div className="space-y-1">
        <Label htmlFor="minWords" className="text-sm">
          Minimum Words
        </Label>
        <Input
          id="minWords"
          type="number"
          placeholder="e.g., 150"
          value={options.minWords || ''}
          onChange={(e) => onOptionChange('minWords', e.target.value ? parseInt(e.target.value, 10) : undefined)}
          className="w-full sm:w-1/2 md:w-1/3"
        />
        <p className="text-xs text-muted-foreground">
          Minimum number of words an article must have.
        </p>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="onlyNewArticles"
          checked={options.onlyNewArticles || false}
          onCheckedChange={(checked) => onOptionChange('onlyNewArticles', !!checked)}
        />
        <Label htmlFor="onlyNewArticles" className="text-sm">
          Only New Articles
        </Label>
      </div>

      <div className="flex items-center space-x-2">
        <Checkbox
          id="saveHtml"
          checked={options.saveHtml || false}
          onCheckedChange={(checked) => onOptionChange('saveHtml', !!checked)}
        />
        <Label htmlFor="saveHtml" className="text-sm">
          Save Full HTML
        </Label>
      </div>
    </div>
  );
}
