import { toast } from 'sonner';

// Using the website-content-crawler actor ID
const WEBSITE_CONTENT_CRAWLER_ACTOR = 'apify~website-content-crawler';
const ARTICLE_EXTRACTOR_SMART_ACTOR = 'lukaskrivka/article-extractor-smart';
const BING_SEARCH_SCRAPER_ACTOR = 'tri_angle/bing-search-scraper';
const RSS_XML_SCRAPER_ACTOR = 'jupri/rss-xml-scraper';

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
  url: string;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
  // Add other specific options for article-extractor-smart if needed
}

// Interface for tri_angle/bing-search-scraper input
export interface BingSearchScraperInput {
  searchqueries: string | string[]; // Can be a single query or an array of queries
  keywords?: string[]; // Deprecated, use searchqueries instead
  country?: string; // e.g., "US", "GB", "DE"
  maxdepth?: number; // Max number of pages to scrape
  numresults?: number; // Number of results per page
  timerange?: string; // e.g., "Last 24 hours", "Last week", "Last month", "Last year"
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
  // Add other specific options for bing-search-scraper if needed
}

// Interface for jupri/rss-xml-scraper input
export interface RssXmlScraperInput {
  rssUrls: string[];
  xmlUrls?: string[]; // Optional, if you have direct XML feed URLs
  maxItems?: number; // Max number of items to scrape from each feed
  // Add other specific options for rss-xml-scraper if needed
}

interface ScrapedContentResult {
  analyzedText: string; 
  failedUrl: string | null;
  error?: string;
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
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    return { analyzedText: "", failedUrl: url, error: "Apify API Token not set." };
  }

  // Build the API URL for website-content-crawler
  const apiUrl = `https://api.apify.com/v2/acts/${WEBSITE_CONTENT_CRAWLER_ACTOR}/run-sync-get-dataset-items?token=${apifyToken}`;

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
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    // Use the first RSS URL as the identifier for failure, or a generic message.
    const failedIdentifier = input.rssUrls?.[0] || input.xmlUrls?.[0] || "RSS/XML Feed";
    return { analyzedText: "", failedUrl: failedIdentifier, error: "Apify API Token not set." };
  }

  const apiUrl = `https://api.apify.com/v2/acts/${RSS_XML_SCRAPER_ACTOR}/run-sync-get-dataset-items?token=${apifyToken}`;

  // This actor does not typically need proxy for RSS feeds, so we don't set it by default.
  // User can add it via RssXmlScraperInput if a specific feed requires it.
  const actorInput = { ...input };

  console.log(`Scraping RSS/XML feed with Apify with input:`, actorInput);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actorInput),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error ${response.status}`;
      const failedIdentifier = input.rssUrls?.[0] || input.xmlUrls?.[0] || "RSS/XML Feed";
      console.error(`RSS/XML feed scraping failed with Apify:`, errorMessage, errorData);
      toast.error(`Apify RSS/XML feed scraping failed: ${errorMessage}`);
      return { analyzedText: "", failedUrl: failedIdentifier, error: errorMessage };
    }

    const datasetItems = await response.json();

    if (!Array.isArray(datasetItems)) {
      const failedIdentifier = input.rssUrls?.[0] || input.xmlUrls?.[0] || "RSS/XML Feed";
      console.error(`Unexpected response format from Apify for RSS/XML feed:`, datasetItems);
      toast.error(`Apify returned an unexpected format for RSS/XML feed.`);
      return { analyzedText: "", failedUrl: failedIdentifier, error: "Unexpected response format from Apify."};
    }
    
    console.log(`Received data from Apify for RSS/XML feed.`);
    
    const analyzedText = formatRssXmlScraperOutput(datasetItems);
    // `failedUrl` is null if API call succeeded. Errors for specific feeds might be in data.
    return { analyzedText, failedUrl: null };

  } catch (error) {
    const failedIdentifier = input.rssUrls?.[0] || input.xmlUrls?.[0] || "RSS/XML Feed";
    console.error(`Error during Apify RSS/XML feed scraping:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify RSS/XML feed scraping.";
    toast.error(`Error with Apify RSS/XML feed scraping: ${errorMessage}`);
    return { analyzedText: "", failedUrl: failedIdentifier, error: errorMessage };
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
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    // Bing scraper doesn't have a single "failedUrl" concept like URL crawlers, 
    // so we pass the first search query or a generic message.
    const failedIdentifier = typeof input.searchqueries === 'string' ? input.searchqueries : input.searchqueries?.[0] || "Bing Search";
    return { analyzedText: "", failedUrl: failedIdentifier, error: "Apify API Token not set." };
  }

  const apiUrl = `https://api.apify.com/v2/acts/${BING_SEARCH_SCRAPER_ACTOR}/run-sync-get-dataset-items?token=${apifyToken}`;
  
  const actorInput = {
    ...input,
    proxyConfiguration: input.proxyConfiguration || { useApifyProxy: true },
  };

  console.log(`Searching with Bing Scraper using Apify with input:`, actorInput);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actorInput),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error ${response.status}`;
      const failedIdentifier = typeof input.searchqueries === 'string' ? input.searchqueries : input.searchqueries?.[0] || "Bing Search";
      console.error(`Bing search failed with Apify:`, errorMessage, errorData);
      toast.error(`Apify Bing search failed: ${errorMessage}`);
      return { analyzedText: "", failedUrl: failedIdentifier, error: errorMessage };
    }

    const datasetItems = await response.json();

    if (!Array.isArray(datasetItems)) {
      const failedIdentifier = typeof input.searchqueries === 'string' ? input.searchqueries : input.searchqueries?.[0] || "Bing Search";
      console.error(`Unexpected response format from Apify for Bing search:`, datasetItems);
      toast.error(`Apify returned an unexpected format for Bing search.`);
      return { analyzedText: "", failedUrl: failedIdentifier, error: "Unexpected response format from Apify."};
    }
    
    console.log(`Received data from Apify for Bing search.`);
    
    const analyzedText = formatBingSearchScraperOutput(datasetItems);
    // For Bing search, `failedUrl` is null if the API call itself succeeded,
    // individual query errors are handled within the formatted text.
    return { analyzedText, failedUrl: null };

  } catch (error) {
    const failedIdentifier = typeof input.searchqueries === 'string' ? input.searchqueries : input.searchqueries?.[0] || "Bing Search";
    console.error(`Error during Apify Bing search:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify Bing search.";
    toast.error(`Error with Apify Bing search: ${errorMessage}`);
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
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    return { analyzedText: "", failedUrl: input.url, error: "Apify API Token not set." };
  }

  const apiUrl = `https://api.apify.com/v2/acts/${ARTICLE_EXTRACTOR_SMART_ACTOR}/run-sync-get-dataset-items?token=${apifyToken}`;

  // Ensure proxy is enabled by default if not specified
  const actorInput = {
    ...input,
    proxyConfiguration: input.proxyConfiguration || { useApifyProxy: true },
  };

  console.log(`Extracting article with Apify for URL: ${input.url} with input:`, actorInput);

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(actorInput),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      const errorMessage = errorData?.error?.message || errorData?.message || `HTTP error ${response.status}`;
      console.error(`Failed to extract article from ${input.url} with Apify:`, errorMessage, errorData);
      toast.error(`Apify article extraction failed for ${input.url}: ${errorMessage}`);
      return { analyzedText: "", failedUrl: input.url, error: errorMessage };
    }

    const datasetItems = await response.json();

    if (!Array.isArray(datasetItems)) {
      console.error(`Unexpected response format from Apify for ${input.url}:`, datasetItems);
      toast.error(`Apify returned an unexpected format for ${input.url}.`);
      return { analyzedText: "", failedUrl: input.url, error: "Unexpected response format from Apify."};
    }
    
    console.log(`Received data from Apify for article: ${input.url}`);
    
    const analyzedText = formatArticleExtractorSmartOutput(datasetItems);
    return { analyzedText, failedUrl: null };

  } catch (error) {
    console.error(`Error during Apify article extraction for ${input.url}:`, error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error during Apify article extraction.";
    toast.error(`Error extracting article from ${input.url} with Apify: ${errorMessage}`);
    return { analyzedText: "", failedUrl: input.url, error: errorMessage };
  }
}
