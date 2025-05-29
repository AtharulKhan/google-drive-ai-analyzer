
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

// Using the website-content-crawler actor ID
const WEBSITE_CONTENT_CRAWLER_ACTOR = 'apify~website-content-crawler';
const ARTICLE_EXTRACTOR_SMART_ACTOR = 'lukaskrivka/article-extractor-smart';
const BING_SEARCH_SCRAPER_ACTOR = 'tri_angle/bing-search-scraper';
const RSS_XML_SCRAPER_ACTOR = 'jupri/rss-xml-scraper';

// CORS proxy for problematic endpoints
const CORS_PROXY = 'https://api.allorigins.win/raw?url=';

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

// Interface for website-content-crawler input
interface WebsiteCrawlerInput {
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

// Interface for lukaskrivka/article-extractor-smart input
export interface ArticleExtractorSmartInput {
  startUrls: Array<{ url: string }>;
  mustHaveDate?: boolean;
  minWords?: number;
  onlyInsideArticles?: boolean;
  saveSnapshots?: boolean;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
}

// Interface for tri_angle/bing-search-scraper input
export interface BingSearchScraperInput {
  queries: string | string[];
  country?: string;
  marketCode?: string;
  languageCode?: string;
  maxPagesPerQuery?: number;
  resultsPerPage?: number;
  timerange?: string;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
}

// Interface for jupri/rss-xml-scraper input
export interface RssXmlScraperInput {
  url: string;
  maxItems?: number;
  header?: boolean;
}

interface ScrapedContentResult {
  analyzedText: string; 
  failedUrl: string | null;
  error?: string;
}

// Helper function to get Google user info from localStorage
function getGoogleUserInfo() {
  const accessToken = localStorage.getItem('googleAccessToken');
  const isSignedIn = localStorage.getItem('googleIsSignedIn') === 'true';
  
  if (!accessToken || !isSignedIn) {
    return null;
  }
  
  // For now, we'll use the access token as a user identifier
  // In a production app, you'd want to decode the JWT or make an API call to get the actual user ID
  return {
    id: accessToken.substring(0, 32), // Use first 32 chars as a pseudo user ID
    accessToken
  };
}

// Helper function to call Apify via Edge Function with Google auth
async function callApifyViaEdgeFunction(actorId: string, input: any, endpoint: string = 'run-sync-get-dataset-items'): Promise<any> {
  const googleUser = getGoogleUserInfo();
  
  if (!googleUser) {
    throw new Error('Please sign in with Google to use Apify features');
  }

  const { data, error } = await supabase.functions.invoke('apify-proxy', {
    body: {
      actorId,
      input,
      endpoint,
      googleUserId: googleUser.id // Pass Google user ID
    },
    headers: {
      'Authorization': `Bearer ${googleUser.accessToken}`
    }
  });

  if (error) {
    throw new Error(error.message || 'Failed to call Apify service');
  }

  return data;
}

function formatDatasetItemsToText(items: any[]): string {
  if (!items || items.length === 0) {
    return "No website content was found or crawled.";
  }

  let formattedText = "The following text contains crawled content from one or more web pages:\n\n";
  formattedText += "--- Start of Website Content Analysis ---\n\n";

  items.forEach((item, index) => {
    formattedText += `## Page ${index + 1}: ${item.url || 'Unknown URL'}\n\n`;
    
    if (item.title) {
      formattedText += `### Title: ${item.title}\n\n`;
    }

    if (item.markdown) {
      formattedText += "**Content (Markdown):**\n" + item.markdown + "\n\n";
    } else if (item.text) {
      formattedText += "**Content (Text):**\n" + item.text + "\n\n";
    } else {
      formattedText += "No textual content extracted for this page.\n\n";
    }

    if (index < items.length - 1) {
      formattedText += "---\n\n"; // Separator between pages
    }
  });

  formattedText += "\n--- End of Website Content Analysis ---\n";
  return formattedText;
}

export async function analyzeUrlWithApify(
  url: string, 
  options: ApifyCrawlingOptions = {} // Default empty options object
): Promise<ScrapedContentResult> {
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
  const input: WebsiteCrawlerInput = {
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
    const datasetItems = await callApifyViaEdgeFunction(WEBSITE_CONTENT_CRAWLER_ACTOR, input);
    
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

// --- Functions for jupri/rss-xml-scraper ---

interface RssScraperResultItem {
  title?: string;
  link?: string;
  pubDate?: string;
  creator?: string;
  content?: string;
  contentSnippet?: string;
  guid?: string;
  isoDate?: string;
  categories?: string[];
  feedInfo?: {
    title?: string;
    link?: string;
    description?: string;
  };
  // RSS scraper can have other fields depending on the feed
}

function formatRssXmlScraperOutput(items: any[]): string {
  if (!items || items.length === 0) {
    return "No RSS/XML feed items were found.";
  }

  let formattedText = "The following are items from RSS/XML feeds:\n\n";
  formattedText += "--- Start of RSS/XML Feed Items ---\n\n";
  let currentFeedTitle = "";

  items.forEach((item: RssScraperResultItem, index) => {
    if (item.feedInfo?.title && item.feedInfo.title !== currentFeedTitle) {
      currentFeedTitle = item.feedInfo.title;
      formattedText += `## Feed: ${currentFeedTitle}\n`;
      if (item.feedInfo.link) {
        formattedText += `**Source URL:** ${item.feedInfo.link}\n`;
      }
      if (item.feedInfo.description) {
        formattedText += `**Feed Description:** ${item.feedInfo.description}\n`;
      }
      formattedText += "\n"; // Add a line break after feed info
    }

    formattedText += `### ${index + 1}. ${item.title || 'No Title Provided'}\n`;
    if (item.link) {
      formattedText += `**Item Link:** ${item.link}\n`;
    }
    if (item.pubDate) {
      formattedText += `**Published:** ${new Date(item.pubDate).toUTCString()}\n`;
    }
    if (item.creator) {
      formattedText += `**Author/Creator:** ${item.creator}\n`;
    }
    if (item.contentSnippet) {
      formattedText += `**Snippet:**\n${item.contentSnippet}\n`;
    } else if (item.content) {
      const snippet = item.content.replace(/<[^>]*>?/gm, '').substring(0, 300) + (item.content.length > 300 ? '...' : '');
      formattedText += `**Content Extract:**\n${snippet}\n`;
    }
    if (item.categories && item.categories.length > 0) {
      formattedText += `**Categories:** ${item.categories.join(', ')}\n`;
    }
    formattedText += "\n"; // Add a line break after each item
  });

  formattedText += "--- End of RSS/XML Feed Items ---\n";
  return formattedText;
}

export async function scrapeRssFeedWithApify(
  input: RssXmlScraperInput
): Promise<ScrapedContentResult> {
  try {
    const result = await callApifyViaEdgeFunction(RSS_XML_SCRAPER_ACTOR, input, 'runs');
    
    if (result?.data?.id) {
      toast.info("RSS scraping initiated successfully.");
      return { analyzedText: "RSS scraping started successfully. Results will be available in your Apify dashboard.", failedUrl: null };
    } else {
      console.error(`Unexpected response format from Apify for RSS/XML feed:`, result);
      toast.error(`Apify returned an unexpected format for RSS/XML feed.`);
      return { analyzedText: "", failedUrl: input.url, error: "Unexpected response format from Apify."};
    }
  } catch (error) {
    console.error(`Error during Apify RSS/XML feed scraping:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify RSS/XML feed scraping.";
    toast.error(`Error with Apify RSS/XML feed scraping: ${errorMessage}`);
    return { analyzedText: "", failedUrl: input.url, error: errorMessage };
  }
}

// --- Functions for tri_angle/bing-search-scraper ---

interface BingScraperResultItem {
  title?: string;
  url?: string;
  displayedUrl?: string;
  snippet?: string;
  // Bing scraper can have other fields like 'deepLinks', 'relatedSearches', etc.
}

function formatBingSearchScraperOutput(items: any[]): string {
  if (!items || items.length === 0) {
    return "No Bing search results were found.";
  }

  let formattedText = "The following are Bing search results:\n\n";
  formattedText += "--- Start of Bing Search Results ---\n\n";

  items.forEach((itemBatch, batchIndex) => {
    const query = itemBatch.query || (itemBatch.results && itemBatch.results.length > 0 && itemBatch.results[0].queryContext ? itemBatch.results[0].queryContext.originalQuery : null);

    if (query) {
       formattedText += `## Results for query: "${query}"\n\n`;
    } else if (items.length > 1) {
      formattedText += `## Result Batch ${batchIndex + 1}\n\n`;
    }
    
    if (itemBatch.error) {
      formattedText += `**Error for this query/batch:** ${itemBatch.error}\n\n`;
      if (batchIndex < items.length - 1) {
        formattedText += "---\n\n"; // Separator between batches/queries
      }
      return; 
    }

    const results: BingScraperResultItem[] = Array.isArray(itemBatch) ? itemBatch : itemBatch.results || [];
    
    if (results.length === 0) {
      formattedText += "No results found for this query/batch.\n\n";
      if (batchIndex < items.length - 1) {
        formattedText += "---\n\n";
      }
      return; 
    }

    results.forEach((result, index) => {
      formattedText += `### ${index + 1}. ${result.title || 'No Title Provided'}\n`;
      if (result.url) {
        formattedText += `**Link:** ${result.url}\n`;
      }
      if (result.displayedUrl) {
        formattedText += `**Displayed URL:** ${result.displayedUrl}\n`;
      }
      if (result.snippet) {
        formattedText += `**Snippet:**\n${result.snippet}\n`;
      }
      formattedText += "\n"; // Add a line break after each result
    });

    if (batchIndex < items.length - 1) {
      formattedText += "---\n\n"; // Separator between batches/queries
    }
  });

  formattedText += "\n--- End of Bing Search Results ---\n";
  return formattedText;
}

export async function searchWithBingScraper(
  input: BingSearchScraperInput
): Promise<ScrapedContentResult> {
  try {
    const result = await callApifyViaEdgeFunction(BING_SEARCH_SCRAPER_ACTOR, input, 'runs');
    
    const failedIdentifier = typeof input.queries === 'string' ? input.queries : input.queries?.[0] || "Bing Search";
    
    if (result?.data?.id) {
      toast.info("Bing search initiated successfully.");
      return { analyzedText: "Bing search started successfully. Results will be available in your Apify dashboard.", failedUrl: null };
    } else {
      console.error(`Unexpected response format from Apify for Bing search:`, result);
      toast.error(`Apify returned an unexpected format for Bing search.`);
      return { analyzedText: "", failedUrl: failedIdentifier, error: "Unexpected response format from Apify."};
    }
  } catch (error) {
    const failedIdentifier = typeof input.queries === 'string' ? input.queries : input.queries?.[0] || "Bing Search";
    console.error(`Error during Apify Bing search:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify Bing search.";
    toast.error(`Error with Bing search: ${errorMessage}`);
    return { analyzedText: "", failedUrl: failedIdentifier, error: errorMessage };
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

// --- Functions for lukaskrivka/article-extractor-smart ---

function formatArticleExtractorSmartOutput(items: any[]): string {
  if (!items || items.length === 0 || !items[0]) {
    return "No article content was extracted.";
  }
  const article = items[0]; // Expecting a single article object in the array
  
  let formattedText = "The following is an extracted article:\n\n";
  formattedText += "--- Start of Extracted Article ---\n\n";

  formattedText += `## Title: ${article.title || (article.url ? `Article from ${article.url}` : 'No Title Provided')}\n\n`;

  if (article.text) {
    formattedText += `**Full Text:**\n${article.text}\n\n`;
  } else if (article.markdown) {
    formattedText += `**Full Text (Markdown):**\n${article.markdown}\n\n`;
  } else {
    formattedText += "No main text or markdown content found in the extracted article.\n\n";
  }

  if (article.author) {
    formattedText += `**Author(s):** ${article.author}\n`;
  }
  if (article.date) {
    // Attempt to parse date for better formatting, fallback to original if invalid
    const dateObject = new Date(article.date);
    if (!isNaN(dateObject.getTime())) {
      formattedText += `**Publication Date:** ${dateObject.toUTCString()}\n`;
    } else {
      formattedText += `**Publication Date:** ${article.date}\n`;
    }
  }
  if (article.publisher) {
    formattedText += `**Publisher:** ${article.publisher}\n`;
  }
  
  // Example of adding other potentially useful metadata
  if (article.description) {
    formattedText += `**Description:** ${article.description}\n`;
  }
  if (article.keywords && Array.isArray(article.keywords) && article.keywords.length > 0) {
    formattedText += `**Keywords:** ${article.keywords.join(', ')}\n`;
  }
   if (article.url) {
    formattedText += `**Source URL:** ${article.url}\n`;
  }

  formattedText += "\n--- End of Extracted Article ---\n";
  return formattedText;
}

export async function extractArticleWithApify(
  input: ArticleExtractorSmartInput
): Promise<ScrapedContentResult> {
  const finalProxyConfig = input.proxyConfiguration === undefined 
    ? { useApifyProxy: true } 
    : input.proxyConfiguration;

  const actorInput = {
    ...input,
    proxyConfiguration: finalProxyConfig,
  };

  const url = input.startUrls?.[0]?.url || "Unknown URL";

  try {
    const result = await callApifyViaEdgeFunction(ARTICLE_EXTRACTOR_SMART_ACTOR, actorInput, 'runs');
    
    if (result?.data?.id) {
      toast.info("Article extraction initiated successfully.");
      return { analyzedText: "Article extraction started successfully. Results will be available in your Apify dashboard.", failedUrl: null };
    } else {
      console.error(`Unexpected response format from Apify for ${url}:`, result);
      toast.error(`Apify returned an unexpected format for ${url}.`);
      return { analyzedText: "", failedUrl: url, error: "Unexpected response format from Apify."};
    }
  } catch (error) {
    console.error(`Error during Apify article extraction for ${url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify article extraction.";
    toast.error(`Error extracting article from ${url}: ${errorMessage}`);
    return { analyzedText: "", failedUrl: url, error: errorMessage };
  }
}
