import { useState, useCallback, useEffect } from 'react';
import { ApifyCrawlingOptions } from '@/utils/apify-api';
import { toast } from 'sonner';
import { GoogleFile } from '@/hooks/useDrivePicker';
import { SavedAnalysisSource } from '@/components/drive-analyzer/SavedAnalysisDetailView';

// Constants
export const SAVED_PROMPTS_KEY = "drive-analyzer-saved-prompts";
export const CUSTOM_INSTRUCTIONS_KEY = "drive-analyzer-custom-instructions";
export const SAVED_ANALYSES_KEY = "drive-analyzer-saved-analyses";
export const WEBHOOK_URL_KEY = "drive-analyzer-webhook-url";

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
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  
  // Text/URL inputs state
  const [pastedText, setPastedText] = useState<string>("");
  const [currentUrlInput, setCurrentUrlInput] = useState<string>("");
  const [urls, setUrls] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  
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
  
  // Prompts and analysis state
  const [userPrompt, setUserPrompt] = useState("Summarize this content in detail, highlighting key points and insights.");
  const [aiOutput, setAiOutput] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [selectedAnalysisIdsForPrompt, setSelectedAnalysisIdsForPrompt] = useState<string[]>([]);
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

    const loadedWebhookUrl = localStorage.getItem(WEBHOOK_URL_KEY);
    if (loadedWebhookUrl) {
      setWebhookUrl(loadedWebhookUrl);
    }
  }, []);

  // Save webhookUrl to localStorage when it changes
  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem(WEBHOOK_URL_KEY, webhookUrl);
    } else {
      localStorage.removeItem(WEBHOOK_URL_KEY); // Clear if empty
    }
  }, [webhookUrl]);
  
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

  // Handle local file operations
  const handleAddLocalFiles = useCallback((newFiles: File[]) => {
    setLocalFiles(prev => [...prev, ...newFiles]);
  }, []);

  const handleRemoveLocalFile = useCallback((fileKey: string) => {
    setLocalFiles(prev => prev.filter(file => `${file.name}-${file.lastModified}` !== fileKey));
  }, []);

  const handleClearLocalFiles = useCallback(() => {
    setLocalFiles([]);
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

  // Handle webhook URL change
  const handleWebhookUrlChange = useCallback((url: string) => {
    setWebhookUrl(url);
  }, []);

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

  // Handle selection of saved analyses for prompt
  const toggleAnalysisSelectionForPrompt = useCallback((analysisId: string) => {
    setSelectedAnalysisIdsForPrompt(prevSelectedIds =>
      prevSelectedIds.includes(analysisId)
        ? prevSelectedIds.filter(id => id !== analysisId)
        : [...prevSelectedIds, analysisId]
    );
  }, []);

  const handleImportAnalysis = useCallback((analysisToImport: SavedAnalysis): { success: boolean; message: string } => {
    if (savedAnalyses.some(analysis => analysis.id === analysisToImport.id)) {
      const message = `Analysis with ID "${analysisToImport.id}" already exists.`;
      toast.warning(message);
      return { success: false, message };
    }

    setSavedAnalyses(prevAnalyses => {
      const updatedAnalyses = [analysisToImport, ...prevAnalyses];
      localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses));
      return updatedAnalyses;
    });

    const message = `Analysis "${analysisToImport.title}" imported successfully.`;
    toast.success(message);
    return { success: true, message };
  }, [savedAnalyses]);

  return {
    // Files
    selectedFiles,
    setSelectedFiles,
    displayFiles,
    handleAddFiles,
    handleRemoveFile,
    handleClearFiles,
    
    // Local files
    localFiles,
    setLocalFiles,
    handleAddLocalFiles,
    handleRemoveLocalFile,
    handleClearLocalFiles,
    
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
    webhookUrl,
    handleWebhookUrlChange,
    
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
    selectedAnalysisIdsForPrompt,
    toggleAnalysisSelectionForPrompt,
    handleImportAnalysis, // Export the new handler
  };
}
