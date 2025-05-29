
import { toast } from 'sonner';

// --- New Type Definition & Function ---

export interface ApiActorRunResult {
  success: boolean;
  data?: any[];
  runId?: string;
  datasetId?: string;
  error?: any;
}

/**
 * Runs an Apify actor and retrieves its dataset items using direct HTTP API calls.
 * @param actorId The ID or name of the actor to run (e.g., "username/actor-name").
 * @param input The input object for the actor.
 * @param token The Apify API token.
 * @returns A promise that resolves to an ApiActorRunResult object.
 */
export async function runApifyActor(
  actorId: string,
  input: any,
  token: string
): Promise<ApiActorRunResult> {
  if (!token) {
    return { success: false, error: { message: "Apify API token is missing." } };
  }

  try {
    // Start the actor run
    const startResponse = await fetch(`https://api.apify.com/v2/acts/${actorId}/runs?token=${token}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!startResponse.ok) {
      const errorData = await startResponse.json().catch(() => ({ message: startResponse.statusText }));
      throw new Error(errorData?.error?.message || errorData?.message || `HTTP error ${startResponse.status}`);
    }

    const runData = await startResponse.json();
    const runId = runData.data.id;
    const defaultDatasetId = runData.data.defaultDatasetId;

    // Poll for completion
    let attempts = 0;
    const maxAttempts = 60; // 5 minutes with 5-second intervals
    
    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      
      const statusResponse = await fetch(`https://api.apify.com/v2/actor-runs/${runId}?token=${token}`);
      
      if (!statusResponse.ok) {
        throw new Error(`Failed to check run status: ${statusResponse.statusText}`);
      }

      const statusData = await statusResponse.json();
      const status = statusData.data.status;

      if (status === 'SUCCEEDED') {
        if (!defaultDatasetId) {
          return { 
            success: true, 
            data: [], 
            runId: runId, 
            datasetId: undefined, 
            error: { message: "Actor run succeeded but no default dataset was produced." }
          };
        }

        // Fetch dataset items
        const datasetResponse = await fetch(`https://api.apify.com/v2/datasets/${defaultDatasetId}/items?token=${token}`);
        
        if (!datasetResponse.ok) {
          throw new Error(`Failed to fetch dataset items: ${datasetResponse.statusText}`);
        }

        const items = await datasetResponse.json();
        
        return {
          success: true,
          data: Array.isArray(items) ? items : [],
          runId: runId,
          datasetId: defaultDatasetId,
        };
      } else if (['FAILED', 'TIMED_OUT', 'ABORTED'].includes(status)) {
        return {
          success: false,
          error: {
            message: `Actor run failed with status: ${status}.`,
            details: statusData.data,
          },
          runId: runId,
          datasetId: defaultDatasetId,
        };
      }

      attempts++;
    }

    // Timeout reached
    return {
      success: false,
      error: {
        message: "Actor run timed out after 5 minutes.",
      },
      runId: runId,
      datasetId: defaultDatasetId,
    };

  } catch (error: any) {
    console.error(`Full error details for Apify actor ${actorId} run:`, error);

    let errorMessage = 'An unexpected error occurred during actor execution.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error && 'message' in error) {
        errorMessage = String(error.message);
    }
    
    if (errorMessage.includes('Invalid token') || errorMessage.includes('401')) {
         return { success: false, error: { message: "Invalid Apify API token. Please check your token in Settings.", details: error } };
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        details: error,
      },
    };
  }
}

// --- Existing Code ---
// The following functions are specific to the 'apify~website-content-crawler' actor
// and use a different API interaction pattern for synchronous execution.

// Using the website-content-crawler actor ID
const ACTOR_NAME_OR_ID = 'apify~website-content-crawler';

export interface ApifyCrawlingOptions {
  maxCrawlDepth?: number;
  maxCrawlPages?: number; 
  maxResults?: number;
  crawlerType?: string;
  useSitemaps?: boolean;
  includeIndirectLinks?: boolean;
  maxIndirectLinks?: number;
  maxRequestsPerCrawl?: number;
  maxConcurrency?: number;
  saveSnapshots?: boolean;
  includeUrlGlobs?: string[];
  excludeUrlGlobs?: string[];
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
  pseudoUrls?: Array<{ purl: string }>;
  linkSelector?: string;
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
    
    if (item.title) {
      formattedText += `### ${item.title}\n\n`;
    }

    if (item.markdown) {
      formattedText += item.markdown + "\n\n";
    } else if (item.text) {
      formattedText += item.text + "\n\n";
    }

    formattedText += "---\n\n";
  });

  return formattedText;
}

function isValidUrl(url: string): boolean {
  try {
    const urlObj = new URL(url);
    return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
  } catch {
    return false;
  }
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

  // Validate URL
  if (!isValidUrl(url)) {
    toast.error("Invalid URL. Please enter a valid HTTP or HTTPS URL.");
    return { analyzedText: "", failedUrl: url, error: "Invalid URL format." };
  }

  const apiUrl = `https://api.apify.com/v2/acts/${ACTOR_NAME_OR_ID}/run-sync-get-dataset-items?token=${apifyToken}`;

  const defaultOptions = {
    maxCrawlDepth: 0,
    maxCrawlPages: 1,
    maxResults: 1,
    crawlerType: "cheerio",
    useSitemaps: false,
    includeIndirectLinks: false,
    maxIndirectLinks: 5,
    maxRequestsPerCrawl: 10,
    maxConcurrency: 5,
    saveSnapshots: false,
    includeUrlGlobs: [],
    excludeUrlGlobs: []
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  if (mergedOptions.maxResults < mergedOptions.maxCrawlPages) {
    mergedOptions.maxResults = mergedOptions.maxCrawlPages;
  }

  if (mergedOptions.includeIndirectLinks && mergedOptions.maxIndirectLinks) {
    const totalPages = mergedOptions.maxCrawlPages + mergedOptions.maxIndirectLinks;
    if (mergedOptions.maxResults && mergedOptions.maxResults < totalPages) {
      mergedOptions.maxResults = totalPages;
    }
  }

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

  if (mergedOptions.includeIndirectLinks) {
    try {
      const urlObj = new URL(url);
      const hostname = urlObj.hostname.replace(/\./g, '\\.');
      input.pseudoUrls = [{ purl: `[https?://([^/]+${hostname}|${hostname})[/]?.*]` }];
      input.linkSelector = "a[href]";
    } catch (e) {
      console.warn("Failed to create pseudo URL pattern:", e);
    }
  }

  console.log(`Analyzing URL with options:`, mergedOptions);

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

export async function analyzeMultipleUrlsWithApify(
  urls: string[],
  options: ApifyCrawlingOptions = {}
): Promise<{ combinedAnalyzedText: string; failedUrls: string[] }> {
  let combinedAnalyzedText = "";
  const failedUrls: string[] = [];

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
    combinedAnalyzedText += "---\n\n";
  }

  return { combinedAnalyzedText, failedUrls };
}
