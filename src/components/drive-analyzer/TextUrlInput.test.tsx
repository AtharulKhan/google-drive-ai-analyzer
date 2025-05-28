import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { TextUrlInput } from './TextUrlInput'; // Adjust path as necessary
import { ApifyCrawlingOptions } from '@/utils/apify-api';

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

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

const defaultCrawlingOptions: ApifyCrawlingOptions = {
  crawlerType: 'playwright:firefox',
  maxRequestsPerCrawl: 100,
  maxCrawlingDepth: 10,
  maxConcurrency: 50,
  saveSnapshots: false,
  includeUrlGlobs: [],
  excludeUrlGlobs: [],
};

describe('TextUrlInput URL Features', () => {
  let mockOnUrlAdd: ReturnType<typeof vi.fn>;
  let mockOnCurrentUrlInputChange: ReturnType<typeof vi.fn>;
  let mockOnPastedTextChange: ReturnType<typeof vi.fn>;
  let mockOnUrlRemove: ReturnType<typeof vi.fn>;
  let mockOnClearPastedText: ReturnType<typeof vi.fn>;
  let mockOnClearUrls: ReturnType<typeof vi.fn>;
  let mockOnCrawlingOptionsChange: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    localStorageMock.clear();
    mockOnUrlAdd = vi.fn();
    mockOnCurrentUrlInputChange = vi.fn();
    mockOnPastedTextChange = vi.fn();
    mockOnUrlRemove = vi.fn();
    mockOnClearPastedText = vi.fn();
    mockOnClearUrls = vi.fn();
    mockOnCrawlingOptionsChange = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    localStorageMock.clear(); // Ensure localStorage is clean after each test
  });

  // Store the rerender function
  let currentRerender: ((ui: React.ReactElement) => void) | null = null;

  const renderComponent = (currentUrl = "", urls: string[] = []) => {
    const { rerender: rerenderFunc } = render( // capture rerender
      <TextUrlInput
        pastedText=""
        onPastedTextChange={mockOnPastedTextChange}
        urls={urls}
        onUrlAdd={mockOnUrlAdd}
        onUrlRemove={mockOnUrlRemove}
        onClearPastedText={mockOnClearPastedText}
        onClearUrls={mockOnClearUrls}
        currentUrlInput={currentUrl}
        onCurrentUrlInputChange={mockOnCurrentUrlInputChange}
        crawlingOptions={defaultCrawlingOptions}
        onCrawlingOptionsChange={mockOnCrawlingOptionsChange}
      />
    );
    currentRerender = rerenderFunc; // store it
  };
  
  // Helper to update props using rerender
  const updateComponentProps = (newCurrentUrl: string, newUrls: string[] = []) => {
    if (currentRerender) {
      currentRerender(
        <TextUrlInput
          pastedText=""
          onPastedTextChange={mockOnPastedTextChange}
          urls={newUrls}
          onUrlAdd={mockOnUrlAdd}
          onUrlRemove={mockOnUrlRemove}
          onClearPastedText={mockOnClearPastedText}
          onClearUrls={mockOnClearUrls}
          currentUrlInput={newCurrentUrl}
          onCurrentUrlInputChange={mockOnCurrentUrlInputChange}
          crawlingOptions={defaultCrawlingOptions}
          onCrawlingOptionsChange={mockOnCrawlingOptionsChange}
        />
      );
    } else {
      throw new Error("Component not rendered yet, or rerender function not captured.");
    }
  };


  it('loads saved URLs from localStorage on mount', () => {
    const testUrls = ['https://example.com/test1', 'https://example.com/test2'];
    localStorageMock.setItem('driveAnalyzer_savedUrls', JSON.stringify(testUrls));
    renderComponent();
    expect(screen.getByText('https://example.com/test1')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/test2')).toBeInTheDocument();
  });

  it('shows "No URLs saved yet." if localStorage is empty', () => {
    renderComponent();
    expect(screen.getByText('No URLs saved yet.')).toBeInTheDocument();
  });

  it('saves a new URL to savedUrls and localStorage', async () => {
    const user = userEvent.setup();
    renderComponent(); // Initial render with empty currentUrlInput

    // Simulate typing into the input field
    // We need to re-render or simulate prop change for currentUrlInput
    const urlInput = screen.getByPlaceholderText('https://example.com');
    // Simulate the parent component updating the currentUrlInput prop via the callback
    // This is closer to how the component actually behaves.
    mockOnCurrentUrlInputChange.mockImplementation((value) => {
      updateComponentProps(value); // Rerender with new currentUrlInput
    });
    
    await user.type(urlInput, 'https://newurl.com');
    // The mockOnCurrentUrlInputChange should have been called by user.type, triggering rerender.
    // If not, we directly call updateComponentProps if the input component doesn't call onCurrentUrlInputChange on each keystroke.
    // Assuming direct control for clarity here:
    updateComponentProps('https://newurl.com');


    const saveButton = screen.getByRole('button', { name: /save url/i });
    expect(saveButton).not.toBeDisabled();
    await user.click(saveButton);
    
    expect(screen.getByText('https://newurl.com')).toBeInTheDocument(); // This should now be in the document
    expect(JSON.parse(localStorageMock.getItem('driveAnalyzer_savedUrls') || '[]')).toContain('https://newurl.com');
  });

  it('does not save a duplicate URL', async () => {
    const user = userEvent.setup();
    const initialUrl = 'https://exists.com';
    localStorageMock.setItem('driveAnalyzer_savedUrls', JSON.stringify([initialUrl]));
    
    renderComponent(); // Render first
    updateComponentProps(initialUrl); // Then update props

    const saveButton = screen.getByRole('button', { name: /save url/i });
    expect(saveButton).toBeDisabled();

    // Check that it wasn't added again
    const savedUrls = JSON.parse(localStorageMock.getItem('driveAnalyzer_savedUrls') || '[]');
    expect(savedUrls).toHaveLength(1);
    expect(savedUrls).toContain(initialUrl);
  });
  
  it('"Save URL" button is disabled for empty input', () => {
    renderComponent(""); 
    const saveButton = screen.getByRole('button', { name: /save url/i });
    expect(saveButton).toBeDisabled();
  });


  it('populates currentUrlInput when a saved URL is clicked', async () => {
    const user = userEvent.setup();
    const urlToLoad = 'https://loadme.com';
    localStorageMock.setItem('driveAnalyzer_savedUrls', JSON.stringify([urlToLoad, 'https://another.com']));
    
    renderComponent(); // Initial render
    // The component should load saved URLs on mount.

    const savedUrlElement = screen.getByText(urlToLoad); // This should be found
    await user.click(savedUrlElement);

    // The click handler for a saved URL should call onCurrentUrlInputChange
    expect(mockOnCurrentUrlInputChange).toHaveBeenCalledWith(urlToLoad);
    
    // To verify the input field itself, we would need to update the prop via the callback
    // and check screen.getByPlaceholderText('https://example.com').value
    mockOnCurrentUrlInputChange.mockImplementationOnce((value) => {
        updateComponentProps(value);
    });
    // Re-click to trigger the update with the mocked implementation
    await user.click(savedUrlElement); 
    expect(screen.getByPlaceholderText('https://example.com')).toHaveValue(urlToLoad);
  });

  it('deletes a saved URL from the list and localStorage', async () => {
    const user = userEvent.setup();
    const urlToDelete = 'https://deleteme.com';
    const remainingUrl = 'https://keepme.com';
    localStorageMock.setItem('driveAnalyzer_savedUrls', JSON.stringify([urlToDelete, remainingUrl]));
    renderComponent();

    expect(screen.getByText(urlToDelete)).toBeInTheDocument();
    // Find the delete button associated with urlToDelete
    const deleteButton = screen.getByText(urlToDelete).closest('div')?.querySelector('button[title*="Delete"]');
    expect(deleteButton).toBeInTheDocument();

    if (deleteButton) {
      await user.click(deleteButton);
    }
    
    expect(screen.queryByText(urlToDelete)).not.toBeInTheDocument();
    expect(screen.getByText(remainingUrl)).toBeInTheDocument();
    const currentStorage = JSON.parse(localStorageMock.getItem('driveAnalyzer_savedUrls') || '[]');
    expect(currentStorage).not.toContain(urlToDelete);
    expect(currentStorage).toContain(remainingUrl);
  });

  it('"Add URL to Session" button calls onUrlAdd with currentUrlInput', async () => {
    const user = userEvent.setup();
    const urlToAdd = 'https://sessionurl.com';
    renderComponent(); // Initial render
    updateComponentProps(urlToAdd); // Set currentUrlInput via prop update

    const addButton = screen.getByRole('button', { name: /add url to session/i });
    await user.click(addButton);

    expect(mockOnUrlAdd).toHaveBeenCalledWith(urlToAdd);
  });
  
  it('handles malformed JSON in localStorage gracefully', () => {
    localStorageMock.setItem('driveAnalyzer_savedUrls', 'this is not json');
    // Suppress console.error for this specific test
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    renderComponent();
    
    expect(screen.getByText('No URLs saved yet.')).toBeInTheDocument(); // Should default to empty
    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to parse saved URLs from localStorage:", expect.any(Error));
    
    consoleErrorSpy.mockRestore();
  });
});
