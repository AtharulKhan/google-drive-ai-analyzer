export interface ScrapedContentResult {
  combinedText: string;
  failedUrls: string[];
}

export async function scrapeUrls(urls: string[]): Promise<ScrapedContentResult> {
  let combinedText = "";
  const failedUrls: string[] = [];

  for (const url of urls) {
    try {
      const response = await fetch(url);

      if (response.ok) {
        const htmlContent = await response.text();

        // Basic HTML stripping
        let strippedText = htmlContent.replace(/<[^>]*>/g, '');

        // Remove excess whitespace
        strippedText = strippedText.replace(/\s\s+/g, ' ').trim();

        // Prepend header and append to combinedText
        const header = `### Content from URL: ${url}\n\n`;
        combinedText += header + strippedText + "\n\n";
      } else {
        // Non-ok response (e.g., 404, 500)
        console.error(`Failed to scrape ${url}: HTTP status ${response.status}`);
        failedUrls.push(url);
      }
    } catch (error) {
      // Network errors or other issues during fetch/processing
      console.error(`Failed to scrape ${url}: `, error);
      failedUrls.push(url);
    }
  }

  return { combinedText, failedUrls };
}
