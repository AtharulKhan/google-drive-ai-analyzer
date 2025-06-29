
import { useState, useCallback } from 'react';
import { ApifyCrawlingOptions } from '@/utils/apify-api';

export default function useCrawlingOptions() {
  // Crawling options
  const [crawlingOptions, setCrawlingOptions] = useState<ApifyCrawlingOptions>({
    maxCrawlDepth: 1,
    maxCrawlPages: 10,
    maxResults: 10,
    crawlerType: "cheerio", // Using cheerio for faster crawling of static content
    useSitemaps: false,
    includeIndirectLinks: false,
    maxIndirectLinks: 5
  });

  // Handle crawling options
  const handleCrawlingOptionsChange = useCallback((newOptions: Partial<ApifyCrawlingOptions>) => {
    setCrawlingOptions(prev => {
      const updated = { ...prev, ...newOptions };
      
      // Always ensure maxResults is at least as large as maxCrawlPages
      if (updated.maxResults && updated.maxCrawlPages && updated.maxResults < updated.maxCrawlPages) {
        updated.maxResults = updated.maxCrawlPages;
      }
      
      // If including indirect links, also consider that in maxResults
      if (updated.includeIndirectLinks && updated.maxIndirectLinks && updated.maxCrawlPages) {
        const totalPages = updated.maxCrawlPages + updated.maxIndirectLinks;
        if (updated.maxResults && updated.maxResults < totalPages) {
          updated.maxResults = totalPages;
        }
      }
      
      return updated;
    });
  }, []);

  return {
    crawlingOptions,
    setCrawlingOptions,
    handleCrawlingOptionsChange,
  };
}
