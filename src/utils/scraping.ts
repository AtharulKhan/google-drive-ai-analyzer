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

  for (const url of urls) {
    let outputForUrl = `### Content from URL: ${url}\n\n`;

    try {
      const response = await fetch(url);

      if (response.ok) {
        const html = await response.text();

        // 1. Extract Page Title
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : "";
        if (title) {
          outputForUrl += `Page Title: ${title}\n`;
        }

        // 2. Extract Meta Description
        const metaDescriptionMatch = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["'][^>]*>/i);
        const metaDescription = metaDescriptionMatch ? cleanText(metaDescriptionMatch[1]) : "";
        if (metaDescription) {
          outputForUrl += `Meta Description: ${metaDescription}\n`;
        }
        
        if (title || metaDescription) {
            outputForUrl += "\n"; // Add a newline if we had a title or description
        }

        // 3. Isolate Main Content Block
        let mainContentHtml = "";
        const mainMatch = html.match(/<main[\s\S]*?<\/main>/i);
        if (mainMatch) {
          mainContentHtml = mainMatch[0];
        } else {
          const articleMatch = html.match(/<article[\s\S]*?<\/article>/i);
          if (articleMatch) {
            mainContentHtml = articleMatch[0];
          } else {
            const bodyMatch = html.match(/<body[\s\S]*?<\/body>/i);
            if (bodyMatch) {
              mainContentHtml = bodyMatch[0];
            } else {
              mainContentHtml = html; // Fallback to full HTML
            }
          }
        }
        
        // 4. Clean Main Content Block (Iterative Refinement)
        let cleanedContentBlock = mainContentHtml;
        cleanedContentBlock = cleanedContentBlock.replace(/<header[\s\S]*?<\/header>/gi, '');
        cleanedContentBlock = cleanedContentBlock.replace(/<nav[\s\S]*?<\/nav>/gi, '');
        cleanedContentBlock = cleanedContentBlock.replace(/<footer[\s\S]*?<\/footer>/gi, '');
        cleanedContentBlock = cleanedContentBlock.replace(/<script[\s\S]*?<\/script>/gi, '');
        cleanedContentBlock = cleanedContentBlock.replace(/<style[\s\S]*?<\/style>/gi, '');
        cleanedContentBlock = cleanedContentBlock.replace(/<!--[\s\S]*?-->/g, '');
        // Remove aside sections as they are often sidebars/less relevant
        cleanedContentBlock = cleanedContentBlock.replace(/<aside[\s\S]*?<\/aside>/gi, '');


        // 5. Extract Headings (from the cleaned main content block)
        const h1Match = cleanedContentBlock.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
        const h1Text = h1Match ? cleanText(h1Match[1]) : "";
        if (h1Text) {
          outputForUrl += `H1: ${h1Text}\n\n`;
        }

        const h2Matches = Array.from(cleanedContentBlock.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi));
        const h2Texts = h2Matches.map(match => cleanText(match[1])).filter(text => text);
        if (h2Texts.length > 0) {
          outputForUrl += "H2 Headings:\n";
          h2Texts.forEach(h => outputForUrl += `- ${h}\n`);
          outputForUrl += "\n";
        }

        const h3Matches = Array.from(cleanedContentBlock.matchAll(/<h3[^>]*>([\s\S]*?)<\/h3>/gi));
        const h3Texts = h3Matches.map(match => cleanText(match[1])).filter(text => text);
        if (h3Texts.length > 0) {
          outputForUrl += "H3 Headings:\n";
          h3Texts.forEach(h => outputForUrl += `- ${h}\n`);
          outputForUrl += "\n";
        }

        // 6. Process Final Body Content
        let processedBodyText = cleanText(cleanedContentBlock); // Apply cleanText to the already refined block
        if (processedBodyText.length > MAX_CONTENT_LENGTH) {
          processedBodyText = processedBodyText.substring(0, MAX_CONTENT_LENGTH) + "... (truncated)";
        }
        outputForUrl += `Main Content:\n${processedBodyText}\n\n`;

      } else {
        console.error(`Failed to scrape ${url}: HTTP status ${response.status}`);
        failedUrls.push(url);
        outputForUrl += `(Failed to scrape: HTTP status ${response.status})\n\n`;
      }
    } catch (error) {
      console.error(`Failed to scrape ${url}: `, error);
      failedUrls.push(url);
      outputForUrl += `(Failed to scrape: ${error instanceof Error ? error.message : "Unknown error"})\n\n`;
    }
    combinedText += outputForUrl;
  }

  return { combinedText, failedUrls };
}
