import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import DriveAnalyzer from './DriveAnalyzer'; // Adjust path as necessary
import * as apifyApi from '@/utils/apify-api'; // To mock Apify functions
import * as googleApi from '@/utils/google-api'; // To mock Google API functions
import * as openRouterApi from '@/utils/openrouter-api'; // To mock OpenRouter
import { useGoogleAuth } from '@/hooks/useGoogleAuth'; // To mock Google Auth
import { useDrivePicker } from '@/hooks/useDrivePicker'; // To mock Drive Picker

// --- Mocks Setup ---

// Mock Apify API functions
jest.mock('@/utils/apify-api', () => ({
  ...jest.requireActual('@/utils/apify-api'), // Import and retain default exports
  analyzeMultipleUrlsWithApify: jest.fn(),
  extractArticleWithApify: jest.fn(),
  searchWithBingScraper: jest.fn(),
  scrapeRssFeedWithApify: jest.fn(),
}));

// Mock Google API (optional, if file processing is part of test)
jest.mock('@/utils/google-api', () => ({
  fetchFileContent: jest.fn().mockResolvedValue('Mocked file content'),
}));

// Mock OpenRouter (core of the analysis)
jest.mock('@/utils/openrouter-api', () => ({
  analyzeWithOpenRouter: jest.fn().mockResolvedValue('Mocked AI Analysis Result'),
}));

// Mock Google Auth Hook
jest.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(() => ({
    isSignedIn: true,
    accessToken: 'mock_access_token',
    loading: false,
    signIn: jest.fn(),
    signOut: jest.fn(),
  })),
}));

// Mock Drive Picker Hook
jest.mock('@/hooks/useDrivePicker', () => ({
  useDrivePicker: jest.fn(() => ({
    openPicker: jest.fn(),
    isReady: true,
  })),
}));

// Mock local file processor
jest.mock('@/utils/local-file-processor', () => ({
    processLocalFiles: jest.fn().mockResolvedValue(['Mocked local file content']),
}));


// Mock toast notifications (already done in apify-api.test.ts, but good to have here if running standalone)
jest.mock('sonner', () => ({
  toast: {
    error: jest.fn(),
    success: jest.fn(),
    warning: jest.fn(),
    info: jest.fn(), // Add other methods if used by DriveAnalyzer
  },
}));

// Mock child components that are complex and not directly under test for these scenarios
jest.mock('./drive-analyzer/FileList', () => ({ FileList: jest.fn(() => <div>Mocked FileList</div>) }));
jest.mock('./drive-analyzer/SavedPrompts', () => ({ SavedPrompts: jest.fn(() => <div>Mocked SavedPrompts</div>) }));
jest.mock('./drive-analyzer/SavedAnalysesSidebar', () => ({ SavedAnalysesSidebar: jest.fn(() => <div>Mocked SavedAnalysesSidebar</div>) }));
jest.mock('./drive-analyzer/PromptSelector', () => ({ PromptSelector: jest.fn(({ userPrompt, onUserPromptChange }) => <textarea aria-label="User Prompt" value={userPrompt} onChange={onUserPromptChange} />) }));
jest.mock('./drive-analyzer/ConfigurationOptions', () => ({ ConfigurationOptions: jest.fn(() => <div>Mocked ConfigOptions</div>) }));
jest.mock('./drive-analyzer/AnalysisResults', () => ({ AnalysisResults: jest.fn(() => <div>Mocked AnalysisResults</div>) }));
// TextUrlInput is the one we want to test interactions with.
// Mock its sub-components for options.
jest.mock('./drive-analyzer/WebsiteCrawlerOptions', () => ({ WebsiteCrawlerOptions: jest.fn(({ options, onChange }) => <div data-testid="mock-website-crawler-options" onClick={() => onChange({ maxCrawlDepth: (options.maxCrawlDepth || 0) + 1 })} />)}));
jest.mock('./drive-analyzer/ArticleExtractorOptions', () => ({ ArticleExtractorOptions: jest.fn(({ options, onOptionChange }) => <div data-testid="mock-article-extractor-options" onClick={() => onOptionChange('minWords', (options.minWords || 0) + 10)} />)}));
jest.mock('./drive-analyzer/BingSearchOptions', () => ({ BingSearchOptions: jest.fn(({ options, onOptionChange }) => <div data-testid="mock-bing-search-options" onClick={() => onOptionChange('resultsPerPage', (options.resultsPerPage || 0) + 5)} />)}));
jest.mock('./drive-analyzer/RssScraperOptions', () => ({ RssScraperOptions: jest.fn(({ options, onOptionChange }) => <div data-testid="mock-rss-scraper-options" onClick={() => onOptionChange('maxItems', (options.maxItems || 0) + 3)} />)}));


// --- Test Suite ---
describe('DriveAnalyzer', () => { // Renamed for broader scope
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default successful responses for Apify calls to avoid pending promises
    (apifyApi.analyzeMultipleUrlsWithApify as jest.Mock).mockResolvedValue({ combinedAnalyzedText: 'Crawled Data', failedUrls: [] });
    (apifyApi.extractArticleWithApify as jest.Mock).mockResolvedValue({ analyzedText: 'Article Data', failedUrl: null });
    (apifyApi.searchWithBingScraper as jest.Mock).mockResolvedValue({ analyzedText: 'Bing Data', failedUrl: null });
    (apifyApi.scrapeRssFeedWithApify as jest.Mock).mockResolvedValue({ analyzedText: 'RSS Data', failedUrl: null });

    // Mock localStorage for Apify token (if DriveAnalyzer directly uses it, though it's in apify-api.ts)
    Storage.prototype.getItem = jest.fn(key => {
        if (key === 'apifyApiToken') return 'mock_apify_token';
        if (key === 'drive-analyzer-custom-instructions') return ''; // Default for custom instructions
        if (key === 'drive-analyzer-saved-prompts') return '[]';
        if (key === 'drive-analyzer-saved-analyses') return '[]';
        return null;
    });
    Storage.prototype.setItem = jest.fn();

  });

  const enterPrompt = () => {
    const promptInput = screen.getByLabelText(/User Prompt/i);
    fireEvent.change(promptInput, { target: { value: 'Test prompt' } });
  };

  it('defaults to Website Content Crawler and calls analyzeMultipleUrlsWithApify', async () => {
    render(<DriveAnalyzer />);
    enterPrompt();

    // Add a URL for the website crawler
    const urlInputForCrawler = screen.getByPlaceholderText('https://example.com'); // from TextUrlInput
    fireEvent.change(urlInputForCrawler, { target: { value: 'https://crawl.com' } });
    const addUrlButton = screen.getByText('Add URL to Session');
    fireEvent.click(addUrlButton);
    
    const runButton = screen.getByText(/Run AI Analysis/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(apifyApi.analyzeMultipleUrlsWithApify).toHaveBeenCalledTimes(1);
      expect(apifyApi.analyzeMultipleUrlsWithApify).toHaveBeenCalledWith(
        ['https://crawl.com'],
        expect.any(Object) // Crawling options
      );
    });
    await waitFor(() => expect(openRouterApi.analyzeWithOpenRouter).toHaveBeenCalled());
    // The old tests for "Run AI Analysis" directly calling actors are now removed / will be replaced by fetch + analyze tests.
  });

  describe('Actor Options Rendering and State', () => {
    it('renders WebsiteCrawlerOptions by default and updates its options', async () => {
      render(<DriveAnalyzer />);
      // Add a URL to make options visible
      const urlInput = screen.getByPlaceholderText('https://example.com');
      fireEvent.change(urlInput, { target: { value: 'https://test.com' } });
      fireEvent.click(screen.getByText('Add URL to Session'));

      const optionsComponent = screen.getByTestId('mock-website-crawler-options');
      expect(optionsComponent).toBeInTheDocument();
      
      // Simulate option change within the mocked component
      fireEvent.click(optionsComponent); 
      
      // Enter prompt and fetch
      enterPrompt();
      const fetchDataButton = screen.getByText('Fetch Data from Actor');
      fireEvent.click(fetchDataButton);

      await waitFor(() => {
        expect(apifyApi.analyzeMultipleUrlsWithApify).toHaveBeenCalledWith(
          expect.any(Array),
          expect.objectContaining({ maxCrawlDepth: 1 }) // Default is 0, mock click increments it
        );
      });
    });

    it('renders ArticleExtractorOptions and updates its options', async () => {
      render(<DriveAnalyzer />);
      const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
      fireEvent.mouseDown(selectTrigger);
      fireEvent.click(screen.getByText('Article Extractor (Single URL)'));
      
      const optionsComponent = screen.getByTestId('mock-article-extractor-options');
      expect(optionsComponent).toBeInTheDocument();
      fireEvent.click(optionsComponent); // Simulate change: minWords 50 -> 60

      enterPrompt();
      const articleUrlInput = screen.getByPlaceholderText('https://example.com/article-page');
      fireEvent.change(articleUrlInput, { target: { value: 'https://article.com/to-extract' } });
      fireEvent.click(screen.getByText('Fetch Data from Actor'));

      await waitFor(() => {
        expect(apifyApi.extractArticleWithApify).toHaveBeenCalledWith(
          expect.objectContaining({ minWords: 60 })
        );
      });
    });
     it('renders BingSearchOptions and updates its options', async () => {
      render(<DriveAnalyzer />);
      const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
      fireEvent.mouseDown(selectTrigger);
      fireEvent.click(screen.getByText('Bing Search Scraper'));
      
      const optionsComponent = screen.getByTestId('mock-bing-search-options');
      expect(optionsComponent).toBeInTheDocument();
      fireEvent.click(optionsComponent); // Simulate change: resultsPerPage 10 -> 15


      enterPrompt();
      const bingQueryInput = screen.getByPlaceholderText('Enter your search query/queries...');
      fireEvent.change(bingQueryInput, { target: { value: 'bing query for options test' } });
      fireEvent.click(screen.getByText('Fetch Data from Actor'));

      await waitFor(() => {
        expect(apifyApi.searchWithBingScraper).toHaveBeenCalledWith(
          expect.objectContaining({ resultsPerPage: 15 })
        );
      });
    });

    it('renders RssScraperOptions and updates its options', async () => {
      render(<DriveAnalyzer />);
      const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
      fireEvent.mouseDown(selectTrigger);
      fireEvent.click(screen.getByText('RSS/XML Feed Scraper'));
      
      const optionsComponent = screen.getByTestId('mock-rss-scraper-options');
      expect(optionsComponent).toBeInTheDocument();
      fireEvent.click(optionsComponent); // Simulate change: maxItems 25 -> 28

      enterPrompt();
      const rssUrlInput = screen.getByPlaceholderText('https://example.com/feed.xml');
      fireEvent.change(rssUrlInput, { target: { value: 'https://rssfeed.com/for-options' } });
      fireEvent.click(screen.getByText('Fetch Data from Actor'));
      
      await waitFor(() => {
        expect(apifyApi.scrapeRssFeedWithApify).toHaveBeenCalledWith(
          expect.objectContaining({ maxItems: 28 })
        );
      });
    });
  });

  describe('Two-Step Workflow: Fetch Data then Run AI Analysis', () => {
    it('Fetch Data button calls the correct Apify actor and updates state', async () => {
      render(<DriveAnalyzer />);
      enterPrompt();

      // Select Article Extractor
      const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
      fireEvent.mouseDown(selectTrigger);
      fireEvent.click(screen.getByText('Article Extractor (Single URL)'));
      const articleUrlInput = screen.getByPlaceholderText('https://example.com/article-page');
      fireEvent.change(articleUrlInput, { target: { value: 'https://fetchtest.com' } });

      // Mock Apify response
      const mockFetchedText = "Fetched article content for test.";
      (apifyApi.extractArticleWithApify as jest.Mock).mockResolvedValueOnce({ 
        analyzedText: mockFetchedText, 
        failedUrl: null 
      });

      const fetchDataButton = screen.getByText('Fetch Data from Actor');
      fireEvent.click(fetchDataButton);

      expect(screen.getByText('Fetching Data...')).toBeInTheDocument(); // Check loading state
      await waitFor(() => {
        expect(apifyApi.extractArticleWithApify).toHaveBeenCalledWith(
          expect.objectContaining({ url: 'https://fetchtest.com' })
        );
      });
      
      // Check fetched data display (this relies on Markdown component rendering the text)
      // The fetched data card itself will be on the "Data & AI Results" tab.
      // Let's switch to it to ensure content is there for next step.
      const resultsTabTrigger = screen.getByRole('tab', { name: /Data & AI Results/i });
      fireEvent.click(resultsTabTrigger);
      
      await waitFor(() => {
        expect(screen.getByText('Fetched Data from Actor')).toBeInTheDocument(); // Card title
         // The actual content is inside the Markdown mock or a specific element if not mocked
        expect(screen.getByText(mockFetchedText)).toBeInTheDocument(); // Assuming Markdown renders it directly
      });

       // Check that "Run AI Analysis" button is now enabled (if prompt is filled)
      const runAIButton = screen.getByText('Run AI Analysis');
      expect(runAIButton).not.toBeDisabled();
    });

    it('Run AI Analysis button uses fetched data', async () => {
        render(<DriveAnalyzer />);
        enterPrompt();
  
        // 1. Fetch data first
        const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
        fireEvent.mouseDown(selectTrigger);
        fireEvent.click(screen.getByText('Article Extractor (Single URL)'));
        const articleUrlInput = screen.getByPlaceholderText('https://example.com/article-page');
        fireEvent.change(articleUrlInput, { target: { value: 'https://fetchedforai.com' } });
        
        const mockFetchedText = "This is pre-fetched content.";
        (apifyApi.extractArticleWithApify as jest.Mock).mockResolvedValueOnce({ 
          analyzedText: mockFetchedText, 
          failedUrl: null 
        });
        fireEvent.click(screen.getByText('Fetch Data from Actor'));
        await waitFor(() => expect(screen.getByText(mockFetchedText)).toBeInTheDocument());
  
        // 2. Run AI Analysis
        const runAIButton = screen.getByText('Run AI Analysis');
        fireEvent.click(runAIButton);
  
        await waitFor(() => {
          expect(openRouterApi.analyzeWithOpenRouter).toHaveBeenCalledTimes(1);
          // Verify that combinedContent passed to analyzeWithOpenRouter includes mockFetchedText
          const openRouterArgs = (openRouterApi.analyzeWithOpenRouter as jest.Mock).mock.calls[0][0];
          expect(openRouterArgs).toContain(mockFetchedText);
        });
        // Also check if sources are passed to handleSaveAnalysis
        // This requires handleSaveAnalysis to be not mocked or spied upon if it's from useAnalysisState.
        // For now, we assume it's called if analyzeWithOpenRouter succeeds.
    });

    it('Clear Fetched Data button works', async () => {
        render(<DriveAnalyzer />);
        enterPrompt();

        // Fetch data
        fireEvent.mouseDown(screen.getByRole('combobox', { name: /Select Analysis Actor/i }));
        fireEvent.click(screen.getByText('Article Extractor (Single URL)'));
        fireEvent.change(screen.getByPlaceholderText('https://example.com/article-page'), { target: { value: 'https://toclear.com' } });
        const mockFetchedText = "Data to be cleared.";
        (apifyApi.extractArticleWithApify as jest.Mock).mockResolvedValueOnce({ analyzedText: mockFetchedText, failedUrl: null });
        fireEvent.click(screen.getByText('Fetch Data from Actor'));
        
        const resultsTabTrigger = screen.getByRole('tab', { name: /Data & AI Results/i });
        fireEvent.click(resultsTabTrigger);
        await waitFor(() => expect(screen.getByText(mockFetchedText)).toBeInTheDocument());

        // Click clear button
        const clearButton = screen.getByText('Clear Fetched Data');
        fireEvent.click(clearButton);

        await waitFor(() => {
          expect(screen.queryByText(mockFetchedText)).not.toBeInTheDocument();
          expect(screen.getByText('No data fetched or data was cleared.')).toBeInTheDocument();
        });
    });
    
    it('handles error during fetch data stage', async () => {
        render(<DriveAnalyzer />);
        enterPrompt();

        fireEvent.mouseDown(screen.getByRole('combobox', { name: /Select Analysis Actor/i }));
        fireEvent.click(screen.getByText('Article Extractor (Single URL)'));
        fireEvent.change(screen.getByPlaceholderText('https://example.com/article-page'), { target: { value: 'https://errorfetch.com' } });

        (apifyApi.extractArticleWithApify as jest.Mock).mockResolvedValueOnce({ 
            analyzedText: "", 
            failedUrl: 'https://errorfetch.com',
            error: "Actor execution failed" 
        });
        fireEvent.click(screen.getByText('Fetch Data from Actor'));

        await waitFor(() => {
            expect(jest.requireMock('sonner').toast.error).toHaveBeenCalledWith("Failed to fetch data: Actor execution failed");
        });
        const resultsTabTrigger = screen.getByRole('tab', { name: /Data & AI Results/i });
        fireEvent.click(resultsTabTrigger);
        expect(screen.queryByText('Fetched Data from Actor')).not.toBeInTheDocument(); // Card should not appear
    });

  });

});
