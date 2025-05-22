
import { toast } from 'sonner';

// Using the website-content-crawler actor ID
const ACTOR_NAME_OR_ID = 'apify~website-content-crawler';

export interface ApifyCrawlingOptions {
  maxCrawlDepth?: number;
  maxCrawlPages?: number; 
  maxResults?: number;
  crawlerType?: string;
  useSitemaps?: boolean;
}

interface ApifyActorInput {
  startUrls: Array<{ url: string }>;
  useSitemaps?: boolean;
  respectRobotsTxtFile?: boolean;
  crawlerType?: string;
  saveMarkdown?: boolean;
  maxResults?: number;
  maxCrawlPages?: number;
  maxCrawlDepth?: number;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
}

interface ScrapedContentResult {
  analyzedText: string; 
  failedUrl: string | null;
  error?: string;
}

function formatDatasetItemsToText(items: any[]): string {
  if (!items || items.length === 0) {
    return "No content found in the analysis.";
  }

  let formattedText = "Website Content Analysis:\n\n";

  items.forEach((item, index) => {
    formattedText += `## Page ${index + 1}: ${item.url}\n\n`;
    
    // Add the title if available
    if (item.title) {
      formattedText += `### ${item.title}\n\n`;
    }

    // Add the markdown content if available (primary content format)
    if (item.markdown) {
      formattedText += item.markdown + "\n\n";
    }
    // If no markdown, use text content
    else if (item.text) {
      formattedText += item.text + "\n\n";
    }

    formattedText += "---\n\n";
  });

  return formattedText;
}

export async function analyzeUrlWithApify(
  url: string, 
  options: ApifyCrawlingOptions = {} // Default empty options object
): Promise<ScrapedContentResult> {
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    return { analyzedText: "", failedUrl: url, error: "Apify API Token not set." };
  }

  // Build the API URL for website-content-crawler
  const apiUrl = `https://api.apify.com/v2/acts/${ACTOR_NAME_OR_ID}/run-sync-get-dataset-items?token=${apifyToken}`;

  // Set default options
  const defaultOptions = {
    maxCrawlDepth: 0, // Default to crawling only the provided URL (no links)
    maxCrawlPages: 1, // Default to crawling just 1 page
    maxResults: 1, // Default to storing only 1 result
    crawlerType: "playwright:firefox", // Default browser
    useSitemaps: false // Default to not using sitemaps
  };

  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Make sure maxResults is at least equal to maxCrawlPages to save all crawled content
  // This ensures we store results for every page we crawl
  if (mergedOptions.maxResults < mergedOptions.maxCrawlPages) {
    mergedOptions.maxResults = mergedOptions.maxCrawlPages;
    console.log(`Automatically adjusted maxResults to match maxCrawlPages: ${mergedOptions.maxCrawlPages}`);
  }

  // Prepare the input according to website-content-crawler schema
  const input: ApifyActorInput = {
    startUrls: [{ url }],
    useSitemaps: mergedOptions.useSitemaps,
    respectRobotsTxtFile: true,
    crawlerType: mergedOptions.crawlerType,
    saveMarkdown: true,
    maxResults: mergedOptions.maxResults,
    maxCrawlPages: mergedOptions.maxCrawlPages,
    maxCrawlDepth: mergedOptions.maxCrawlDepth,
    proxyConfiguration: { 
      useApifyProxy: true 
    }
  };

  console.log(`Analyzing URL with options:`, mergedOptions);
  console.log(`Sending request to Apify for URL: ${url} with input:`, input);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error ${response.status}`;
      console.error(`Failed to analyze URL ${url} with Apify:`, errorMessage, errorData);
      toast.error(`Apify analysis failed for ${url}: ${errorMessage}`);
      return { analyzedText: "", failedUrl: url, error: errorMessage };
    }

    const datasetItems = await response.json();
    
    if (!Array.isArray(datasetItems)) {
      console.error(`Unexpected response format from Apify for ${url}:`, datasetItems);
      toast.error(`Apify returned an unexpected format for ${url}.`);
      return { analyzedText: "", failedUrl: url, error: "Unexpected response format from Apify."};
    }

    console.log(`Received ${datasetItems.length} pages of content from Apify for URL: ${url}`);
    
    const analyzedText = formatDatasetItemsToText(datasetItems);
    return { analyzedText, failedUrl: null };

  } catch (error) {
    console.error(`Error during Apify URL analysis for ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify analysis.";
    toast.error(`Error analyzing ${url} with Apify: ${errorMessage}`);
    return { analyzedText: "", failedUrl: url, error: errorMessage };
  }
}

// Function to analyze multiple URLs
export async function analyzeMultipleUrlsWithApify(
  urls: string[],
  options: ApifyCrawlingOptions = {} // Default empty options object
): Promise<{ combinedAnalyzedText: string; failedUrls: string[] }> {
  let combinedAnalyzedText = "";
  const failedUrls: string[] = [];

  // For multiple URLs, we'll process them sequentially to avoid overwhelming the API
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await analyzeUrlWithApify(url, options);
    
    combinedAnalyzedText += `### Analysis for URL: ${url}\n\n`;
    if (result.error) {
      combinedAnalyzedText += `Error: ${result.error}\n\n`;
      failedUrls.push(url);
    } else {
      combinedAnalyzedText += result.analyzedText + "\n\n";
    }
    combinedAnalyzedText += "---\n\n"; // Separator between analyses
  }

  return { combinedAnalyzedText, failedUrls };
}
