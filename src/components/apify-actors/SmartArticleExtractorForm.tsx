import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';

interface SmartArticleExtractorFormProps {
  onSubmit: (data: any) => void;
  apifyToken: string | null;
  isLoading: boolean;
}

const defaultValues = {
  startUrls: "",
  articleUrls: "",
  onlyNewArticles: false,
  onlyInsideArticles: true,
  saveSnapshots: false,
  useGoogleBotHeaders: true,
  mustHaveDate: false,
  minWords: 150,
  proxyConfiguration: { useApifyProxy: true },
  isUrlArticleDefinition: {
    minDashes: 1,
    hasDate: true,
    linkIncludes: "",
  },
  extendOutputFunction: `async ({ data, item, Apify, customData, label }) => {
  // This function is called for each item scraped.
  // You can modify the item object here.
  // For example, add a new field:
  // item.processedAt = new Date().toISOString();
  return item;
}`,
  useBrowser: false,
};

const SmartArticleExtractorForm: React.FC<SmartArticleExtractorFormProps> = ({ onSubmit, apifyToken, isLoading }) => {
  const { register, handleSubmit, control, formState: { errors }, watch } = useForm({
    defaultValues,
  });

  const processFormData = (data: typeof defaultValues) => {
    const processedData = {
      ...data,
      startUrls: data.startUrls.split('\n').filter(url => url.trim() !== '').map(url => ({ url })),
      articleUrls: data.articleUrls.split('\n').filter(url => url.trim() !== '').map(url => ({ url })),
      isUrlArticleDefinition: {
        ...data.isUrlArticleDefinition,
        linkIncludes: data.isUrlArticleDefinition.linkIncludes.split(',').map(s => s.trim()).filter(s => s !== ''),
      },
      minWords: Number(data.minWords),
      isUrlArticleDefinition_minDashes: Number(data.isUrlArticleDefinition.minDashes), // Keep original key for processing
    };
    // delete processedData.isUrlArticleDefinition.minDashes; // remove if not needed by apify
    // The form field is isUrlArticleDefinition.minDashes, but Apify might expect isUrlArticleDefinition_minDashes directly
    // For now, let's assume direct mapping after processing
    processedData.isUrlArticleDefinition.minDashes = Number(data.isUrlArticleDefinition.minDashes);


    onSubmit(processedData);
  };
  
  const useBrowserEnabled = watch('useBrowser');

  return (
    <form onSubmit={handleSubmit(processFormData)}>
      <ScrollArea className="h-[calc(100vh-220px)] pr-4">
        <div className="space-y-6 p-1">
          {/* Fields remain the same, only button state changes */}
          <Card>
            <CardHeader>
              <CardTitle>Target URLs</CardTitle>
              <CardDescription>Specify the starting points for the actor.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="startUrls">Start URLs (one per line)</Label>
                <Textarea id="startUrls" {...register('startUrls')} rows={3} placeholder="https://example.com/news\nhttps://blog.example.com" />
                {errors.startUrls && <p className="text-red-500 text-sm">{errors.startUrls.message}</p>}
              </div>
              <div>
                <Label htmlFor="articleUrls">Direct Article URLs (one per line, optional)</Label>
                <Textarea id="articleUrls" {...register('articleUrls')} rows={3} placeholder="https://example.com/news/article-1\nhttps://example.com/news/article-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Article Filtering</CardTitle>
              <CardDescription>Define criteria for selecting articles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Controller name="onlyNewArticles" control={control} render={({ field }) => <Checkbox id="onlyNewArticles" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="onlyNewArticles">Only new articles (requires persistent storage)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="onlyInsideArticles" control={control} render={({ field }) => <Checkbox id="onlyInsideArticles" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="onlyInsideArticles">Only extract articles from the same domain as the start URL</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="mustHaveDate" control={control} render={({ field }) => <Checkbox id="mustHaveDate" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="mustHaveDate">Article must have a discernible date</Label>
              </div>
              <div>
                <Label htmlFor="minWords">Minimum number of words</Label>
                <Input id="minWords" type="number" {...register('minWords', { valueAsNumber: true })} />
                {errors.minWords && <p className="text-red-500 text-sm">{errors.minWords.message}</p>}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Article URL Definition</CardTitle>
              <CardDescription>Helps identify which links are articles.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
               <div>
                <Label htmlFor="isUrlArticleDefinition.minDashes">Minimum dashes in URL path</Label>
                <Input id="isUrlArticleDefinition.minDashes" type="number" {...register('isUrlArticleDefinition.minDashes', { valueAsNumber: true })} />
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="isUrlArticleDefinition.hasDate" control={control} render={({ field }) => <Checkbox id="isUrlArticleDefinition.hasDate" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="isUrlArticleDefinition.hasDate">URL must contain a date pattern</Label>
              </div>
              <div>
                <Label htmlFor="isUrlArticleDefinition.linkIncludes">URL must include (comma-separated)</Label>
                <Input id="isUrlArticleDefinition.linkIncludes" {...register('isUrlArticleDefinition.linkIncludes')} placeholder="e.g., /article/, /post/" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Proxy & Advanced Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Controller name="proxyConfiguration.useApifyProxy" control={control} render={({ field }) => <Checkbox id="proxyConfiguration.useApifyProxy" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="proxyConfiguration.useApifyProxy">Use Apify Proxy</Label>
              </div>
               <div className="flex items-center space-x-2">
                <Controller name="useBrowser" control={control} render={({ field }) => <Checkbox id="useBrowser" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="useBrowser">Use Browser (Puppeteer) for extraction (slower, more robust)</Label>
              </div>
              {useBrowserEnabled && (
                <div className="ml-6 mt-2 space-y-2 border-l pl-4">
                    <div className="flex items-center space-x-2">
                        <Controller name="saveSnapshots" control={control} render={({ field }) => <Checkbox id="saveSnapshots" checked={field.value} onCheckedChange={field.onChange} />} />
                        <Label htmlFor="saveSnapshots">Save snapshots of pages (HTML, screenshot)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Controller name="useGoogleBotHeaders" control={control} render={({ field }) => <Checkbox id="useGoogleBotHeaders" checked={field.value} onCheckedChange={field.onChange} />} />
                        <Label htmlFor="useGoogleBotHeaders">Use GoogleBot headers (when using browser)</Label>
                    </div>
                </div>
              )}
              <div>
                <Label htmlFor="extendOutputFunction">Extend Output Function (JavaScript)</Label>
                <Textarea id="extendOutputFunction" {...register('extendOutputFunction')} rows={10} className="font-mono text-xs" />
                {errors.extendOutputFunction && <p className="text-red-500 text-sm">{errors.extendOutputFunction.message}</p>}
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      <div className="mt-6 pt-4 border-t">
        <Button type="submit" className="w-full md:w-auto" disabled={!apifyToken || isLoading}>
          {isLoading ? 'Running...' : (apifyToken ? 'Run Smart Article Extractor' : 'Apify Token Missing')}
        </Button>
        {!apifyToken && !isLoading && <p className="text-sm text-yellow-600 mt-2">Please set your Apify API token in Settings to run actors.</p>}
      </div>
    </form>
  );
};

export default SmartArticleExtractorForm;
