import { useState, useCallback, useEffect } from 'react';
import { ApifyCrawlingOptions } from '@/utils/apify-api';
import { toast } from 'sonner';
import { GoogleFile } from '@/hooks/useDrivePicker';
import { SavedAnalysisSource } from '@/components/drive-analyzer/SavedAnalysisDetailView';

// Constants
export const SAVED_PROMPTS_KEY = "drive-analyzer-saved-prompts";
export const CUSTOM_INSTRUCTIONS_KEY = "drive-analyzer-custom-instructions";
export const SAVED_ANALYSES_KEY = "drive-analyzer-saved-analyses";

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface SavedAnalysis {
  id: string;
  title: string;
  timestamp: number;
  prompt: string;
  aiOutput: string;
  sources: SavedAnalysisSource[];
}

export interface ProcessingStatus {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  totalFiles: number;
  processedFiles: number;
}

export default function useAnalysisState() {
  // Files state
  const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([]);
  const [displayFiles, setDisplayFiles] = useState<GoogleFile[]>([]);
  
  // Text/URL inputs state
  const [pastedText, setPastedText] = useState<string>("");
  const [currentUrlInput, setCurrentUrlInput] = useState<string>("");
  const [urls, setUrls] = useState<string[]>([]);
  
  // Crawling options with better defaults for browser environment
  const [crawlingOptions, setCrawlingOptions] = useState<ApifyCrawlingOptions>({
    maxCrawlDepth: 0,     // Default to crawling only the URL (no links)
    maxCrawlPages: 1,     // Default to crawling just the URL itself
    maxResults: 1,        // Default to storing only 1 result
    crawlerType: "cheerio", // Default to faster HTML parsing instead of browser
    useSitemaps: false    // Default to not using sitemaps
  });
  
  // Prompts and analysis state
  const [userPrompt, setUserPrompt] = useState("Summarize this content in detail, highlighting key points and insights.");
  const [aiOutput, setAiOutput] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentStep: "",
    progress: 0,
    totalFiles: 0,
    processedFiles: 0,
  });
  const [activeTab, setActiveTab] = useState("files");
  
  // Load saved data from localStorage
  useEffect(() => {
    const loadedPrompts = localStorage.getItem(SAVED_PROMPTS_KEY);
    if (loadedPrompts) {
      setSavedPrompts(JSON.parse(loadedPrompts));
    }
    
    const loadedAnalyses = localStorage.getItem(SAVED_ANALYSES_KEY);
    if (loadedAnalyses) {
      setSavedAnalyses(JSON.parse(loadedAnalyses));
    }
  }, []);
  
  // When selected files change, update display files
  useEffect(() => {
    setDisplayFiles(selectedFiles.slice(0, 100)); // Limit display to first 100 files
  }, [selectedFiles]);
  
  // Handle file operations
  const handleAddFiles = useCallback((newFiles: GoogleFile[]) => {
    setSelectedFiles(prev => {
      // Merge new files with existing ones, avoiding duplicates by file ID
      const existingFileIds = new Set(prev.map(file => file.id));
      const filesToAdd = newFiles.filter(file => !existingFileIds.has(file.id));
      
      return [...prev, ...filesToAdd];
    });
  }, []);
  
  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);
  
  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    setDisplayFiles([]);
  }, []);
  
  // Handle URL operations
  const handleAddUrl = useCallback((url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setUrls(prev => [...prev, url]);
    } else {
      toast.error("Please enter a valid URL (starting with http:// or https://)");
    }
  }, []);
  
  const handleRemoveUrl = useCallback((index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleClearUrls = useCallback(() => {
    setUrls([]);
  }, []);

  // Handle crawling options
  const handleCrawlingOptionsChange = useCallback((newOptions: ApifyCrawlingOptions) => {
    setCrawlingOptions(prev => {
      // Ensure we don't overwrite options with undefined values
      const updatedOptions = { ...prev };
      
      // Only update properties that are explicitly set in newOptions
      Object.keys(newOptions).forEach(key => {
        const typedKey = key as keyof ApifyCrawlingOptions;
        if (newOptions[typedKey] !== undefined) {
          updatedOptions[typedKey] = newOptions[typedKey];
        }
      });
      
      return updatedOptions;
    });
  }, []);
  
  // Handle text operations
  const handlePastedTextChange = useCallback((text: string) => {
    setPastedText(text);
  }, []);
  
  const handleClearPastedText = useCallback(() => {
    setPastedText("");
  }, []);

  // Handle saved analyses operations
  const handleSaveAnalysis = useCallback((analysis: SavedAnalysis) => {
    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = [analysis, ...prevAnalyses];
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      return updatedAnalyses;
    });
    toast.success("Analysis saved successfully!");
  }, []);

  const handleRenameAnalysis = useCallback((id: string, newTitle: string) => {
    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = prevAnalyses.map(analysis =>
        analysis.id === id ? { ...analysis, title: newTitle } : analysis
      );
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      toast.success("Analysis renamed successfully!");
      return updatedAnalyses;
    });
  }, []);
  
  const handleDeleteAnalysis = useCallback((id: string) => {
    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = prevAnalyses.filter(analysis => analysis.id !== id);
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      toast.success("Analysis deleted successfully!");
      return updatedAnalyses;
    });
  }, []);
  
  const handleDeleteAllAnalyses = useCallback(() => {
    setSavedAnalyses([]);
    localStorage.removeItem(SAVED_ANALYSES_KEY);
    toast.success("All saved analyses have been deleted!");
  }, []);

  return {
    // Files
    selectedFiles,
    setSelectedFiles,
    displayFiles,
    handleAddFiles,
    handleRemoveFile,
    handleClearFiles,
    
    // Text/URL inputs
    pastedText,
    setPastedText,
    handlePastedTextChange,
    handleClearPastedText,
    currentUrlInput,
    setCurrentUrlInput,
    urls,
    setUrls,
    handleAddUrl,
    handleRemoveUrl,
    handleClearUrls,
    
    // Crawling options
    crawlingOptions,
    setCrawlingOptions,
    handleCrawlingOptionsChange,
    
    // Analysis state
    userPrompt,
    setUserPrompt,
    aiOutput,
    setAiOutput,
    processingStatus,
    setProcessingStatus,
    activeTab,
    setActiveTab,
    
    // Saved items
    savedPrompts,
    setSavedPrompts,
    savedAnalyses,
    setSavedAnalyses,
    handleSaveAnalysis,
    handleRenameAnalysis,
    handleDeleteAnalysis,
    handleDeleteAllAnalyses,
  };
}
