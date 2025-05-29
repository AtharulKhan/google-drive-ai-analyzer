// Import formatters
import {
  formatArticleExtractorSmartOutput,
  formatBingSearchScraperOutput,
  formatRssXmlScraperOutput,
  formatDatasetItemsToText,
} from './apify-api';

// Import main functions to be tested
import {
  extractArticleWithApify,
  searchWithBingScraper,
  scrapeRssFeedWithApify,
  analyzeUrlWithApify,
  analyzeMultipleUrlsWithApify,
  ArticleExtractorSmartInput,
  BingSearchScraperInput,
  RssXmlScraperInput,
  ApifyCrawlingOptions,
} from './apify-api';

// Mock toast notifications
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
  },
}));

// --- Mocks Setup ---
let mockLocalStorage: Record<string, string> = {};

beforeAll(() => {
  // Mock localStorage
  global.Storage.prototype.getItem = jest.fn((key) => mockLocalStorage[key] || null);
  global.Storage.prototype.setItem = jest.fn((key, value) => {
    mockLocalStorage[key] = value;
  });
  global.Storage.prototype.removeItem = jest.fn((key) => {
    delete mockLocalStorage[key];
  });
  global.Storage.prototype.clear = jest.fn(() => {
    mockLocalStorage = {};
  });
});

beforeEach(() => {
  // Reset mocks before each test
  mockLocalStorage = {}; // Clear localStorage
  jest.clearAllMocks(); // Clear all jest mocks, including fetch and toast
  global.fetch = jest.fn() as jest.Mock; // Reset fetch mock
});
// --- End Mocks Setup ---

describe('Apify API Formatters', () => {
  // ... existing formatter tests ...
  describe('formatArticleExtractorSmartOutput', () => {
    it('should format a typical article correctly', () => {
      const items = [{
        title: 'Test Article Title',
        text: 'This is the article text.',
        author: 'John Doe',
        date: '2023-01-15T12:00:00.000Z',
        publisher: 'Test Publisher',
        url: 'https://example.com/article',
        description: 'A test article description.',
        keywords: ['test', 'article'],
      }];
      const expectedOutput = 
`The following is an extracted article:

--- Start of Extracted Article ---

## Title: Test Article Title

**Full Text:**
This is the article text.

**Author(s):** John Doe
**Publication Date:** Sun, 15 Jan 2023 12:00:00 GMT
**Publisher:** Test Publisher
**Description:** A test article description.
**Keywords:** test, article
**Source URL:** https://example.com/article

--- End of Extracted Article ---
`;
      expect(formatArticleExtractorSmartOutput(items)).toBe(expectedOutput);
    });

    it('should handle missing optional fields gracefully', () => {
      const items = [{
        title: 'Minimal Article',
        text: 'Minimal text.',
        url: 'https://example.com/minimal'
      }];
      const expectedOutput =
`The following is an extracted article:

--- Start of Extracted Article ---

## Title: Minimal Article

**Full Text:**
Minimal text.

**Source URL:** https://example.com/minimal

--- End of Extracted Article ---
`;
      expect(formatArticleExtractorSmartOutput(items)).toBe(expectedOutput);
    });

    it('should use URL in title if title is missing', () => {
        const items = [{
          url: 'https://example.com/untitled-article',
          text: 'Some text here.',
        }];
        const expectedOutput =
  `The following is an extracted article:

--- Start of Extracted Article ---

## Title: Article from https://example.com/untitled-article

**Full Text:**
Some text here.

**Source URL:** https://example.com/untitled-article

--- End of Extracted Article ---
`;
        expect(formatArticleExtractorSmartOutput(items)).toBe(expectedOutput);
      });

    it('should return "No article content was extracted." for empty items array', () => {
      expect(formatArticleExtractorSmartOutput([])).toBe('No article content was extracted.');
    });

    it('should return "No article content was extracted." for null items', () => {
      expect(formatArticleExtractorSmartOutput(null as any)).toBe('No article content was extracted.');
    });

    it('should handle item with no text or markdown', () => {
        const items = [{ title: 'Title Only', url: 'https://example.com/title-only' }];
        const expectedOutput =
`The following is an extracted article:

--- Start of Extracted Article ---

## Title: Title Only

No main text or markdown content found in the extracted article.

**Source URL:** https://example.com/title-only

--- End of Extracted Article ---
`;
        expect(formatArticleExtractorSmartOutput(items)).toBe(expectedOutput);
    });

    it('should correctly format date if parsable, otherwise use original string', () => {
        const itemsWithValidDate = [{ title: 'Valid Date Article', text: 'text', date: '2024/03/10' }];
        const itemsWithInvalidDate = [{ title: 'Invalid Date Article', text: 'text', date: 'Not a date' }];
        
        const outputValid = formatArticleExtractorSmartOutput(itemsWithValidDate);
        // Date parsing can be tricky across environments, let's check if it includes the formatted date part
        expect(outputValid).toContain('**Publication Date:** Sun, 10 Mar 2024 00:00:00 GMT');

        const outputInvalid = formatArticleExtractorSmartOutput(itemsWithInvalidDate);
        expect(outputInvalid).toContain('**Publication Date:** Not a date');
    });
  });

  describe('formatBingSearchScraperOutput', () => {
    it('should format typical Bing search results with multiple queries', () => {
      const items = [
        { 
          query: 'test query 1', 
          results: [
            { title: 'Result 1.1', url: 'https://example.com/1-1', snippet: 'Snippet for 1.1' },
            { title: 'Result 1.2', url: 'https://example.com/1-2', displayedUrl: 'example.com/1-2', snippet: 'Snippet for 1.2' },
          ]
        },
        { 
          query: 'test query 2', 
          results: [
            { title: 'Result 2.1', url: 'https://example.com/2-1', snippet: 'Snippet for 2.1' },
          ]
        },
      ];
      const expectedOutput =
`The following are Bing search results:

--- Start of Bing Search Results ---

## Results for query: "test query 1"

### 1. Result 1.1
**Link:** https://example.com/1-1
**Snippet:**
Snippet for 1.1

### 2. Result 1.2
**Link:** https://example.com/1-2
**Displayed URL:** example.com/1-2
**Snippet:**
Snippet for 1.2

---

## Results for query: "test query 2"

### 1. Result 2.1
**Link:** https://example.com/2-1
**Snippet:**
Snippet for 2.1

--- End of Bing Search Results ---
`;
      expect(formatBingSearchScraperOutput(items)).toBe(expectedOutput.trim()); // Use trim for trailing newlines in expected string.
    });

    it('should handle a single batch without a query field if only one batch exists', () => {
        const items = [
            { 
              results: [{ title: 'Result 1', url: 'https://example.com/1', snippet: 'Snippet 1' }]
            }
        ];
        // Expect no "## Result Batch 1" or "## Results for query:..." if only one batch and no query
        const output = formatBingSearchScraperOutput(items);
        expect(output).toContain("### 1. Result 1");
        expect(output).not.toContain("## Result Batch");
        expect(output).not.toContain("## Results for query:");
    });
    
    it('should handle query from queryContext if itemBatch.query is missing', () => {
        const items = [
          { 
            results: [
              { title: 'Result 1.1', url: 'https://example.com/1-1', snippet: 'Snippet for 1.1', queryContext: { originalQuery: 'context query' } },
            ]
          }
        ];
        const expectedPartial = `## Results for query: "context query"`;
        expect(formatBingSearchScraperOutput(items)).toContain(expectedPartial);
      });

    it('should handle error within a batch', () => {
      const items = [
        { query: 'good query', results: [{ title: 'Good Result', url: 'https://good.com', snippet: 'Good snippet' }] },
        { query: 'bad query', error: 'This query failed spectacularly' },
      ];
      const output = formatBingSearchScraperOutput(items);
      expect(output).toContain('## Results for query: "good query"');
      expect(output).toContain('### 1. Good Result');
      expect(output).toContain('## Results for query: "bad query"');
      expect(output).toContain('**Error for this query/batch:** This query failed spectacularly');
    });

    it('should handle empty results for a query', () => {
      const items = [{ query: 'empty query', results: [] }];
      const output = formatBingSearchScraperOutput(items);
      expect(output).toContain('## Results for query: "empty query"');
      expect(output).toContain('No results found for this query/batch.');
    });

    it('should return "No Bing search results were found." for empty items array', () => {
      expect(formatBingSearchScraperOutput([])).toBe('No Bing search results were found.');
    });

    it('should return "No Bing search results were found." for null items', () => {
      expect(formatBingSearchScraperOutput(null as any)).toBe('No Bing search results were found.');
    });

    it('should handle missing optional fields in results', () => {
        const items = [
          { 
            query: 'missing fields query', 
            results: [
              { title: 'Only Title' },
              { url: 'https://onlyurl.com' },
              { snippet: 'Only Snippet' }
            ]
          }
        ];
        const output = formatBingSearchScraperOutput(items);
        expect(output).toContain('### 1. Only Title');
        expect(output).toContain('No Title Provided'); // For the second and third items
        expect(output).toContain('**Link:** https://onlyurl.com');
        expect(output).toContain('**Snippet:**\nOnly Snippet');
      });
  });

  describe('formatRssXmlScraperOutput', () => {
    it('should format RSS items from multiple feeds correctly', () => {
      const items = [
        { 
          feedInfo: { title: 'Feed 1 Title', link: 'https://feed1.com', description: 'Feed 1 Desc' },
          title: 'Item 1.1', link: 'https://feed1.com/item1', pubDate: '2023-01-01T00:00:00.000Z', creator: 'Author 1', contentSnippet: 'Snippet 1.1', categories: ['cat1', 'cat2']
        },
        { 
          feedInfo: { title: 'Feed 1 Title', link: 'https://feed1.com', description: 'Feed 1 Desc' },
          title: 'Item 1.2', link: 'https://feed1.com/item2', content: '<p>Content 1.2</p>', 
        },
        { 
          feedInfo: { title: 'Feed 2 Title', link: 'https://feed2.com' },
          title: 'Item 2.1', link: 'https://feed2.com/item1', pubDate: '2023-01-02T12:00:00.000Z'
        },
      ];
      const expectedOutput =
`The following are items from RSS/XML feeds:

--- Start of RSS/XML Feed Items ---

## Feed: Feed 1 Title
**Source URL:** https://feed1.com
**Feed Description:** Feed 1 Desc

### 1. Item 1.1
**Item Link:** https://feed1.com/item1
**Published:** Sun, 01 Jan 2023 00:00:00 GMT
**Author/Creator:** Author 1
**Snippet:**
Snippet 1.1
**Categories:** cat1, cat2

### 2. Item 1.2
**Item Link:** https://feed1.com/item2
**Content Extract:**
Content 1.2

## Feed: Feed 2 Title
**Source URL:** https://feed2.com

### 3. Item 2.1
**Item Link:** https://feed2.com/item1
**Published:** Mon, 02 Jan 2023 12:00:00 GMT

--- End of RSS/XML Feed Items ---
`;
      expect(formatRssXmlScraperOutput(items)).toBe(expectedOutput.trim());
    });

    it('should handle items with missing optional fields gracefully', () => {
      const items = [
        { title: 'Minimal Item 1', link: 'https://minimal.com/1' },
        { feedInfo: { title: 'Minimal Feed' }, title: 'Minimal Item 2' }
      ];
      const output = formatRssXmlScraperOutput(items);
      expect(output).toContain('### 1. Minimal Item 1');
      expect(output).toContain('**Item Link:** https://minimal.com/1');
      expect(output).toContain('## Feed: Minimal Feed');
      expect(output).toContain('### 2. Minimal Item 2');
      expect(output).not.toContain('**Author/Creator:**');
      expect(output).not.toContain('**Published:**');
    });
    
    it('should use "No Title Provided" if title is missing', () => {
        const items = [{ link: 'https://notitle.com/item' }];
        expect(formatRssXmlScraperOutput(items)).toContain('No Title Provided');
    });

    it('should use content and strip HTML if contentSnippet is missing', () => {
      const items = [{ title: 'Content Item', content: '<p>This is <b>bold</b> content.</p> Check out <a href="#">this link</a>.' }];
      const output = formatRssXmlScraperOutput(items);
      expect(output).toContain('**Content Extract:**\nThis is bold content. Check out this link.');
    });
    
    it('should truncate long content (from item.content) to 300 characters', () => {
        const longContent = '<p>This is a very long piece of content '.repeat(20) + 'end.</p>';
        const items = [{ title: 'Long Content Item', content: longContent }];
        const output = formatRssXmlScraperOutput(items);
        const expectedSnippetPrefix = 'This is a very long piece of content '.repeat(10).substring(0, 300 - "...".length);
        // Check if the snippet starts correctly and ends with "..."
        expect(output).toContain(`**Content Extract:**\n${expectedSnippetPrefix}`);
        expect(output).toContain('...'); 
        // Ensure the full long string isn't there (accounting for HTML stripping)
        expect(formatRssXmlScraperOutput(items).length).toBeLessThan(longContent.length /2); // Crude check
    });

    it('should return "No RSS/XML feed items were found." for empty items array', () => {
      expect(formatRssXmlScraperOutput([])).toBe('No RSS/XML feed items were found.');
    });

    it('should return "No RSS/XML feed items were found." for null items', () => {
      expect(formatRssXmlScraperOutput(null as any)).toBe('No RSS/XML feed items were found.');
    });
  });

  describe('formatDatasetItemsToText', () => {
    it('should format multiple pages correctly', () => {
      const items = [
        { url: 'https://example.com/page1', title: 'Page 1 Title', markdown: 'Markdown content for page 1.' },
        { url: 'https://example.com/page2', title: 'Page 2 Title', text: 'Text content for page 2.' },
      ];
      const expectedOutput =
`The following text contains crawled content from one or more web pages:

--- Start of Website Content Analysis ---

## Page 1: https://example.com/page1

### Title: Page 1 Title

**Content (Markdown):**
Markdown content for page 1.

---

## Page 2: https://example.com/page2

### Title: Page 2 Title

**Content (Text):**
Text content for page 2.

--- End of Website Content Analysis ---
`;
      expect(formatDatasetItemsToText(items)).toBe(expectedOutput.trim());
    });

    it('should handle a single page', () => {
      const items = [
        { url: 'https://example.com/single', title: 'Single Page', markdown: 'Content here.' }
      ];
      const expectedOutput =
`The following text contains crawled content from one or more web pages:

--- Start of Website Content Analysis ---

## Page 1: https://example.com/single

### Title: Single Page

**Content (Markdown):**
Content here.

--- End of Website Content Analysis ---
`;
      expect(formatDatasetItemsToText(items)).toBe(expectedOutput.trim());
    });
    
    it('should handle item with text content when markdown is missing', () => {
        const items = [{ url: 'https://example.com/textonly', text: 'Plain text content.' }];
        const output = formatDatasetItemsToText(items);
        expect(output).toContain('**Content (Text):**\nPlain text content.');
        expect(output).not.toContain('**Content (Markdown):**');
    });

    it('should handle missing title gracefully', () => {
      const items = [{ url: 'https://example.com/no-title', markdown: 'Content.' }];
      const output = formatDatasetItemsToText(items);
      expect(output).toContain('## Page 1: https://example.com/no-title');
      expect(output).not.toContain('### Title:');
    });
    
    it('should handle missing url gracefully', () => {
        const items = [{ title: 'No URL Page', markdown: 'Content.' }];
        const output = formatDatasetItemsToText(items);
        expect(output).toContain('## Page 1: Unknown URL');
        expect(output).toContain('### Title: No URL Page');
      });

    it('should handle page with no textual content', () => {
      const items = [{ url: 'https://example.com/empty-content', title: 'Empty Page' }];
      const output = formatDatasetItemsToText(items);
      expect(output).toContain('No textual content extracted for this page.');
    });

    it('should return "No website content was found or crawled." for empty items array', () => {
      expect(formatDatasetItemsToText([])).toBe('No website content was found or crawled.');
    });

    it('should return "No website content was found or crawled." for null items', () => {
      expect(formatDatasetItemsToText(null as any)).toBe('No website content was found or crawled.');
    });
  });
});

describe('Apify API Callers', () => {
  const MOCK_APIFY_TOKEN = 'test_apify_token';

  describe('extractArticleWithApify', () => {
    const mockInput: ArticleExtractorSmartInput = { url: 'https://example.com/article' };
    const mockDatasetItems = [{ title: 'Test Article', text: 'Content' }];

    it('should call Apify API and return formatted data on success', async () => {
      mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasetItems,
      });

      const result = await extractArticleWithApify(mockInput);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('lukaskrivka/article-extractor-smart/run-sync-get-dataset-items'),
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...mockInput, proxyConfiguration: { useApifyProxy: true } }),
        })
      );
      expect(result.analyzedText).toBe(formatArticleExtractorSmartOutput(mockDatasetItems));
      expect(result.failedUrl).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should return error if Apify token is missing', async () => {
      const result = await extractArticleWithApify(mockInput);
      expect(fetch).not.toHaveBeenCalled();
      expect(result.analyzedText).toBe("");
      expect(result.failedUrl).toBe(mockInput.url);
      expect(result.error).toBe("Apify API Token not set.");
      expect(jest.requireMock('sonner').toast.error).toHaveBeenCalledWith("Apify API Token not found. Please set it in Settings.");
    });

    it('should handle API error response', async () => {
      mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: async () => ({ error: { message: 'Internal Server Error' } }),
      });

      const result = await extractArticleWithApify(mockInput);
      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result.analyzedText).toBe("");
      expect(result.failedUrl).toBe(mockInput.url);
      expect(result.error).toBe('Internal Server Error');
      expect(jest.requireMock('sonner').toast.error).toHaveBeenCalledWith(expect.stringContaining('Apify article extraction failed'));
    });
    
    it('should handle fetch throwing an error', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network failure'));
  
        const result = await extractArticleWithApify(mockInput);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.analyzedText).toBe("");
        expect(result.failedUrl).toBe(mockInput.url);
        expect(result.error).toBe('Network failure');
        expect(jest.requireMock('sonner').toast.error).toHaveBeenCalledWith(expect.stringContaining('Error extracting article from'));
    });

    it('should handle non-array response from API', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'This is not an array' }), // Not an array
        });
  
        const result = await extractArticleWithApify(mockInput);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(result.analyzedText).toBe("");
        expect(result.failedUrl).toBe(mockInput.url);
        expect(result.error).toBe('Unexpected response format from Apify.');
        expect(jest.requireMock('sonner').toast.error).toHaveBeenCalledWith(expect.stringContaining('Apify returned an unexpected format'));
      });
  });

  describe('searchWithBingScraper', () => {
    const mockInput: BingSearchScraperInput = { searchqueries: 'test bing query' };
    const mockDatasetItems = [{ query: 'test bing query', results: [{ title: 'Bing Result', url: 'https://bing.com/result' }] }];

    it('should call Apify API and return formatted data on success', async () => {
      mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasetItems,
      });

      const result = await searchWithBingScraper(mockInput);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('tri_angle/bing-search-scraper/run-sync-get-dataset-items'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ ...mockInput, proxyConfiguration: { useApifyProxy: true } }),
        })
      );
      expect(result.analyzedText).toBe(formatBingSearchScraperOutput(mockDatasetItems));
      expect(result.failedUrl).toBeNull(); // Null because API call itself succeeded
      expect(result.error).toBeUndefined();
    });

    it('should return error if Apify token is missing', async () => {
      const result = await searchWithBingScraper(mockInput);
      const expectedFailedIdentifier = typeof mockInput.searchqueries === 'string' ? mockInput.searchqueries : mockInput.searchqueries[0];
      expect(result.failedUrl).toBe(expectedFailedIdentifier);
      expect(result.error).toBe("Apify API Token not set.");
    });
    
    it('should use the first query as failedUrl if searchqueries is an array and token is missing', async () => {
        const multiQueryInput: BingSearchScraperInput = { searchqueries: ['query1', 'query2'] };
        const result = await searchWithBingScraper(multiQueryInput);
        expect(result.failedUrl).toBe('query1');
    });

    it('should handle API error response', async () => {
      mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ error: { message: 'Bad Request' } }),
      });
      const result = await searchWithBingScraper(mockInput);
      expect(result.error).toBe('Bad Request');
    });
    
    it('should handle non-array response from API', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ message: 'Not an array' }),
        });
        const result = await searchWithBingScraper(mockInput);
        expect(result.error).toBe('Unexpected response format from Apify.');
      });
  });

  describe('scrapeRssFeedWithApify', () => {
    const mockInput: RssXmlScraperInput = { rssUrls: ['https://example.com/feed.xml'] };
    const mockDatasetItems = [{ feedInfo: { title: 'Test Feed' }, title: 'Feed Item 1' }];

    it('should call Apify API and return formatted data on success', async () => {
      mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasetItems,
      });

      const result = await scrapeRssFeedWithApify(mockInput);

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('jupri/rss-xml-scraper/run-sync-get-dataset-items'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(mockInput), // Note: This actor doesn't add default proxy config in the test setup
        })
      );
      expect(result.analyzedText).toBe(formatRssXmlScraperOutput(mockDatasetItems));
      expect(result.failedUrl).toBeNull();
      expect(result.error).toBeUndefined();
    });
    
    it('should use rssUrls[0] as failedUrl if token is missing', async () => {
        const result = await scrapeRssFeedWithApify(mockInput);
        expect(result.failedUrl).toBe(mockInput.rssUrls[0]);
        expect(result.error).toBe("Apify API Token not set.");
    });

    it('should use xmlUrls[0] as failedUrl if rssUrls is empty and token is missing', async () => {
        const xmlInput: RssXmlScraperInput = { rssUrls: [], xmlUrls: ['https://example.com/feed.xml'] };
        const result = await scrapeRssFeedWithApify(xmlInput);
        expect(result.failedUrl).toBe(xmlInput.xmlUrls![0]);
        expect(result.error).toBe("Apify API Token not set.");
    });
    
    it('should use "RSS/XML Feed" as failedUrl if both url arrays are empty and token is missing', async () => {
        const emptyInput: RssXmlScraperInput = { rssUrls: [] }; // xmlUrls is optional
        const result = await scrapeRssFeedWithApify(emptyInput);
        expect(result.failedUrl).toBe("RSS/XML Feed");
        expect(result.error).toBe("Apify API Token not set.");
    });

    it('should handle API error response', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock).mockResolvedValueOnce({
          ok: false,
          status: 502,
          json: async () => ({ error: { message: 'Bad Gateway' } }),
        });
        const result = await scrapeRssFeedWithApify(mockInput);
        expect(result.error).toBe('Bad Gateway');
      });
  });

  describe('analyzeUrlWithApify', () => {
    const mockUrl = 'https://example.com/crawl';
    const mockOptions: ApifyCrawlingOptions = { maxCrawlDepth: 2 };
    const mockDatasetItems = [{ url: mockUrl, title: 'Crawled Page', markdown: 'Content' }];

    it('should call Apify API and return formatted data on success', async () => {
      mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockDatasetItems,
      });

      const result = await analyzeUrlWithApify(mockUrl, mockOptions);

      expect(fetch).toHaveBeenCalledTimes(1);
      const expectedInput = {
        startUrls: [{ url: mockUrl }],
        useSitemaps: false, // default
        respectRobotsTxtFile: true, // default
        crawlerType: "cheerio", // default
        saveMarkdown: true, // default
        maxResults: mockOptions.maxCrawlPages || 10, // Adjusted if maxCrawlPages is in mockOptions, else default from function (1 or 10 based on defaults)
        maxCrawlPages: mockOptions.maxCrawlPages || 1, // Default from function or mockOptions
        maxCrawlDepth: mockOptions.maxCrawlDepth, // from mockOptions
        proxyConfiguration: { useApifyProxy: true },
        // includeIndirectLinks and pseudoUrls might be added based on options
      };
      // More precise check for the body, accounting for default option merging
      const actualFetchCall = (fetch as jest.Mock).mock.calls[0];
      const actualBody = JSON.parse(actualFetchCall[1].body);
      
      expect(actualBody.startUrls).toEqual([{url: mockUrl}]);
      expect(actualBody.maxCrawlDepth).toEqual(mockOptions.maxCrawlDepth);
      // Check other critical fields that should be there due to defaults + options
      expect(actualBody.crawlerType).toBeDefined();
      expect(actualBody.saveMarkdown).toBe(true);


      expect(actualFetchCall[0]).toContain('apify~website-content-crawler/run-sync-get-dataset-items');
      expect(result.analyzedText).toBe(formatDatasetItemsToText(mockDatasetItems));
      expect(result.failedUrl).toBeNull();
      expect(result.error).toBeUndefined();
    });

    it('should include pseudoUrls if includeIndirectLinks is true', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock).mockResolvedValueOnce({ ok: true, json: async () => mockDatasetItems });
        
        const optionsWithIndirectLinks: ApifyCrawlingOptions = { includeIndirectLinks: true, maxIndirectLinks: 3, maxCrawlPages: 2 };
        await analyzeUrlWithApify(mockUrl, optionsWithIndirectLinks);
        
        const actualFetchCall = (fetch as jest.Mock).mock.calls[0];
        const actualBody = JSON.parse(actualFetchCall[1].body);
        expect(actualBody.pseudoUrls).toBeDefined();
        expect(actualBody.pseudoUrls.length).toBeGreaterThan(0);
        expect(actualBody.linkSelector).toBe("a[href]");
        // maxResults should be adjusted
        expect(actualBody.maxResults).toBe(optionsWithIndirectLinks.maxCrawlPages! + optionsWithIndirectLinks.maxIndirectLinks!);
      });


    it('should return error if Apify token is missing', async () => {
      const result = await analyzeUrlWithApify(mockUrl, mockOptions);
      expect(result.failedUrl).toBe(mockUrl);
      expect(result.error).toBe("Apify API Token not set.");
    });
  });
  
  describe('analyzeMultipleUrlsWithApify', () => {
    // analyzeMultipleUrlsWithApify calls analyzeUrlWithApify internally.
    // We can do a higher-level test here, ensuring it processes multiple URLs
    // and combines results or errors. We don't need to re-test all scenarios of analyzeUrlWithApify.

    const urls = ['https://example.com/1', 'https://example.com/2'];
    const mockSuccessData1 = [{ url: urls[0], markdown: "Content 1" }];
    const mockSuccessData2 = [{ url: urls[1], markdown: "Content 2" }];

    it('should process multiple URLs and combine results', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessData1 })
            .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessData2 });

        const result = await analyzeMultipleUrlsWithApify(urls);

        expect(fetch).toHaveBeenCalledTimes(2);
        expect(result.failedUrls).toEqual([]);
        expect(result.combinedAnalyzedText).toContain(formatDatasetItemsToText(mockSuccessData1));
        expect(result.combinedAnalyzedText).toContain(formatDatasetItemsToText(mockSuccessData2));
        expect(result.combinedAnalyzedText).toContain(`### Analysis for URL: ${urls[0]}`);
        expect(result.combinedAnalyzedText).toContain(`### Analysis for URL: ${urls[1]}`);
    });

    it('should handle a mix of successful and failed URLs', async () => {
        mockLocalStorage['apifyApiToken'] = MOCK_APIFY_TOKEN;
        (fetch as jest.Mock)
            .mockResolvedValueOnce({ ok: true, json: async () => mockSuccessData1 })
            .mockResolvedValueOnce({ ok: false, status: 500, json: async () => ({ error: { message: 'Server Error for URL2' }}) });

        const result = await analyzeMultipleUrlsWithApify(urls);
        expect(fetch).toHaveBeenCalledTimes(2);
        expect(result.failedUrls).toEqual([urls[1]]);
        expect(result.combinedAnalyzedText).toContain(formatDatasetItemsToText(mockSuccessData1));
        expect(result.combinedAnalyzedText).toContain(`Error: Server Error for URL2`);
    });
  });
});
