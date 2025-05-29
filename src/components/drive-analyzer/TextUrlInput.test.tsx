import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { TextUrlInput } from './TextUrlInput';
import { ApifyCrawlingOptions } from '@/utils/apify-api';

// Basic mocks for props that are not the focus of these specific tests
const mockOnPastedTextChange = jest.fn();
const mockOnUrlAdd = jest.fn();
const mockOnUrlRemove = jest.fn();
const mockOnClearPastedText = jest.fn();
const mockOnClearUrls = jest.fn();
const mockOnCurrentUrlInputChange = jest.fn();
const mockOnCrawlingOptionsChange = jest.fn();
const mockOnSelectedActorChange = jest.fn();
const mockOnArticleExtractorUrlChange = jest.fn();
const mockOnBingSearchQueryChange = jest.fn();
const mockOnRssFeedUrlChange = jest.fn();

const ACTOR_WEBSITE_CRAWLER = "website-crawler";
const ACTOR_ARTICLE_EXTRACTOR = "article-extractor";
const ACTOR_BING_SEARCH = "bing-search";
const ACTOR_RSS_SCRAPER = "rss-scraper";

const defaultProps = {
  pastedText: '',
  onPastedTextChange: mockOnPastedTextChange,
  urls: [],
  onUrlAdd: mockOnUrlAdd,
  onUrlRemove: mockOnUrlRemove,
  onClearPastedText: mockOnClearPastedText,
  onClearUrls: mockOnClearUrls,
  currentUrlInput: '',
  onCurrentUrlInputChange: mockOnCurrentUrlInputChange,
  crawlingOptions: {} as ApifyCrawlingOptions,
  onCrawlingOptionsChange: mockOnCrawlingOptionsChange,
  selectedActor: ACTOR_WEBSITE_CRAWLER,
  onSelectedActorChange: mockOnSelectedActorChange,
  actorWebsiteCrawler: ACTOR_WEBSITE_CRAWLER,
  actorArticleExtractor: ACTOR_ARTICLE_EXTRACTOR,
  actorBingSearch: ACTOR_BING_SEARCH,
  actorRssScraper: ACTOR_RSS_SCRAPER,
  articleExtractorUrl: '',
  onArticleExtractorUrlChange: mockOnArticleExtractorUrlChange,
  bingSearchQuery: '',
  onBingSearchQueryChange: mockOnBingSearchQueryChange,
  rssFeedUrl: '',
  onRssFeedUrlChange: mockOnRssFeedUrlChange,
};

// Mock CrawlingOptions component as its internals are not tested here
jest.mock('./CrawlingOptions', () => ({
    CrawlingOptions: jest.fn(() => <div>Mocked CrawlingOptions</div>),
}));
  

describe('TextUrlInput', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders pasted text area and actor selection dropdown', () => {
    render(<TextUrlInput {...defaultProps} />);
    expect(screen.getByLabelText(/Pasted Text/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Analysis Actor/i)).toBeInTheDocument();
  });

  it('shows Website Crawler inputs by default', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_WEBSITE_CRAWLER} />);
    expect(screen.getByLabelText(/Add URL for Website Crawler/i)).toBeInTheDocument();
    // Saved URLs for crawler is also a good indicator
    expect(screen.getByText(/Saved URLs \(Crawler\):/i)).toBeInTheDocument(); 
  });

  it('calls onSelectedActorChange when a new actor is selected', () => {
    render(<TextUrlInput {...defaultProps} />);
    // The Select component uses radix-ui, which might require careful interaction.
    // We get the trigger first.
    const selectTrigger = screen.getByRole('combobox', { name: /Select Analysis Actor/i });
    fireEvent.mouseDown(selectTrigger); // Open the dropdown

    // Then find and click the desired item.
    // Ensure the text matches exactly what's in the SelectItem
    const articleExtractorOption = screen.getByText('Article Extractor (Single URL)');
    fireEvent.click(articleExtractorOption);
    
    expect(mockOnSelectedActorChange).toHaveBeenCalledWith(ACTOR_ARTICLE_EXTRACTOR);
  });

  it('shows Article Extractor URL input when selected', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_ARTICLE_EXTRACTOR} />);
    expect(screen.getByLabelText(/Article URL/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/Add URL for Website Crawler/i)).not.toBeInTheDocument();
  });

  it('calls onArticleExtractorUrlChange when Article Extractor URL changes', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_ARTICLE_EXTRACTOR} />);
    const input = screen.getByLabelText(/Article URL/i);
    fireEvent.change(input, { target: { value: 'https://example.com/article' } });
    expect(mockOnArticleExtractorUrlChange).toHaveBeenCalledWith('https://example.com/article');
  });

  it('shows Bing Search Query input when selected', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_BING_SEARCH} />);
    expect(screen.getByLabelText(/Bing Search Query/i)).toBeInTheDocument();
  });

  it('calls onBingSearchQueryChange when Bing Search Query changes', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_BING_SEARCH} />);
    const input = screen.getByLabelText(/Bing Search Query/i);
    fireEvent.change(input, { target: { value: 'test query' } });
    expect(mockOnBingSearchQueryChange).toHaveBeenCalledWith('test query');
  });

  it('shows RSS Feed URL input when selected', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_RSS_SCRAPER} />);
    expect(screen.getByLabelText(/RSS Feed URL/i)).toBeInTheDocument();
  });

  it('calls onRssFeedUrlChange when RSS Feed URL changes', () => {
    render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_RSS_SCRAPER} />);
    const input = screen.getByLabelText(/RSS Feed URL/i);
    fireEvent.change(input, { target: { value: 'https://example.com/feed.xml' } });
    expect(mockOnRssFeedUrlChange).toHaveBeenCalledWith('https://example.com/feed.xml');
  });
  
  it('renders CrawlingOptions only when Website Crawler is selected and has URLs', () => {
    const { rerender } = render(<TextUrlInput {...defaultProps} selectedActor={ACTOR_WEBSITE_CRAWLER} urls={['https://example.com']} />);
    expect(screen.getByText('Mocked CrawlingOptions')).toBeInTheDocument();

    rerender(<TextUrlInput {...defaultProps} selectedActor={ACTOR_WEBSITE_CRAWLER} urls={[]} />);
    expect(screen.queryByText('Mocked CrawlingOptions')).not.toBeInTheDocument();

    rerender(<TextUrlInput {...defaultProps} selectedActor={ACTOR_ARTICLE_EXTRACTOR} urls={['https://example.com']} />);
    expect(screen.queryByText('Mocked CrawlingOptions')).not.toBeInTheDocument();
  });
});
