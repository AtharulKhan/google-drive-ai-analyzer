
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { UnifiedContentView } from './UnifiedContentView'; // Adjust path as necessary
import { toast } from 'sonner'; // Mock this

// Mock sonner
jest.mock('sonner', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock navigator.clipboard
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: jest.fn().mockResolvedValue(undefined),
    // readText: jest.fn().mockResolvedValue('mocked clipboard text'), // If needed for other tests
  },
  configurable: true,
});

// Mock the Markdown component to check its props and simulate basic rendering
jest.mock('@/components/ui/markdown', () => ({
  Markdown: jest.fn(({ content }) => <div data-testid="mocked-markdown">{content}</div>),
}));


describe('UnifiedContentView', () => {
  const initialContent = "Line one\nLine two with searchterm\nLine three";
  const initialMarkdownContent = "## Markdown Header\n* A list item";

  beforeEach(() => {
    // Clear mocks before each test
    (toast.success as jest.Mock).mockClear();
    (toast.error as jest.Mock).mockClear(); // Also clear error if it's used
    (navigator.clipboard.writeText as jest.Mock).mockClear();
    (require('@/components/ui/markdown').Markdown as jest.Mock).mockClear();
  });

  test('renders with initial content and UI elements', () => {
    render(<UnifiedContentView initialContent={initialContent} />);
    expect(screen.getByPlaceholderText('Search content...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /copy content/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/show as markdown/i)).toBeInTheDocument();
    // Textarea renders newlines correctly
    expect(screen.getByRole('textbox')).toHaveValue(initialContent);
  });

  test('search functionality filters content (case-insensitive)', () => {
    render(<UnifiedContentView initialContent={initialContent} />);
    const searchInput = screen.getByPlaceholderText('Search content...');
    
    fireEvent.change(searchInput, { target: { value: 'searchterm' } });
    expect(screen.getByRole('textbox')).toHaveValue('Line two with searchterm');
    
    fireEvent.change(searchInput, { target: { value: 'SEARCHTERM' } });
    expect(screen.getByRole('textbox')).toHaveValue('Line two with searchterm');

    fireEvent.change(searchInput, { target: { value: '' } });
    expect(screen.getByRole('textbox')).toHaveValue(initialContent);
  });

  test('Markdown toggle switches view and passes correct content to Markdown component', () => {
    const { Markdown: MockedMarkdown } = require('@/components/ui/markdown');
    render(<UnifiedContentView initialContent={initialMarkdownContent} />);
    const markdownToggle = screen.getByLabelText(/show as markdown/i);

    // Initially, should show Textarea
    expect(screen.getByRole('textbox')).toHaveValue(initialMarkdownContent);
    expect(MockedMarkdown).not.toHaveBeenCalled();
    expect(screen.queryByTestId('mocked-markdown')).not.toBeInTheDocument();

    fireEvent.click(markdownToggle);

    // After toggle, should show Markdown
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(MockedMarkdown).toHaveBeenCalledWith({ content: initialMarkdownContent }, {});
    expect(screen.getByTestId('mocked-markdown')).toHaveTextContent(initialMarkdownContent);

    // Toggle back to Textarea
    fireEvent.click(markdownToggle);
    expect(screen.getByRole('textbox')).toHaveValue(initialMarkdownContent);
    expect(screen.queryByTestId('mocked-markdown')).not.toBeInTheDocument();
  });
  
  test('Markdown toggle with search term filters content for Markdown view', () => {
    const { Markdown: MockedMarkdown } = require('@/components/ui/markdown');
    render(<UnifiedContentView initialContent={initialMarkdownContent} />);
    const markdownToggle = screen.getByLabelText(/show as markdown/i);
    const searchInput = screen.getByPlaceholderText('Search content...');

    fireEvent.change(searchInput, { target: { value: 'list item' } });
    
    // Switch to Markdown view
    fireEvent.click(markdownToggle);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(MockedMarkdown).toHaveBeenCalledWith({ content: "* A list item" }, {});
    expect(screen.getByTestId('mocked-markdown')).toHaveTextContent("* A list item");
  });


  test('copy button copies content and shows toast', async () => {
    render(<UnifiedContentView initialContent={initialContent} />);
    const copyButton = screen.getByRole('button', { name: /copy content/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(initialContent);
    expect(toast.success).toHaveBeenCalledWith('Content copied to clipboard!');
  });
  
  test('copy button copies filtered content', async () => {
    render(<UnifiedContentView initialContent={initialContent} />);
    const searchInput = screen.getByPlaceholderText('Search content...');
    fireEvent.change(searchInput, { target: { value: 'searchterm' } });
    
    const copyButton = screen.getByRole('button', { name: /copy content/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('Line two with searchterm');
    expect(toast.success).toHaveBeenCalledWith('Content copied to clipboard!');
  });

  test('copy button shows error toast on failure', async () => {
    (navigator.clipboard.writeText as jest.Mock).mockRejectedValueOnce(new Error('Copy failed'));
    render(<UnifiedContentView initialContent={initialContent} />);
    const copyButton = screen.getByRole('button', { name: /copy content/i });
    fireEvent.click(copyButton);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(initialContent);
    await screen.findByText('Failed to copy content.'); // Wait for async toast error
    expect(toast.error).toHaveBeenCalledWith('Failed to copy content.');
  });


  test('displays editing message when isEditable is true', () => {
    const mockOnContentChange = jest.fn();
    render(
      <UnifiedContentView
        initialContent={initialContent}
        isEditable={true}
        onContentChange={mockOnContentChange}
      />
    );
    expect(screen.getByText(/This view shows extracted content from all sources. You can edit it here, but changes won't affect the original sources./i)).toBeInTheDocument();
    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('readonly');

    // Simulate typing
    const newTypedContent = "new content";
    fireEvent.change(textarea, { target: { value: newTypedContent } });
    expect(mockOnContentChange).toHaveBeenCalledWith(newTypedContent);
    expect(textarea).toHaveValue(newTypedContent); // also check if textarea value updates
  });

  test('content updates if initialContent prop changes', () => {
    const { rerender } = render(<UnifiedContentView initialContent="Original Content" />);
    expect(screen.getByRole('textbox')).toHaveValue('Original Content');

    rerender(<UnifiedContentView initialContent="Updated Content" />);
    expect(screen.getByRole('textbox')).toHaveValue('Updated Content');
  });

});
