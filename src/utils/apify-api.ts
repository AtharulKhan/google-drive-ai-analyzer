import { toast } from 'sonner';

const ACTOR_NAME_OR_ID = 'apify~page-analyzer'; // Or mJuwidcY8PejY3QKp

interface ApifyActorInput {
  url: string;
  keywords?: string[]; // Optional keywords as per Page Analyzer actor
  proxyConfig?: {
    useApifyProxy?: boolean;
    // Add other proxy options if needed
  };
}

interface ApifyDatasetItem {
  type: string;
  data: any;
  // ... other potential fields from the actor's output
}

export interface ScrapedContentResult {
  analyzedText: string; 
  failedUrl: string | null;
  error?: string;
}

function formatDatasetItemsToText(items: ApifyDatasetItem[]): string {
  if (!items || items.length === 0) {
    return "No structured data found in the analysis.";
  }

  let formattedText = "Page Analysis Report:\n\n";

  items.forEach(item => {
    formattedText += `## Type: ${item.type}\n`;
    if (item.data) {
      Object.entries(item.data).forEach(([key, value]) => {
        formattedText += `  - ${key}: ${JSON.stringify(value)}\n`;
      });
    }
    formattedText += "\n";
  });

  return formattedText;
}

export async function analyzeUrlWithApify(url: string, keywords: string[] = []): Promise<ScrapedContentResult> {
  const apifyToken = localStorage.getItem('apifyApiToken');

  if (!apifyToken) {
    toast.error("Apify API Token not found. Please set it in Settings.");
    return { analyzedText: "", failedUrl: url, error: "Apify API Token not set." };
  }

  const apiUrl = `https://api.apify.com/v2/acts/${ACTOR_NAME_OR_ID}/run-sync-get-dataset-items?token=${apifyToken}`;

  const input: ApifyActorInput = {
    url: url,
    keywords: keywords.length > 0 ? keywords : undefined, // Only include if keywords are provided
    proxyConfig: { useApifyProxy: true } // Default to using Apify proxy
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

    const datasetItems: ApifyDatasetItem[] = await response.json();
    
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

// Function to analyze multiple URLs (sequentially to avoid overwhelming API or if needed)
export async function analyzeMultipleUrlsWithApify(urls: string[], keywordsPerUrl?: string[][]): Promise<{ combinedAnalyzedText: string; failedUrls: string[] }> {
  let combinedAnalyzedText = "";
  const failedUrls: string[] = [];

  for (let i = 0; i < urls.length; i++) {
    const url = urls[i];
    const keywords = keywordsPerUrl && keywordsPerUrl[i] ? keywordsPerUrl[i] : [];
    const result = await analyzeUrlWithApify(url, keywords);
    
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
