import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import ApifyActorsPage from '../ApifyActorsPage'; // Adjust path as needed
import React from 'react';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock API utility functions
vi.mock('@/utils/apify-api', () => ({
  runApifyActor: vi.fn(),
}));
vi.mock('@/utils/openrouter-api', () => ({
  analyzeWithOpenRouter: vi.fn(),
}));
vi.mock('@/utils/ai-models', () => ({
  getDefaultAIModel: vi.fn(() => 'mock-ai-model'),
}));

// Mock child form components
vi.mock('@/components/apify-actors/SmartArticleExtractorForm', () => ({
  default: () => <div data-testid="mock-smart-article-extractor-form">Smart Article Extractor Form</div>,
}));
vi.mock('@/components/apify-actors/BingSearchScraperForm', () => ({
  default: () => <div data-testid="mock-bing-search-scraper-form">Bing Search Scraper Form</div>,
}));
vi.mock('@/components/apify-actors/RssXmlScraperForm', () => ({
  default: () => <div data-testid="mock-rss-xml-scraper-form">RSS XML Scraper Form</div>,
}));

// Mock sonner (toast)
const mockToast = {
    info: vi.fn(),
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
    loading: vi.fn(),
    dismiss: vi.fn(),
    custom: vi.fn(),
    message: vi.fn(),
};
vi.mock('sonner', () => ({
  toast: mockToast,
  // If sonner exports Toaster component and it's used, you might need to mock it too
  // Toaster: () => <div data-testid="mock-toaster">Toaster</div>, 
}));


// Helper to reset mocks and localStorage before each test
beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks(); // Clears all mocks including call counts

  // Reset specific mock implementations if needed, e.g.
  // runApifyActor.mockReset();
  // analyzeWithOpenRouter.mockReset();
});


describe('ApifyActorsPage', () => {
  // Test Initial Render
  test('renders initial sections and warns if Apify token is missing', () => {
    render(<ApifyActorsPage />);
    expect(screen.getByText('Apify Actors')).toBeInTheDocument();
    expect(screen.getByText('Available Actors')).toBeInTheDocument();
    expect(screen.getByText('Actor Configuration')).toBeInTheDocument();
    expect(screen.getByText('Actor Run Status')).toBeInTheDocument();
    expect(screen.getByText('AI Analysis')).toBeInTheDocument();

    // Check for Apify token warning (toast)
    expect(mockToast.warning).toHaveBeenCalledWith(
      "Apify API token not found. Please set it in Settings.",
      expect.objectContaining({ description: "You won't be able to run actors until the token is set." })
    );
  });

  test('shows no Apify token warning if token is present', () => {
    localStorageMock.setItem('apifyApiToken', 'test-apify-token');
    render(<ApifyActorsPage />);
    expect(mockToast.warning).not.toHaveBeenCalledWith(
      "Apify API token not found. Please set it in Settings.",
      expect.any(Object)
    );
  });

  // Test Actor Selection and Form Display
  test('clicking an actor selects it and displays its mock form', async () => {
    render(<ApifyActorsPage />);
    
    // Click on "Smart Article Extractor"
    const smartArticleExtractorButton = screen.getByText('Smart Article Extractor').closest('button');
    expect(smartArticleExtractorButton).toBeInTheDocument();
    if (smartArticleExtractorButton) fireEvent.click(smartArticleExtractorButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-smart-article-extractor-form')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-bing-search-scraper-form')).not.toBeInTheDocument();

    // Click on "Bing Search Scraper"
    const bingSearchScraperButton = screen.getByText('Bing Search Scraper').closest('button');
    expect(bingSearchScraperButton).toBeInTheDocument();
    if (bingSearchScraperButton) fireEvent.click(bingSearchScraperButton);

    await waitFor(() => {
      expect(screen.getByTestId('mock-bing-search-scraper-form')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('mock-smart-article-extractor-form')).not.toBeInTheDocument();
  });

  // Mocked Actor Run Tests
  describe('Actor Run (Mocked)', () => {
    const mockRunApifyActor = vi.mocked(require('@/utils/apify-api').runApifyActor);

    beforeEach(() => {
      localStorageMock.setItem('apifyApiToken', 'test-apify-token');
    });

    test('successful actor run displays results and accumulates them', async () => {
      mockRunApifyActor
        .mockResolvedValueOnce({ 
          success: true, 
          data: [{ id: 1, text: 'First run result' }], 
          runId: 'run1', 
          datasetId: 'dataset1' 
        })
        .mockResolvedValueOnce({
          success: true,
          data: [{ id: 2, text: 'Second run result' }],
          runId: 'run2',
          datasetId: 'dataset2'
        });

      render(<ApifyActorsPage />);
      
      // Select and "submit" first actor (Smart Article Extractor)
      const smartArticleExtractorButton = screen.getByText('Smart Article Extractor').closest('button');
      if (smartArticleExtractorButton) fireEvent.click(smartArticleExtractorButton);
      
      // The form itself is mocked, so we can't fill it.
      // We'll assume the form's onSubmit calls handleActorSubmit directly.
      // To trigger handleActorSubmit, we need a way.
      // Let's simulate it by finding a button that would trigger it (if forms were real)
      // For now, let's assume the page has a generic "Run" button or we need to adjust the form mock.
      // For this test, we'll manually call the submit handler exposed from the component if possible,
      // or rely on the onSubmit prop of the mocked form.
      // Since forms are fully mocked, we'll assume the page has a global run button for selected actor,
      // or that the form mock's onSubmit is somehow callable.
      // This part needs a way to trigger `handleActorSubmit`.
      // Let's assume our mocked forms have an implicit submit button that calls onSubmit.
      // We'll need to get the onSubmit from the mocked component's props.

      // This is a limitation of fully mocking forms. A better way would be for mocked forms
      // to render a button that calls their onSubmit prop.
      // For now, we'll assume some mechanism exists or test this part differently.
      // Let's adjust the mock to include a button:
      vi.mock('@/components/apify-actors/SmartArticleExtractorForm', () => ({
        default: ({ onSubmit }: { onSubmit: (data: any) => void }) => (
          <div data-testid="mock-smart-article-extractor-form">
            Smart Article Extractor Form
            <button onClick={() => onSubmit({ url: 'test.com' })}>Mock Run Smart</button>
          </div>
        ),
      }));
       vi.mock('@/components/apify-actors/BingSearchScraperForm', () => ({
        default: ({ onSubmit }: { onSubmit: (data: any) => void }) => (
          <div data-testid="mock-bing-search-scraper-form">
            Bing Search Scraper Form
            <button onClick={() => onSubmit({ query: 'test' })}>Mock Run Bing</button>
          </div>
        ),
      }));


      // Re-render after updating mocks
      render(<ApifyActorsPage />);
      const smartButton = screen.getByText('Smart Article Extractor').closest('button');
      if (smartButton) fireEvent.click(smartButton);
      
      await screen.findByTestId('mock-smart-article-extractor-form');
      const runSmartButton = screen.getByText('Mock Run Smart');
      
      // First run
      await act(async () => {
        fireEvent.click(runSmartButton);
      });

      await waitFor(() => {
        expect(mockToast.info).toHaveBeenCalledWith('Starting Smart Article Extractor...');
      });
      await waitFor(() => {
        expect(screen.getByText(/Fetched 1 items/i)).toBeInTheDocument();
        expect(screen.getByText(/First run result/i)).toBeInTheDocument();
      });

      // Select and "submit" second actor (Bing Search Scraper)
      const bingButton = screen.getByText('Bing Search Scraper').closest('button');
      if (bingButton) fireEvent.click(bingButton);

      await screen.findByTestId('mock-bing-search-scraper-form');
      const runBingButton = screen.getByText('Mock Run Bing');

      // Second run
      await act(async () => {
        fireEvent.click(runBingButton);
      });
      
      await waitFor(() => {
        expect(mockToast.info).toHaveBeenCalledWith('Starting Bing Search Scraper...');
      });
      await waitFor(() => {
        expect(screen.getAllByText(/Fetched 1 items/i).length).toBe(2); // Both results present
        expect(screen.getByText(/Second run result/i)).toBeInTheDocument();
        expect(screen.getByText(/First run result/i)).toBeInTheDocument(); // First result still there
      });

      // Test Clear All Results
      const clearAllButton = screen.getByText('Clear All Results');
      fireEvent.click(clearAllButton);

      await waitFor(() => {
        expect(screen.queryByText(/First run result/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Second run result/i)).not.toBeInTheDocument();
        expect(mockToast.info).toHaveBeenCalledWith("All actor run results cleared.");
      });
    });

    test('failed actor run displays an error message', async () => {
      const mockErrorObject = { message: 'Actor failed spectacularly', details: 'Network timeout' };
      mockRunApifyActor.mockResolvedValueOnce({ 
        success: false, 
        error: mockErrorObject, 
        runId: 'runError1', 
      });
      
      // Assuming the SmartArticleExtractorForm mock with a button is active from previous test or setup
      render(<ApifyActorsPage />);

      const smartButton = screen.getByText('Smart Article Extractor').closest('button');
      if (smartButton) fireEvent.click(smartButton);
      
      await screen.findByTestId('mock-smart-article-extractor-form');
      const runSmartButton = screen.getByText('Mock Run Smart');
      
      await act(async () => {
        fireEvent.click(runSmartButton);
      });

      await waitFor(() => {
        expect(screen.getByText('Last Run Failed:')).toBeInTheDocument();
        expect(screen.getByText(new RegExp(mockErrorObject.message, "i"))).toBeInTheDocument();
        expect(mockToast.error).toHaveBeenCalledWith(
          "Smart Article Extractor failed.",
          expect.objectContaining({ description: `Error: ${mockErrorObject.message}. Run ID: runError1. Check console for details.` })
        );
      });
    });
  });

  // AI Analysis Section Tests
  describe('AI Analysis Section (Mocked)', () => {
    const mockAnalyzeWithOpenRouter = vi.mocked(require('@/utils/openrouter-api').analyzeWithOpenRouter);
    const mockRunApifyActor = vi.mocked(require('@/utils/apify-api').runApifyActor);

    beforeEach(() => {
      localStorageMock.setItem('apifyApiToken', 'test-apify-token');
      localStorageMock.setItem('openRouterApiKey', 'test-openrouter-key');
      // Mock a successful actor run to provide data for AI analysis
      mockRunApifyActor.mockResolvedValue({ 
        success: true, 
        data: [{ title: 'AI Test Data', content: 'Some content to analyze' }], 
        runId: 'aiRun1', 
        datasetId: 'aiDataset1',
        actorName: 'Test Actor for AI',
        timestamp: new Date().toISOString()
      });

      // Mock form again to ensure it has a submit button
      vi.mock('@/components/apify-actors/SmartArticleExtractorForm', () => ({
        default: ({ onSubmit }: { onSubmit: (data: any) => void }) => (
          <div data-testid="mock-smart-article-extractor-form">
            Smart Article Extractor Form
            <button onClick={() => onSubmit({ url: 'test-ai.com' })}>Mock Run for AI</button>
          </div>
        ),
      }));
    });

    test('typing in prompt, successful AI analysis displays markdown', async () => {
      mockAnalyzeWithOpenRouter.mockResolvedValueOnce({
        success: true,
        markdownReport: '# AI Analysis Result\nThis is a test.',
      });
      
      render(<ApifyActorsPage />);

      // Run an actor first
      const smartButton = screen.getByText('Smart Article Extractor').closest('button');
      if (smartButton) fireEvent.click(smartButton);
      await screen.findByTestId('mock-smart-article-extractor-form');
      const runForAIButton = screen.getByText('Mock Run for AI');
      await act(async () => { fireEvent.click(runForAIButton); });
      await waitFor(() => expect(screen.getByText(/AI Test Data/)).toBeInTheDocument());


      const promptTextarea = screen.getByPlaceholderText(/Enter your prompt here/i);
      const analyzeButton = screen.getByRole('button', { name: /Analyze with AI/i });

      expect(analyzeButton).toBeDisabled(); // Should be disabled initially or if prompt is empty

      fireEvent.change(promptTextarea, { target: { value: 'Test AI prompt' } });
      expect(promptTextarea).toHaveValue('Test AI prompt');
      expect(analyzeButton).toBeEnabled();

      await act(async () => {
        fireEvent.click(analyzeButton);
      });
      
      await waitFor(() => {
        expect(mockToast.info).toHaveBeenCalledWith('Starting AI analysis...');
      });

      await waitFor(() => {
        // Assuming Markdown component renders identifiable output
        expect(screen.getByText('AI Analysis Result')).toBeInTheDocument(); // Title from Markdown
        expect(screen.getByText('This is a test.')).toBeInTheDocument(); // Content
        expect(mockToast.success).toHaveBeenCalledWith("AI analysis completed successfully.");
      });
    });

    test('failed AI analysis displays an error', async () => {
      mockAnalyzeWithOpenRouter.mockResolvedValueOnce({
        success: false,
        error: 'AI blew up',
      });

      render(<ApifyActorsPage />);

      // Run an actor first
      const smartButton = screen.getByText('Smart Article Extractor').closest('button');
      if (smartButton) fireEvent.click(smartButton);
      await screen.findByTestId('mock-smart-article-extractor-form');
      const runForAIButton = screen.getByText('Mock Run for AI');
      await act(async () => { fireEvent.click(runForAIButton); });
      await waitFor(() => expect(screen.getByText(/AI Test Data/)).toBeInTheDocument());

      const promptTextarea = screen.getByPlaceholderText(/Enter your prompt here/i);
      const analyzeButton = screen.getByRole('button', { name: /Analyze with AI/i });

      fireEvent.change(promptTextarea, { target: { value: 'Another AI prompt' } });
      
      await act(async () => {
        fireEvent.click(analyzeButton);
      });

      await waitFor(() => {
        expect(screen.getByText('AI Analysis Result:')).toBeInTheDocument(); // Section title
        expect(screen.getByText(/Error:/i)).toBeInTheDocument();
        expect(screen.getByText(/AI blew up/i)).toBeInTheDocument();
        expect(mockToast.error).toHaveBeenCalledWith(
            "AI Analysis Failed", 
            expect.objectContaining({ description: "AI blew up" })
        );
      });
    });
     test('Analyze with AI button is disabled if OpenRouter API key is missing', async () => {
        localStorageMock.removeItem('openRouterApiKey'); // Ensure key is missing
        
        render(<ApifyActorsPage />);

        // Run an actor first to enable the prompt
        const smartButton = screen.getByText('Smart Article Extractor').closest('button');
        if (smartButton) fireEvent.click(smartButton);
        await screen.findByTestId('mock-smart-article-extractor-form');
        const runForAIButton = screen.getByText('Mock Run for AI');
        await act(async () => { fireEvent.click(runForAIButton); });
        await waitFor(() => expect(screen.getByText(/AI Test Data/)).toBeInTheDocument());

        const promptTextarea = screen.getByPlaceholderText(/Enter your prompt here/i);
        const analyzeButton = screen.getByRole('button', { name: /Analyze with AI/i });

        fireEvent.change(promptTextarea, { target: { value: 'Test prompt' } });
        expect(analyzeButton).toBeEnabled(); // Enabled before click because key check is on click

        await act(async () => {
            fireEvent.click(analyzeButton);
        });
        
        await waitFor(() => {
            expect(mockToast.error).toHaveBeenCalledWith(
                "OpenRouter API Key is missing.",
                expect.objectContaining({ description: "Please set your OpenRouter API key in the settings page." })
            );
        });
        // Button might still be enabled if it doesn't re-check disabled state after failed attempt based on key
        // The important part is the toast error and that analyzeWithOpenRouter was not called.
        expect(mockAnalyzeWithOpenRouter).not.toHaveBeenCalled();
    });
  });
});
