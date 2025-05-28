
import React from 'react';
import { render, screen, fireEvent, act, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom'; // Required by Link component in DriveAnalyzer
import DriveAnalyzerPage from './DriveAnalyzerPage';

// --- Mocks ---

// 1. LocalStorage
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
    length: 0, // Added length property
    key: (index: number) => null, // Added key method
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// 2. Google Auth Hook
vi.mock('@/hooks/useGoogleAuth', () => ({
  useGoogleAuth: () => ({
    isSignedIn: true, // Assume user is signed in for relevant tests
    accessToken: 'mock_access_token',
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn(),
  }),
}));

// 3. Google Drive Picker Hook
vi.mock('@/hooks/useDrivePicker', () => ({
  useDrivePicker: () => ({
    openPicker: vi.fn(),
    isReady: true, // Assume picker is ready
  }),
}));

// 4. API Utils (simplified)
vi.mock('@/utils/google-api', () => ({
  fetchFileContent: vi.fn(async (file, token) => `mock content for ${file.name}`),
}));
vi.mock('@/utils/openrouter-api', () => ({
  analyzeWithOpenRouter: vi.fn(async () => 'mock AI output'),
}));
vi.mock('@/utils/apify-api', () => ({
  analyzeMultipleUrlsWithApify: vi.fn(async (urls) => ({
    combinedAnalyzedText: urls.map(url => `mock content for ${url}`).join('\\n'),
    failedUrls: [],
  })),
}));

// 5. UI Components that might be problematic if not deeply mocked (e.g., sonner for toasts)
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  }
}));

// Mock UI Components
vi.mock('@/components/ui/button', async (importOriginal) => { // Assuming Button is correctly mocked
  const actual = await importOriginal<typeof import('@/components/ui/button')>();
  return {
    ...actual,
    Button: React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: string; disabled?: boolean }>(
      ({ children, onClick, variant, disabled, ...props }, ref) => (
        <button ref={ref} onClick={onClick} {...props} data-variant={variant} disabled={disabled}>
          {children}
        </button>
      )
    ),
  };
});

vi.mock('@/components/ui/badge', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/components/ui/badge')>();
  return {
    ...actual,
    Badge: React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: string }>(
      ({ children, className, variant, ...props }, ref) => (
        <div ref={ref} {...props} className={`${className} badge-mock`} data-variant={variant}>
          {children}
        </div>
      )
    ),
  };
});

import { within } from '@testing-library/react'; // Ensure this is at the top level and uncommented

describe('DriveAnalyzerPage Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks(); // Clear all mocks before each test
  });

  const renderPage = () => {
    render(
      <MemoryRouter>
        <DriveAnalyzerPage />
      </MemoryRouter>
    );
  };

  describe('Local File Input Integration', () => {
    it('allows selecting local files and displays them in FileList', async () => {
      const user = userEvent.setup();
      renderPage();

      // Find the hidden file input via its data-testid in LocalFileInput
      const fileInput = screen.getByTestId('local-file-input') as HTMLInputElement;
      
      const file1 = new File(['content1'], 'localFile1.txt', { type: 'text/plain' });
      const file2 = new File(['content2'], 'localFile2.pdf', { type: 'application/pdf' });

      // Simulate file selection
      await act(async () => {
        user.upload(fileInput, [file1, file2]);
      });
      
      // Wait for FileList to update
      // Check for file names, types, and sizes
      await waitFor(() => {
        expect(screen.getByText('localFile1.txt')).toBeInTheDocument();
        expect(screen.getByText('localFile2.pdf')).toBeInTheDocument();
      });

      // Check for type and size badges more robustly
      await waitFor(async () => { // Outer waitFor, callback is async
        const file1Row = screen.getByText('localFile1.txt').closest('li');
        expect(file1Row).toBeInTheDocument();
        if (file1Row) {
          // No nested waitFor here
          const file1Badges = within(file1Row).getAllByText((content, element) => {
            return !!element?.getAttribute('class')?.includes('badge-mock');
          });
          expect(file1Badges.find(b => b.textContent === 'plain')).toBeInTheDocument();
          expect(file1Badges.find(b => b.textContent === '8 Bytes')).toBeInTheDocument();
        }

        const file2Row = screen.getByText('localFile2.pdf').closest('li');
        expect(file2Row).toBeInTheDocument();
        if (file2Row) {
          const file2Badges = within(file2Row).getAllByText((content, element) => {
            return !!element?.getAttribute('class')?.includes('badge-mock');
          });
          expect(file2Badges.find(b => b.textContent === 'pdf')).toBeInTheDocument();
          expect(file2Badges.find(b => b.textContent === '8 Bytes')).toBeInTheDocument();
        }
      }); // End of single waitFor
      
      // Check total files count badge (e.g., "2 file(s)")
      // The badge containing the count might be generic, let's find it by its text content
      // and ensure it's a badge via our mock.
      // It shows "X file(s)" - we have 2 local files
      expect(screen.getByText('2 file(s)')).toBeInTheDocument();
    });
  });

  describe('URL Saving and Loading Integration', () => {
    it('allows saving, loading, and adding URLs to session', async () => {
      const user = userEvent.setup();
      renderPage();

      const urlInput = screen.getByPlaceholderText('https://example.com') as HTMLInputElement;
      const saveUrlButton = screen.getByRole('button', { name: /save url/i });
      const addUrlToSessionButton = screen.getByRole('button', { name: /add url to session/i });

      // 1. Save a URL
      await user.type(urlInput, 'https://saved.com');
      await user.click(saveUrlButton);

      await waitFor(() => {
        // Verify it's in "Saved URLs" list
        expect(screen.getByText('https://saved.com')).toBeInTheDocument();
        // Check localStorage (optional here, as TextUrlInput unit test covers it, but good for integration sanity)
        expect(JSON.parse(localStorageMock.getItem('driveAnalyzer_savedUrls') || '[]')).toContain('https://saved.com');
      });
      
      // Clear input for next step (user would do this or it's done by some actions)
      await user.clear(urlInput);

      // 2. Load the saved URL into input
      const savedUrlEntry = screen.getByText('https://saved.com'); // In the "Saved URLs" list
      await user.click(savedUrlEntry);
      
      await waitFor(() => {
        expect(urlInput.value).toBe('https://saved.com');
      });

      // 3. Add the loaded URL (or a new one) to session
      await user.clear(urlInput); // Clear previous
      await user.type(urlInput, 'https://session.com');
      await user.click(addUrlToSessionButton);

      // Verify it's in "URLs for Current Session" list
      await waitFor(() => {
        // Find the "URLs for Current Session:" label
        const sessionUrlsLabel = screen.getByText('URLs for Current Session:');
        // Find the parent div that should contain the list of session URL badges
        const sessionUrlsContainer = sessionUrlsLabel.closest('div');
        expect(sessionUrlsContainer).toBeInTheDocument();

        if (sessionUrlsContainer) {
          // Session URLs are displayed in Badge components. Each badge contains a span with the URL.
          // We look for a span that starts with 'https://session.com' within this container.
          const sessionUrlSpan = within(sessionUrlsContainer).getByText((content, element) => {
            return element?.tagName.toLowerCase() === 'span' && content.startsWith('https://session.com');
          });
          expect(sessionUrlSpan).toBeInTheDocument();
          
          // Ensure this span's parent is the badge mock
          const parentBadge = sessionUrlSpan.parentElement;
          expect(parentBadge).toHaveClass('badge-mock'); // Check class from our badge mock
          expect(parentBadge).toBeInTheDocument();
        }
      });
      
      // Ensure the URL is still in saved (if it was saved)
      expect(screen.getByText('https://saved.com')).toBeInTheDocument(); 
      // And not in saved if it wasn't explicitly saved
      // Check within the "Saved URLs" list specifically
      const savedUrlsLabel = screen.getByText('Saved URLs:');
      const savedUrlsContainer = savedUrlsLabel.closest('div');
      expect(savedUrlsContainer).toBeInTheDocument();
      if (savedUrlsContainer) {
          expect(within(savedUrlsContainer).queryByText('https://session.com')).toBeNull();
      }
    });
  });
});
