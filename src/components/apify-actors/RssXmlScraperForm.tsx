import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';

interface RssXmlScraperFormProps {
  onSubmit: (data: any) => void;
  apifyToken: string | null;
  isLoading: boolean;
}

const defaultValues = {
  url: "", // Single string, actor might handle newlines if multiple URLs are pasted
  header: false,
  dev_proxy_config: "", // String input for proxy URL
  dev_custom_headers: "", // JSON string
  dev_custom_cookies: "", // JSON string
  dev_transform_fields: "", // JSON string
  dev_dataset_name: "",
  dev_dataset_clear: false,
  dev_no_strip: false,
};

const RssXmlScraperForm: React.FC<RssXmlScraperFormProps> = ({ onSubmit, apifyToken, isLoading }) => {
  const { register, handleSubmit, control, formState: { errors }, setError, clearErrors } = useForm({
    defaultValues,
  });

  const parseJsonString = (jsonString: string, fieldName: string): any | null => {
    if (!jsonString.trim()) return null; // Or return undefined / empty object/array based on actor spec
    try {
      const parsed = JSON.parse(jsonString);
      clearErrors(fieldName as any);
      return parsed;
    } catch (error) {
      setError(fieldName as any, { type: 'manual', message: 'Invalid JSON format.' });
      return undefined; // Indicate parsing failure
    }
  };

  const processFormData = (data: typeof defaultValues) => {
    let
     customHeaders, customCookies, transformFields;
    let validJson = true;

    if (data.dev_custom_headers) {
      customHeaders = parseJsonString(data.dev_custom_headers, 'dev_custom_headers');
      if (customHeaders === undefined) validJson = false;
    }
    if (data.dev_custom_cookies) {
      customCookies = parseJsonString(data.dev_custom_cookies, 'dev_custom_cookies');
      if (customCookies === undefined) validJson = false;
    }
    if (data.dev_transform_fields) {
      transformFields = parseJsonString(data.dev_transform_fields, 'dev_transform_fields');
      if (transformFields === undefined) validJson = false;
    }

    if (!validJson) {
      toast.error("Invalid JSON input.", { description: "Please correct the JSON format in the highlighted fields." });
      return;
    }

    const processedData: any = {
      url: data.url, // Assuming actor handles newline-separated URLs if multiple are pasted in the string
      header: data.header,
      dev_dataset_name: data.dev_dataset_name || undefined, // Send undefined if empty to use actor default
      dev_dataset_clear: data.dev_dataset_clear,
      dev_no_strip: data.dev_no_strip,
    };

    if (data.dev_proxy_config) {
      // Assuming the actor expects an object like { "url": "proxy_string" }
      // If actor directly takes string, this wrapping is not needed.
      // For now, let's pass it as a simple string if that's what the actor expects for "dev_proxy_config"
      // The Apify UI screenshot for this actor shows "Proxy Configuration" as a single string input for URL
      // So, we'll pass the string directly.
      processedData.dev_proxy_config = data.dev_proxy_config;
    }
    
    if (customHeaders) processedData.dev_custom_headers = customHeaders;
    if (customCookies) processedData.dev_custom_cookies = customCookies;
    if (transformFields) processedData.dev_transform_fields = transformFields;
    
    onSubmit(processedData);
  };

  return (
    <form onSubmit={handleSubmit(processFormData)}>
      <ScrollArea className="h-[calc(100vh-220px)] pr-4">
        <div className="space-y-6 p-1">
          {/* Fields remain the same, only button state changes */}
          <Card>
            <CardHeader>
              <CardTitle>RSS/XML Feed URL</CardTitle>
              <CardDescription>
                Enter the URL of the XML or RSS feed. If you paste multiple URLs separated by newlines, 
                the actor might process them if designed to do so.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                id="url"
                {...register('url', { required: 'At least one URL is required.' })}
                rows={3}
                placeholder="https://example.com/feed.xml"
              />
              {errors.url && <p className="text-red-500 text-sm">{errors.url.message}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Basic Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2">
                <Controller name="header" control={control} render={({ field }) => <Checkbox id="header" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="header">Include header info at the beginning of the results list</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Developer Options</CardTitle>
              <CardDescription>Advanced settings for customization and proxy usage.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="dev_proxy_config">Proxy Configuration URL</Label>
                <Input 
                  id="dev_proxy_config" 
                  {...register('dev_proxy_config')} 
                  placeholder="e.g., socks5://user:pass@hostname:port or http://user:pass@hostname:port" 
                />
                <p className="text-xs text-muted-foreground mt-1">Enter the full proxy URL if needed.</p>
              </div>
              <div>
                <Label htmlFor="dev_custom_headers">Custom Headers (JSON format)</Label>
                <Textarea
                  id="dev_custom_headers"
                  {...register('dev_custom_headers')}
                  rows={3}
                  placeholder='[{"key": "X-My-Header", "value": "MyValue"}]'
                />
                {errors.dev_custom_headers && <p className="text-red-500 text-sm">{errors.dev_custom_headers.message}</p>}
              </div>
              <div>
                <Label htmlFor="dev_custom_cookies">Custom Cookies (JSON format)</Label>
                <Textarea
                  id="dev_custom_cookies"
                  {...register('dev_custom_cookies')}
                  rows={3}
                  placeholder='[{"name": "myCookie", "value": "myValue", "domain": ".example.com"}]'
                />
                {errors.dev_custom_cookies && <p className="text-red-500 text-sm">{errors.dev_custom_cookies.message}</p>}
              </div>
              <div>
                <Label htmlFor="dev_transform_fields">Transform Fields (JSON format)</Label>
                <Textarea
                  id="dev_transform_fields"
                  {...register('dev_transform_fields')}
                  rows={3}
                  placeholder='{"old_field_name": "new_field_name", "another_field": "$.nested.path"}'
                />
                {errors.dev_transform_fields && <p className="text-red-500 text-sm">{errors.dev_transform_fields.message}</p>}
              </div>
              <div>
                <Label htmlFor="dev_dataset_name">Custom Dataset Name</Label>
                <Input id="dev_dataset_name" {...register('dev_dataset_name')} placeholder="Optional: my-rss-data" />
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="dev_dataset_clear" control={control} render={({ field }) => <Checkbox id="dev_dataset_clear" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="dev_dataset_clear">Clear dataset before run</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Controller name="dev_no_strip" control={control} render={({ field }) => <Checkbox id="dev_no_strip" checked={field.value} onCheckedChange={field.onChange} />} />
                <Label htmlFor="dev_no_strip">Do not strip HTML tags from content</Label>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
      <div className="mt-6 pt-4 border-t">
        <Button type="submit" className="w-full md:w-auto" disabled={!apifyToken || isLoading}>
          {isLoading ? 'Running...' : (apifyToken ? 'Run RSS / XML Scraper' : 'Apify Token Missing')}
        </Button>
        {!apifyToken && !isLoading && <p className="text-sm text-yellow-600 mt-2">Please set your Apify API token in Settings to run actors.</p>}
      </div>
    </form>
  );
};

export default RssXmlScraperForm;
