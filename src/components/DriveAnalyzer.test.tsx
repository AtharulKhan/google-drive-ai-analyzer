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
// TextUrlInput is the one we want to test interactions with, so we don't fully mock it,
// but we need to ensure its sub-components like CrawlingOptions are also mocked if they render.
jest.mock('./drive-analyzer/CrawlingOptions', () => ({ CrawlingOptions: jest.fn(() => <div>Mocked CrawlingOptions</div>) }));


// --- Test Suite ---
describe('DriveAnalyzer - Apify Actor Integration', () => {
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
  });

  it('selects Article Extractor and calls extractArticleWithApify', async () => {
    render(<DriveAnalyzer />);
    enterPrompt();
    
    const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
    fireEvent.mouseDown(selectTrigger);
    fireEvent.click(screen.getByText('Article Extractor (Single URL)'));

    const articleUrlInput = screen.getByPlaceholderText('https://example.com/article-page');
    fireEvent.change(articleUrlInput, { target: { value: 'https://article.com/extract' } });
    
    const runButton = screen.getByText(/Run AI Analysis/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(apifyApi.extractArticleWithApify).toHaveBeenCalledTimes(1);
      expect(apifyApi.extractArticleWithApify).toHaveBeenCalledWith({ url: 'https://article.com/extract' });
    });
    await waitFor(() => expect(openRouterApi.analyzeWithOpenRouter).toHaveBeenCalled());
  });

  it('selects Bing Search Scraper and calls searchWithBingScraper', async () => {
    render(<DriveAnalyzer />);
    enterPrompt();

    const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
    fireEvent.mouseDown(selectTrigger);
    fireEvent.click(screen.getByText('Bing Search Scraper'));

    const bingQueryInput = screen.getByPlaceholderText('Enter your search query/queries...');
    fireEvent.change(bingQueryInput, { target: { value: 'bing search this' } });

    const runButton = screen.getByText(/Run AI Analysis/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(apifyApi.searchWithBingScraper).toHaveBeenCalledTimes(1);
      expect(apifyApi.searchWithBingScraper).toHaveBeenCalledWith({ searchqueries: 'bing search this' });
    });
    await waitFor(() => expect(openRouterApi.analyzeWithOpenRouter).toHaveBeenCalled());
  });

  it('selects RSS/XML Feed Scraper and calls scrapeRssFeedWithApify', async () => {
    render(<DriveAnalyzer />);
    enterPrompt();

    const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
    fireEvent.mouseDown(selectTrigger);
    fireEvent.click(screen.getByText('RSS/XML Feed Scraper'));

    const rssUrlInput = screen.getByPlaceholderText('https://example.com/feed.xml');
    fireEvent.change(rssUrlInput, { target: { value: 'https://feed.com/rss' } });

    const runButton = screen.getByText(/Run AI Analysis/i);
    fireEvent.click(runButton);

    await waitFor(() => {
      expect(apifyApi.scrapeRssFeedWithApify).toHaveBeenCalledTimes(1);
      expect(apifyApi.scrapeRssFeedWithApify).toHaveBeenCalledWith({ rssUrls: ['https://feed.com/rss'] });
    });
    await waitFor(() => expect(openRouterApi.analyzeWithOpenRouter).toHaveBeenCalled());
  });
  
  it('disables Run button if required input for selected actor is missing', async () => {
    render(<DriveAnalyzer />);
    enterPrompt(); // Prompt is always required

    const runButton = screen.getByText(/Run AI Analysis/i);
    
    // Default: Website crawler, no URL -> button should be disabled or become disabled
    // In our setup, it's initially enabled if prompt is there, but becomes disabled if no content source is added.
    // This test focuses on the actor-specific inputs.
    expect(runButton).toBeDisabled(); // No files, no text, no URLs

    // Select Article Extractor, no URL
    const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
    fireEvent.mouseDown(selectTrigger);
    fireEvent.click(screen.getByText('Article Extractor (Single URL)'));
    expect(runButton).toBeDisabled(); // Still disabled as article URL is missing

    const articleUrlInput = screen.getByPlaceholderText('https://example.com/article-page');
    fireEvent.change(articleUrlInput, { target: { value: 'https://article.com/extract' } });
    expect(runButton).not.toBeDisabled(); // Now enabled

    // Select Bing Search, no query
    fireEvent.mouseDown(selectTrigger);
    fireEvent.click(screen.getByText('Bing Search Scraper'));
    expect(runButton).toBeDisabled();

    const bingQueryInput = screen.getByPlaceholderText('Enter your search query/queries...');
    fireEvent.change(bingQueryInput, { target: { value: 'search this' } });
    expect(runButton).not.toBeDisabled();

     // Select RSS Feed, no URL
     fireEvent.mouseDown(selectTrigger);
     fireEvent.click(screen.getByText('RSS/XML Feed Scraper'));
     expect(runButton).toBeDisabled();
 
     const rssUrlInput = screen.getByPlaceholderText('https://example.com/feed.xml');
     fireEvent.change(rssUrlInput, { target: { value: 'https://myfeed.com/rss' } });
     expect(runButton).not.toBeDisabled();

    // Back to Website Crawler, no URLs added for it in this flow yet
    fireEvent.mouseDown(selectTrigger);
    fireEvent.click(screen.getByText('Website Content Crawler'));
    expect(runButton).toBeDisabled(); // Disabled as no URLs for crawler
    
    const urlInputForCrawler = screen.getByPlaceholderText('https://example.com');
    fireEvent.change(urlInputForCrawler, { target: { value: 'https://crawl.com' } });
    const addUrlButton = screen.getByText('Add URL to Session');
    fireEvent.click(addUrlButton);
    expect(runButton).not.toBeDisabled(); // Enabled after adding a URL
  });

});
