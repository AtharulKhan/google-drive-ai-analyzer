
import { toast } from 'sonner';

// Using the website-content-crawler actor ID instead of page-analyzer
const ACTOR_NAME_OR_ID = 'apify~website-content-crawler';

interface ApifyActorInput {
  startUrls: Array<{ url: string }>;
  useSitemaps?: boolean;
  respectRobotsTxtFile?: boolean;
  crawlerType?: string;
  saveMarkdown?: boolean;
  maxResults?: number;
  maxCrawlPages?: number;
  proxyConfiguration?: {
    useApifyProxy?: boolean;
  };
  // Additional options can be added as needed
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

export async function analyzeUrlWithApify(url: string, keywords: string[] = []): Promise<ScrapedContentResult> {
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    return { analyzedText: "", failedUrl: url, error: "Apify API Token not set." };
  }

  // Build the API URL for website-content-crawler
  const apiUrl = `https://api.apify.com/v2/acts/${ACTOR_NAME_OR_ID}/run-sync-get-dataset-items?token=${apifyToken}`;

  // Prepare the input according to website-content-crawler schema
  const input: ApifyActorInput = {
    startUrls: [{ url }],
    useSitemaps: false,
    respectRobotsTxtFile: true,
    crawlerType: "playwright:firefox", // Using firefox as default browser
    saveMarkdown: true,
    maxResults: 50, // Limit results to avoid excessive processing
    maxCrawlPages: 100, // Limit crawl pages 
    proxyConfiguration: { 
      useApifyProxy: true 
    }
  };

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
export async function analyzeMultipleUrlsWithApify(urls: string[]): Promise<{ combinedAnalyzedText: string; failedUrls: string[] }> {
  let combinedAnalyzedText = "";
  const failedUrls: string[] = [];

  // For multiple URLs, we'll process them sequentially to avoid overwhelming the API
  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const result = await analyzeUrlWithApify(url);
    
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
