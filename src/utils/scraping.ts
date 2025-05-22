
export interface ScrapedContentResult {
  combinedText: string;
  failedUrls: string[];
}

const MAX_CONTENT_LENGTH = 50000; // Max characters for the main content of a single URL

function cleanText(htmlFragment: string | null | undefined): string {
  if (!htmlFragment) return "";
  return htmlFragment
    .replace(/<[^>]+>/g, ' ') // Strip tags by replacing them with a space
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s\s+/g, ' ') // Normalize multiple whitespace characters to a single space
    .trim();
}

export async function scrapeUrls(urls: string[]): Promise<ScrapedContentResult> {
  let combinedText = "";
  const failedUrls: string[] = [];

  // Message explaining CORS limitations
  combinedText = "## Web Scraping Limitations\n\n";
  combinedText += "Direct web scraping from browsers is limited due to CORS security policies. ";
  combinedText += "Most websites block direct access from other domains for security reasons.\n\n";
  combinedText += "**Attempted URLs:**\n\n";
  
  urls.forEach(url => {
    combinedText += `- ${url}\n`;
  });
  
  combinedText += "\n## Alternative Approaches:\n\n";
  combinedText += "1. **Directly paste content** from these websites into the text input area\n";
  combinedText += "2. **Use Google Docs** to store web content and then analyze through Google Drive integration\n";
  combinedText += "3. **For production environments:** Set up a server-side proxy to handle these requests\n\n";

  // Try using the fetch API directly for informational purposes
  // but we know it will likely fail due to CORS
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
      
      const response = await fetch(url, { 
        signal: controller.signal,
        mode: 'cors', // Try with CORS mode
        headers: {
          'Accept': 'text/html',
          'User-Agent': 'Mozilla/5.0 (compatible; WebAppScraper/1.0)'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (response.ok) {
        const html = await response.text();
        combinedText += `\n### Content successfully retrieved from: ${url}\n\n`;
        
        // Extract basic information from the HTML
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : "";
        if (title) {
          combinedText += `Page Title: ${title}\n\n`;
        }
        
        // Add a small preview (limited to avoid overwhelming the UI)
        const textPreview = cleanText(html).substring(0, 500);
        combinedText += `Content Preview: ${textPreview}...\n\n`;
        
      } else {
        failedUrls.push(url);
        combinedText += `\n### Failed to access: ${url}\n`;
        combinedText += `HTTP Status: ${response.status} ${response.statusText}\n\n`;
      }
    } catch (error) {
      console.error(`Failed to scrape ${url}: `, error);
      failedUrls.push(url);
      
      // Provide more specific error messaging
      if (error instanceof TypeError && error.message.includes('NetworkError')) {
        combinedText += `\n### Failed to access: ${url}\n`;
        combinedText += `Error: CORS policy blocked access. This is expected behavior for most websites.\n\n`;
      } else if (error.name === 'AbortError') {
        combinedText += `\n### Failed to access: ${url}\n`;
        combinedText += `Error: Request timed out after 5 seconds.\n\n`;
      } else {
        combinedText += `\n### Failed to access: ${url}\n`;
        combinedText += `Error: ${error instanceof Error ? error.message : "Unknown error"}\n\n`;
      }
    }
  }

  return { combinedText, failedUrls };
}
