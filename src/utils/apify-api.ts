
import { toast } from 'sonner';

// Using the website-content-crawler actor
const ACTOR_ID = 'apify/website-content-crawler';

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
  // Additional options for the website-content-crawler actor
  includeUrlGlobs?: Array<{ glob: string }>;
  excludeUrlGlobs?: Array<{ glob: string }>;
  initialCookies?: any[];
  keepUrlFragments?: boolean;
  ignoreCanonicalUrl?: boolean;
  removeElementsCssSelector?: string;
  htmlTransformer?: string;
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
    if (item.metadata && item.metadata.title) {
      formattedText += `### ${item.metadata.title}\n\n`;
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
  options: ApifyCrawlingOptions = {}
): Promise<ScrapedContentResult> {
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    return { analyzedText: "", failedUrl: url, error: "Apify API Token not set." };
  }

  // Set default options
  const defaultOptions = {
    maxCrawlDepth: 0, // Default to crawling only the provided URL (no links)
    maxCrawlPages: 1, // Default to crawling just 1 page
    maxResults: 1, // Default to storing only 1 result
    crawlerType: "cheerio", // Default to faster HTML parsing instead of browser
    useSitemaps: false, // Default to not using sitemaps
    htmlTransformer: "readableText" // Default HTML transformer
  };

  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };

  console.log("Analyzing URL with options:", mergedOptions);

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
    },
    // Set additional needed options
    htmlTransformer: "readableText",
    removeElementsCssSelector: `nav, footer, script, style, noscript, svg, img[src^='data:'],
      [role="alert"],
      [role="banner"],
      [role="dialog"],
      [role="alertdialog"],
      [role="region"][aria-label*="skip" i],
      [aria-modal="true"]`
  };

  try {
    console.log(`Sending request to Apify for URL: ${url} with input:`, JSON.stringify(input, null, 2));
    
    // Previous CORS issue: We can't directly fetch from the browser to Apify's API
    // We need to use a proxy server or alternatively, for this frontend app, 
    // use a different approach like JSON-P or have the user use our own deployment endpoint
    
    // Two options:
    // 1. Use the Apify client SDK (which handles CORS) - requires adding the SDK as a dependency
    // 2. Use a proxy function that your hosting environment might provide
    // For now, we'll implement a simpler solution to make it work in the browser
    
    // Fallback approach that might work for some deployments:
    // Add mode: 'no-cors' to make the request pass, but we won't be able to read the response directly
    // This isn't a full solution but can prevent the immediate error
    const response = await fetch(`https://api.apify.com/v2/acts/${ACTOR_ID}/run-sync-get-dataset-items?token=${apifyToken}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!response.ok) {
      // Handle error response
      let errorMessage;
      try {
        const errorData = await response.json();
        errorMessage = errorData?.error?.message || `HTTP error ${response.status}`;
      } catch (e) {
        errorMessage = `HTTP error ${response.status} (${response.statusText})`;
      }
      
      console.error(`Failed to analyze URL ${url} with Apify:`, errorMessage);
      toast.error(`Apify analysis failed: ${errorMessage}`);
      return { analyzedText: "", failedUrl: url, error: errorMessage };
    }

    const datasetItems = await response.json();
    console.log(`Received ${datasetItems.length} items from Apify for URL: ${url}`);
    
    if (!Array.isArray(datasetItems)) {
      console.error(`Unexpected response format from Apify for ${url}:`, datasetItems);
      toast.error(`Apify returned an unexpected format for ${url}.`);
      return { analyzedText: "", failedUrl: url, error: "Unexpected response format from Apify."};
    }

    const analyzedText = formatDatasetItemsToText(datasetItems);
    return { analyzedText, failedUrl: null };

  } catch (error) {
    console.error(`Error during Apify URL analysis for ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify analysis.";
    toast.error(`Error analyzing ${url} with Apify: ${errorMessage}`);
    
    // Provide better error guidance
    let enhancedError = errorMessage;
    if (errorMessage.includes("Failed to fetch") || errorMessage.includes("CORS")) {
      enhancedError = "CORS error: The Apify API cannot be accessed directly from the browser. Please check the browser console for more details and consider using a server-side proxy for API calls or a browser extension to bypass CORS restrictions.";
    }
    
    return { analyzedText: "", failedUrl: url, error: enhancedError };
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
    
    // Add progress notification
    toast.info(`Processing URL ${i + 1} of ${urls.length}: ${url}`);
    
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
