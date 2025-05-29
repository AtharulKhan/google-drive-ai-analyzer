import { toast } from 'sonner';
import { ApifyClient } from 'apify-client';

// --- New Type Definition & Function ---

export interface ApiActorRunResult {
  success: boolean;
  data?: any[];
  runId?: string;
  datasetId?: string;
  error?: any;
}

/**
 * Runs an Apify actor and retrieves its dataset items.
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
    // This case should ideally be caught before calling, but good to have a safeguard.
    return { success: false, error: { message: "Apify API token is missing." } };
  }

  const client = new ApifyClient({ token });

  try {
    const actorRun = await client.actor(actorId).call(input);

    // waitForFinish will wait for the run to finish, polling at intervals.
    // It resolves with the final Run object once it's in a terminal state.
    const finishedRun = await client.run(actorRun.id).waitForFinish(); 

    if (finishedRun.status === 'SUCCEEDED') {
      if (!actorRun.defaultDatasetId) {
        // Actor succeeded but might not have produced a dataset (or it's not the default one).
        // This is not necessarily an error for all actors.
        // Consider this a success with a specific message/status.
        return { 
          success: true, 
          data: [], // No data from default dataset
          runId: actorRun.id, 
          datasetId: undefined, 
          error: { message: "Actor run succeeded but no default dataset was produced." } // Informational message
        };
      }
      // Attempt to fetch items from the default dataset.
      const { items } = await client.dataset(actorRun.defaultDatasetId).listItems();
      return {
        success: true,
        data: items,
        runId: actorRun.id,
        datasetId: actorRun.defaultDatasetId,
      };
    } else {
      // Handle other terminal statuses: TIMED_OUT, FAILED, ABORTED
      console.error(`Actor run ${actorRun.id} did not succeed. Status: ${finishedRun.status}`, finishedRun);
      // Attempt to get more error info if available (e.g. from a log or specific error fields in actor output)
      // For now, we return the run object itself for details.
      return {
        success: false,
        error: {
          message: `Actor run failed with status: ${finishedRun.status}.`,
          details: finishedRun, // Contains the full run object
        },
        runId: actorRun.id,
        datasetId: actorRun.defaultDatasetId,
      };
    }
  } catch (error: any) {
    // Log the detailed error for server-side or developer inspection
    console.error(`Full error details for Apify actor ${actorId} run:`, error);

    let errorMessage = 'An unexpected error occurred during actor execution.';
    if (error instanceof Error) {
        errorMessage = error.message;
    } else if (typeof error === 'object' && error && 'message' in error) {
        errorMessage = String(error.message);
    }
    
    if (errorMessage.includes('Invalid token') || (error.type === 'invalid_token')) { // ApifyClient specific error type
         return { success: false, error: { message: "Invalid Apify API token. Please check your token in Settings.", details: error } };
    }
    // Provide a user-friendly error message, and include the original error for debugging.
    return {
      success: false,
      error: {
        message: errorMessage,
        details: error, // Keep original error for more context if needed by caller
      },
    };
  }
}

// --- Existing Code ---
// The following functions (analyzeUrlWithApify, analyzeMultipleUrlsWithApify, formatDatasetItemsToText) 
// are specific to the 'apify~website-content-crawler' actor and use a different Apify API interaction pattern.
// They are not directly used by the generic ApifyActorsPage functionality but might be in use by other parts
// of the application (e.g., a specific Drive Analyzer feature).
// Consider refactoring or removing if confirmed to be unused across the entire application.

// Using the website-content-crawler actor ID
const ACTOR_NAME_OR_ID = 'apify~website-content-crawler'; // Specific to the functions below

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
    crawlerType: "cheerio", // Default to faster raw HTTP crawler
    useSitemaps: false, // Default to not using sitemaps
    includeIndirectLinks: false, // Default to not following indirect links
    maxIndirectLinks: 5, // Default limit for indirect links if enabled
    maxRequestsPerCrawl: 10, // Default to 10 requests per crawl
    maxConcurrency: 5, // Default to 5 concurrent requests
    saveSnapshots: false, // Default to not saving snapshots
    includeUrlGlobs: [], // Default to no include URL globs
    excludeUrlGlobs: [] // Default to no exclude URL globs
  };

  // Merge default options with provided options
  const mergedOptions = { ...defaultOptions, ...options };
  
  // Make sure maxResults is at least equal to maxCrawlPages to save all crawled content
  // This ensures we store results for every page we crawl
  if (mergedOptions.maxResults < mergedOptions.maxCrawlPages) {
    mergedOptions.maxResults = mergedOptions.maxCrawlPages;
    console.log(`Automatically adjusted maxResults to match maxCrawlPages: ${mergedOptions.maxCrawlPages}`);
  }

  // If including indirect links, adjust maxCrawlPages and maxResults accordingly
  if (mergedOptions.includeIndirectLinks && mergedOptions.maxIndirectLinks) {
    const totalPages = mergedOptions.maxCrawlPages + mergedOptions.maxIndirectLinks;
    if (mergedOptions.maxResults < totalPages) {
      mergedOptions.maxResults = totalPages;
      console.log(`Adjusted maxResults to accommodate indirect links: ${mergedOptions.maxResults}`);
    }
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

  // Add pseudo URLs for indirect links if enabled
  if (mergedOptions.includeIndirectLinks) {
    // This will match any URL from the same domain
    input.pseudoUrls = [{ purl: `[https?://([^/]+${new URL(url).hostname.replace(/\./g, '\\.')}|${new URL(url).hostname.replace(/\./g, '\\.')})[/]?.*]` }];
    // Include a general link selector to capture more links
    input.linkSelector = "a[href]";
  }

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
