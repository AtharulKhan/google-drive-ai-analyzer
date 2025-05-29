import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';

interface BingSearchScraperFormProps {
  onSubmit: (data: any) => void;
  apifyToken: string | null;
  isLoading: boolean;
}

const marketCodes = [
  "", "es-AR", "en-AU", "de-AT", "nl-BE", "fr-BE", "pt-BR", "en-CA", "fr-CA", "es-CL", "da-DK", "fi-FI", "fr-FR", 
  "de-DE", "zh-HK", "en-IN", "en-ID", "it-IT", "ja-JP", "ko-KR", "en-MY", "es-MX", "nl-NL", "en-NZ", "no-NO", 
  "zh-CN", "pl-PL", "pt-PT", "en-PH", "ru-RU", "ar-SA", "en-ZA", "es-ES", "sv-SE", "fr-CH", "de-CH", "zh-TW", 
  "tr-TR", "en-GB", "en-US", "es-US"
];

const languageCodes = [
  "", "ar", "eu", "bg", "ca", "zh", "hr", "cs", "da", "nl", "en", "et", "fi", "fr", "gl", "de", "el", "he", 
  "hu", "is", "it", "ja", "ko", "lv", "lt", "no", "pl", "pt", "ro", "ru", "sr", "sk", "sl", "es", "sv", "th", "tr"
];

const defaultValues = {
  queries: "",
  resultsPerPage: 10,
  maxPagesPerQuery: 1,
  marketCode: "",
  languageCode: "",
  saveHtml: false,
  saveHtmlSnapshotUrls: false,
  ignoreSoftBlocking: false,
};

const BingSearchScraperForm: React.FC<BingSearchScraperFormProps> = ({ onSubmit, apifyToken, isLoading }) => {
  const { register, handleSubmit, control, formState: { errors } } = useForm({
    defaultValues,
  });

  const processFormData = (data: typeof defaultValues) => {
    const processedData = {
      ...data,
      queries: data.queries.split('\n').filter(q => q.trim() !== ''),
      resultsPerPage: Number(data.resultsPerPage),
      maxPagesPerQuery: Number(data.maxPagesPerQuery),
    };
    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit(processFormData)}>
      <ScrollArea className="h-[calc(100vh-220px)] pr-4">
        <div className="space-y-6 p-1">
          {/* Fields remain the same, only button state changes */}
          <Card>
            <CardHeader>
              <CardTitle>Search Queries</CardTitle>
              <CardDescription>Enter keywords or full search URLs, one per line.</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="queries"
                {...register('queries', { required: 'At least one query is required.' })}
                rows={4}
                placeholder="e.g., AI in agriculture\nhttps://www.bing.com/search?q=sustainable+farming+techniques"
              />
              {errors.queries && <p className="text-red-500 text-sm">{errors.queries.message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Search Parameters</CardTitle>
              <CardDescription>Configure how the search is performed.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="resultsPerPage">Results Per Page (1-50)</Label>
                <Input
                  id="resultsPerPage"
                  type="number"
                  {...register('resultsPerPage', {
                    valueAsNumber: true,
                    min: { value: 1, message: 'Minimum 1' },
                    max: { value: 50, message: 'Maximum 50' },
                  })}
                />
                {errors.resultsPerPage && <p className="text-red-500 text-sm">{errors.resultsPerPage.message}</p>}
              </div>
              <div>
                <Label htmlFor="maxPagesPerQuery">Max Pages Per Query (min 1)</Label>
                <Input
                  id="maxPagesPerQuery"
                  type="number"
                  {...register('maxPagesPerQuery', {
                    valueAsNumber: true,
                    min: { value: 1, message: 'Minimum 1' },
                  })}
                />
                {errors.maxPagesPerQuery && <p className="text-red-500 text-sm">{errors.maxPagesPerQuery.message}</p>}
              </div>
              <div>
                <Label htmlFor="marketCode">Market Code (Region)</Label>
                <Controller
                  name="marketCode"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Default (based on IP)" />
                      </SelectTrigger>
                      <SelectContent>
                        {marketCodes.map(code => (
                          <SelectItem key={code} value={code}>
                            {code || "Default"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
              <div>
                <Label htmlFor="languageCode">Language</Label>
                <Controller
                  name="languageCode"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <SelectTrigger>
                        <SelectValue placeholder="Default (based on market/IP)" />
                      </SelectTrigger>
                      <SelectContent>
                        {languageCodes.map(code => (
                          <SelectItem key={code} value={code}>
                            {code || "Default"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Data Saving Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center space-x-2">
                <Controller name="saveHtml" control={control} render={({ field }) => <Checkbox id="saveHtml" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="saveHtml">Save HTML content of search results pages</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="saveHtmlSnapshotUrls" control={control} render={({ field }) => <Checkbox id="saveHtmlSnapshotUrls" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="saveHtmlSnapshotUrls">Save URLs for HTML snapshots (if platform supports)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="ignoreSoftBlocking" control={control} render={({ field }) => <Checkbox id="ignoreSoftBlocking" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="ignoreSoftBlocking">Ignore soft blocking (e.g., CAPTCHAs, if possible)</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      <div className="mt-6 pt-4 border-t">
        <Button type="submit" className="w-full md:w-auto" disabled={!apifyToken || isLoading}>
          {isLoading ? 'Running...' : (apifyToken ? 'Run Bing Search Scraper' : 'Apify Token Missing')}
        </Button>
        {!apifyToken && !isLoading && <p className="text-sm text-yellow-600 mt-2">Please set your Apify API token in Settings to run actors.</p>}
      </div>
    </form>
  );
};

export default BingSearchScraperForm;
