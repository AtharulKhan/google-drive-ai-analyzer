import React, { useState, useEffect, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Markdown } from "@/components/ui/markdown";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { FolderOpen, Loader2, RefreshCw, Settings, Trash2, Combine, Upload, Zap } from "lucide-react"; // Added Zap for Fetch Data
import { toast } from "sonner";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useDrivePicker } from "@/hooks/useDrivePicker";
import { fetchFileContent } from "@/utils/google-api";
import { analyzeWithOpenRouter } from "@/utils/openrouter-api";
import { getDefaultAIModel } from "@/utils/ai-models";
import { 
  analyzeMultipleUrlsWithApify, 
  extractArticleWithApify,
  searchWithBingScraper,
  scrapeRssFeedWithApify,
  ArticleExtractorSmartInput,
  BingSearchScraperInput,
  RssXmlScraperInput,
  ApifyCrawlingOptions 
} from "@/utils/apify-api";
import useAnalysisState, {
  CUSTOM_INSTRUCTIONS_KEY,
  SAVED_PROMPTS_KEY,
  SavedPrompt,
  SavedAnalysis
} from "@/hooks/useAnalysisState";
import { processLocalFiles } from "@/utils/local-file-processor";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { UnifiedContentView } from '@/components/common/UnifiedContentView';

// Import our components
import { FileList } from "./drive-analyzer/FileList";
import { TextUrlInput } from "./drive-analyzer/TextUrlInput";
import { SavedPrompts } from "./drive-analyzer/SavedPrompts";
import { SavedAnalysesSidebar } from "./drive-analyzer/SavedAnalysesSidebar"; 
import { SavedAnalysisDetailView, SavedAnalysisSource } from "./drive-analyzer/SavedAnalysisDetailView";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
import { History } from "lucide-react";
import { PromptSelector } from "./drive-analyzer/PromptSelector";
import { AnalysisResults } from "./drive-analyzer/AnalysisResults";
import { ConfigurationOptions } from "./drive-analyzer/ConfigurationOptions";

// Constants
const MAX_DOC_CHARS = 200000;
const DEFAULT_MAX_FILES = 20;

export default function DriveAnalyzer() {
  const {
    selectedFiles, setSelectedFiles, displayFiles, handleAddFiles, handleRemoveFile, handleClearFiles,
    pastedText, handlePastedTextChange, handleClearPastedText,
    currentUrlInput, setCurrentUrlInput, urls, handleAddUrl, handleRemoveUrl, handleClearUrls,
    crawlingOptions, handleCrawlingOptionsChange, // This is for WebsiteCrawler, managed by actorSpecificOptions now
    userPrompt, setUserPrompt, aiOutput, setAiOutput,
    processingStatus, setProcessingStatus, // Note: processingStatus is now for AI analysis phase
    activeTab, setActiveTab,
    savedPrompts, setSavedPrompts, savedAnalyses, handleSaveAnalysis,
    handleRenameAnalysis, handleDeleteAnalysis, handleDeleteAllAnalyses,
    selectedAnalysisIdsForPrompt, toggleAnalysisSelectionForPrompt,
  } = useAnalysisState();

  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isUnifiedViewOpen, setIsUnifiedViewOpen] = useState(false);
  const [aiModel, setAiModel] = useState<string>(getDefaultAIModel());
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [customInstructions, setCustomInstructions] = useState<string>("");

  const ACTOR_WEBSITE_CRAWLER = "website-crawler";
  const ACTOR_ARTICLE_EXTRACTOR = "article-extractor";
  const ACTOR_BING_SEARCH = "bing-search";
  const ACTOR_RSS_SCRAPER = "rss-scraper";

  const [selectedActor, setSelectedActor] = useState<string>(ACTOR_WEBSITE_CRAWLER);
  const [articleExtractorUrl, setArticleExtractorUrl] = useState<string>("");
  const [bingSearchQuery, setBingSearchQuery] = useState<string>("");
  const [rssFeedUrl, setRssFeedUrl] = useState<string>("");

  const initialWebsiteCrawlerOptions: ApifyCrawlingOptions = {
    maxCrawlDepth: 0, maxCrawlPages: 1, maxResults: 1, crawlerType: "cheerio",
    useSitemaps: false, includeIndirectLinks: false, maxIndirectLinks: 5,
  };

  const [actorSpecificOptions, setActorSpecificOptions] = useState<Record<string, any>>({
    [ACTOR_WEBSITE_CRAWLER]: { ...initialWebsiteCrawlerOptions },
    [ACTOR_ARTICLE_EXTRACTOR]: { mustHaveDate: false, minWords: 50 } as Partial<ArticleExtractorSmartInput>,
    [ACTOR_BING_SEARCH]: { maxPagesPerQuery: 1, resultsPerPage: 10 } as Partial<BingSearchScraperInput>,
    [ACTOR_RSS_SCRAPER]: { handleFromAtom: true, handleFromRdf: true, xmlToJson: false, maxItems: 25 } as Partial<RssXmlScraperInput>,
  });

  useEffect(() => {
    handleCrawlingOptionsChange(actorSpecificOptions[ACTOR_WEBSITE_CRAWLER]);
  }, [actorSpecificOptions[ACTOR_WEBSITE_CRAWLER], handleCrawlingOptionsChange]);

  const handleActorOptionChange = useCallback((actor: string, optionName: string, value: any) => {
    setActorSpecificOptions(prev => {
      const newOptionsForActor = { ...prev[actor], [optionName]: value };
      if (actor === ACTOR_WEBSITE_CRAWLER) {
        if (optionName === 'maxCrawlPages' && newOptionsForActor.maxResults < value) newOptionsForActor.maxResults = value;
        if (newOptionsForActor.includeIndirectLinks && newOptionsForActor.maxIndirectLinks && newOptionsForActor.maxCrawlPages) {
          const totalPages = newOptionsForActor.maxCrawlPages + newOptionsForActor.maxIndirectLinks;
          if (newOptionsForActor.maxResults < totalPages) newOptionsForActor.maxResults = totalPages;
        }
      }
      return { ...prev, [actor]: newOptionsForActor };
    });
  }, []);

  const [fetchedActorData, setFetchedActorData] = useState<string | null>(null);
  const [isFetchingData, setIsFetchingData] = useState<boolean>(false);
  const [fetchedDataSources, setFetchedDataSources] = useState<SavedAnalysisSource[]>([]);

  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isPromptCommandOpen, setIsPromptCommandOpen] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<SavedAnalysis | null>(null);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { isSignedIn, accessToken, loading, signIn, signOut } = useGoogleAuth();
  const { openPicker, isReady } = useDrivePicker({ accessToken });

  useEffect(() => {
    const savedInstructions = localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY);
    if (savedInstructions) setCustomInstructions(savedInstructions);
  }, []);

  useEffect(() => {
    if (customInstructions !== undefined) localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
  }, [customInstructions]);

  const isActorInputValid = useCallback(() => {
    if (selectedActor === ACTOR_WEBSITE_CRAWLER) return urls.length > 0;
    if (selectedActor === ACTOR_ARTICLE_EXTRACTOR) return articleExtractorUrl.trim() !== "";
    if (selectedActor === ACTOR_BING_SEARCH) return bingSearchQuery.trim() !== "";
    if (selectedActor === ACTOR_RSS_SCRAPER) return rssFeedUrl.trim() !== "";
    return false;
  }, [selectedActor, urls, articleExtractorUrl, bingSearchQuery, rssFeedUrl]);

  const handleFetchData = useCallback(async () => {
    if (!isActorInputValid()) {
      toast.error("Please provide the required input for the selected actor.");
      return;
    }
    if (processingStatus.isProcessing || isFetchingData) {
      toast.info("Please wait for the current operation to complete.");
      return;
    }

    setIsFetchingData(true);
    setFetchedActorData(null);
    setAiOutput(""); 
    setFetchedDataSources([]); 

    const currentActorOpts = actorSpecificOptions[selectedActor] || {};
    let operationResult = null; 
    let sourcesForCurrentFetch: SavedAnalysisSource[] = [];

    try {
      toast.info(`Fetching data using ${selectedActor}...`);
      if (selectedActor === ACTOR_WEBSITE_CRAWLER) {
        const webCrawlerEffectiveOpts = { ...initialWebsiteCrawlerOptions, ...currentActorOpts } as ApifyCrawlingOptions;
        const webCrawlResult = await analyzeMultipleUrlsWithApify(urls, webCrawlerEffectiveOpts);
        if (webCrawlResult.failedUrls.length > 0) toast.warning(`Some URLs failed: ${webCrawlResult.failedUrls.join(', ')}`);
        if (webCrawlResult.combinedAnalyzedText.trim() !== "") {
          operationResult = { analyzedText: webCrawlResult.combinedAnalyzedText, error: null };
          urls.forEach(url => sourcesForCurrentFetch.push({ type: 'url', name: url, actor: ACTOR_WEBSITE_CRAWLER }));
        } else if (webCrawlResult.failedUrls.length === urls.length) {
          operationResult = { analyzedText: "", error: "All URLs failed to process." };
        } else {
          operationResult = { analyzedText: "", error: "No content fetched, some URLs may have failed." };
        }
      } else if (selectedActor === ACTOR_ARTICLE_EXTRACTOR) {
        const articleInput: ArticleExtractorSmartInput = { startUrls: [{ url: articleExtractorUrl }], ...currentActorOpts };
        operationResult = await extractArticleWithApify(articleInput);
        if (!operationResult.error) sourcesForCurrentFetch.push({ type: 'url', name: articleExtractorUrl, actor: ACTOR_ARTICLE_EXTRACTOR });
      } else if (selectedActor === ACTOR_BING_SEARCH) {
        const bingInput: BingSearchScraperInput = { queries: bingSearchQuery, ...currentActorOpts };
        operationResult = await searchWithBingScraper(bingInput);
        if (!operationResult.error) sourcesForCurrentFetch.push({ type: 'search', name: bingSearchQuery, actor: ACTOR_BING_SEARCH });
      } else if (selectedActor === ACTOR_RSS_SCRAPER) {
        const rssInput: RssXmlScraperInput = { url: rssFeedUrl, ...currentActorOpts };
        operationResult = await scrapeRssFeedWithApify(rssInput);
        if (!operationResult.error) sourcesForCurrentFetch.push({ type: 'feed', name: rssFeedUrl, actor: ACTOR_RSS_SCRAPER });
      }

      if (operationResult && !operationResult.error && operationResult.analyzedText.trim() !== "") {
        setFetchedActorData(operationResult.analyzedText);
        setFetchedDataSources(sourcesForCurrentFetch);
        toast.success("Data fetched successfully!");
      } else if (operationResult && operationResult.error) {
        toast.error(`Failed to fetch data: ${operationResult.error}`);
        setFetchedActorData(null); setFetchedDataSources([]);
      } else if (operationResult && operationResult.analyzedText.trim() === "") {
         setFetchedActorData(""); 
         setFetchedDataSources(sourcesForCurrentFetch);
         toast.info("Actor ran but returned no text content.");
      } else {
        toast.error("Selected actor did not return data or an unknown error occurred.");
        setFetchedActorData(null); setFetchedDataSources([]);
      }
    } catch (error) {
      console.error("Error fetching data from actor:", error);
      toast.error(`Error fetching data: ${error instanceof Error ? error.message : "Unknown error"}`);
      setFetchedActorData(null); setFetchedDataSources([]);
    } finally {
      setIsFetchingData(false);
    }
  }, [
    selectedActor, actorSpecificOptions, urls, articleExtractorUrl, bingSearchQuery, rssFeedUrl, 
    isActorInputValid, initialWebsiteCrawlerOptions, processingStatus.isProcessing, 
    setAiOutput
  ]);

  const handleLocalFilesSelected = useCallback((files: File[]) => setLocalFiles(files), []);
  const handleLocalFileInputClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file'; input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) handleLocalFilesSelected(Array.from(files));
    };
    input.click();
  }, [handleLocalFilesSelected]);

  const handleBrowseDrive = useCallback(() => {
    if (!isReady) { toast.error("Google Drive Picker is not ready"); return; }
    openPicker({ multiple: true }, (files) => {
      if (files.length > 0) { handleAddFiles(files); toast.success(`Added ${files.length} new file(s)`); }
    });
  }, [isReady, openPicker, handleAddFiles]);

  const customInstructionsForUnifiedView = React.useMemo(() => localStorage.getItem('drive-analyzer-custom-instructions') || '', [isUnifiedViewOpen]);

  const handleRunAnalysis = useCallback(async () => {
    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt for the AI.");
      return;
    }

    const contentToAnalyze: string[] = [];
    const sourcesForThisAISession: SavedAnalysisSource[] = [...fetchedDataSources];

    let actorDataHeader = "";
    if (fetchedActorData) {
      if (selectedActor === ACTOR_WEBSITE_CRAWLER) actorDataHeader = `### Fetched Website Content (Source URLs: ${urls.join(', ')})\n\n`;
      else if (selectedActor === ACTOR_ARTICLE_EXTRACTOR) actorDataHeader = `### Fetched Article Content (Source URL: ${articleExtractorUrl})\n\n`;
      else if (selectedActor === ACTOR_BING_SEARCH) actorDataHeader = `### Fetched Bing Search Results (Query: "${bingSearchQuery}")\n\n`;
      else if (selectedActor === ACTOR_RSS_SCRAPER) actorDataHeader = `### Fetched RSS Feed Content (Source URL: ${rssFeedUrl})\n\n`;
      
      if (fetchedActorData.trim().startsWith("The following")) {
        contentToAnalyze.push(fetchedActorData);
      } else {
        contentToAnalyze.push(actorDataHeader + fetchedActorData);
      }
    }

    if (pastedText.trim()) {
      contentToAnalyze.push(`### Pasted Text Content\n\n${pastedText.trim()}`);
      sourcesForThisAISession.push({ type: 'text', name: 'Pasted Text', actor: "user-input" });
    }
    
    const totalAIPhaseItems = (fetchedActorData ? 1 : 0) + (pastedText.trim() ? 1 : 0) + localFiles.length + selectedFiles.length;

    if (totalAIPhaseItems === 0 && !isActorInputValid()) {
      toast.error("No data to analyze. Fetch data, paste text, or select files.");
      return;
    }
     if (totalAIPhaseItems === 0 && fetchedActorData === "") {
        toast.info("No content available to analyze (fetched data was empty).");
        return;
    }
     if (totalAIPhaseItems === 0) {
        toast.error("No data available from any source to analyze.");
        return;
    }
    
    setProcessingStatus({ 
      isProcessing: true, 
      currentStep: "Preparing data for AI...",
      progress: 0, 
      totalFiles: totalAIPhaseItems, 
      processedFiles: 0,
    });
    setAiOutput(""); 
    setActiveTab("result");

    let aiItemsProcessed = 0;
    const updateTotalAIProgress = (itemsIncrement = 1) => {
        aiItemsProcessed += itemsIncrement;
        const fileProcessingProgress = 60; 
        let currentProgress = 0;
        if (totalAIPhaseItems > 0) {
            currentProgress = Math.round((aiItemsProcessed / totalAIPhaseItems) * fileProcessingProgress);
        }
        setProcessingStatus(prev => ({ 
            ...prev, 
            progress: Math.min(currentProgress, fileProcessingProgress), 
            processedFiles: aiItemsProcessed 
        }));
    };
    
    if (fetchedActorData) updateTotalAIProgress(0); 
    if (pastedText.trim()) updateTotalAIProgress(0);

    if (localFiles.length > 0) {
        setProcessingStatus(prev => ({ ...prev, currentStep: `Processing ${localFiles.length} local file(s)...`}));
        try {
            const localFileContents = await processLocalFiles(localFiles);
            localFileContents.forEach((content, idx) => {
                const fileName = localFiles[idx]?.name || `Local File ${idx + 1}`;
                contentToAnalyze.push(`### Local File: ${fileName}\n\n${content}`);
            });
            localFiles.forEach(file => sourcesForThisAISession.push({ type: 'file', name: file.name, actor: "local-file" }));
            updateTotalAIProgress(localFiles.length);
        } catch (error) {
            console.error("Error processing local files:", error);
            toast.error(`Error processing local files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    if (selectedFiles.length > 0) {
        if (!accessToken) {
            toast.error("Please sign in to Google Drive to process selected files.");
            setProcessingStatus({ 
              isProcessing: false, 
              currentStep: "", 
              progress: 0, 
              totalFiles: 0, 
              processedFiles: 0 
            });
            return;
        }
        setProcessingStatus(prev => ({ ...prev, currentStep: `Processing ${selectedFiles.length} Google Drive file(s)...`}));
        for (const file of selectedFiles) {
            try {
                const content = await fetchFileContent(file, accessToken);
                const truncatedContent = content.slice(0, MAX_DOC_CHARS);
                contentToAnalyze.push(`### Google Drive File: ${file.name} (ID: ${file.id})\n${truncatedContent}`);
                sourcesForThisAISession.push({ type: 'file', name: file.name, actor: "google-drive" }); 
            } catch (error) {
                console.error(`Error processing file ${file.name}:`, error);
                contentToAnalyze.push(`### Google Drive File: ${file.name} (ID: ${file.id})\n(Error extracting content: ${error instanceof Error ? error.message : "Unknown error"})`);
            }
            updateTotalAIProgress();
        }
    }
    
    const combinedContent = contentToAnalyze.join("\n\n--- DATA SOURCE SEPARATOR ---\n\n");
    setProcessingStatus(prev => ({ ...prev, currentStep: "Analyzing with AI...", progress: Math.min(prev.progress + 10, 95) })); 

    try {
      let finalUserPrompt = userPrompt;
      if (selectedAnalysisIdsForPrompt.length > 0) {
        const selectedAnalyses = savedAnalyses.filter(analysis => selectedAnalysisIdsForPrompt.includes(analysis.id));
        if (selectedAnalyses.length > 0) {
          let includedAnalysesContent = "\n\n=== START OF INCLUDED SAVED ANALYSES ===\n\n";
          selectedAnalyses.forEach(analysis => {
            includedAnalysesContent += `--- Analysis: ${analysis.title} ---\n\n`;
            includedAnalysesContent += `${analysis.aiOutput}\n\n`;
            includedAnalysesContent += `--- END OF Analysis: ${analysis.title} ---\n\n`;
          });
          includedAnalysesContent += "=== END OF INCLUDED SAVED ANALYSES ===\n\n";
          finalUserPrompt = includedAnalysesContent + userPrompt;
        }
      }
      
      const finalPrompt = customInstructions ? `${customInstructions}\n\n${finalUserPrompt}` : finalUserPrompt;
      setProcessingStatus(prev => ({ ...prev, progress: Math.min(prev.progress + 10, 95) })); 

      const result = await analyzeWithOpenRouter(combinedContent, finalPrompt, { model: aiModel });
      setAiOutput(result);
      setProcessingStatus({ 
        isProcessing: false, 
        currentStep: "AI Analysis Complete!", 
        progress: 100, 
        totalFiles: totalAIPhaseItems, 
        processedFiles: totalAIPhaseItems 
      });
      toast.success("AI Analysis completed successfully");

      const currentTimestamp = Date.now();
      const newAnalysis: SavedAnalysis = {
        id: currentTimestamp.toString(),
        title: `Analysis - ${new Date(currentTimestamp).toLocaleString()}`,
        timestamp: currentTimestamp, 
        prompt: userPrompt, 
        aiOutput: result, 
        sources: sourcesForThisAISession, 
      };
      handleSaveAnalysis(newAnalysis);
      if (selectedAnalysisIdsForPrompt.length > 0) {
        selectedAnalysisIdsForPrompt.forEach(id => toggleAnalysisSelectionForPrompt(id)); 
      }
    } catch (error) {
      console.error("Error during AI analysis:", error);
      toast.error(`AI analysis failed: ${error instanceof Error ? error.message : "Unknown error"}`);
      setProcessingStatus({ 
        isProcessing: false, 
        currentStep: "", 
        progress: 0, 
        totalFiles: 0, 
        processedFiles: 0 
      });
    }
}, [
    accessToken, userPrompt, customInstructions, aiModel, 
    fetchedActorData, fetchedDataSources, 
    pastedText, localFiles, selectedFiles, selectedActor, 
    handleSaveAnalysis, 
    savedAnalyses, selectedAnalysisIdsForPrompt, toggleAnalysisSelectionForPrompt,
    setActiveTab, setAiOutput, setProcessingStatus,
    urls, articleExtractorUrl, bingSearchQuery, rssFeedUrl, isActorInputValid
]);

  const handleSavePrompt = useCallback(() => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) {
      toast.error("Both title and content are required for saving a prompt"); return;
    }
    const newPrompt: SavedPrompt = { id: Date.now().toString(), title: newPromptTitle, content: newPromptContent, createdAt: Date.now() };
    const updatedPrompts = [...savedPrompts, newPrompt];
    setSavedPrompts(updatedPrompts);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(updatedPrompts));
    setNewPromptTitle(""); setNewPromptContent("");
    toast.success(`Prompt "${newPromptTitle}" saved successfully`);
  }, [newPromptTitle, newPromptContent, savedPrompts, setSavedPrompts]);

  const handleDeletePrompt = useCallback((id: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(updatedPrompts));
    toast.success("Prompt deleted");
  }, [savedPrompts, setSavedPrompts]);

  const handleInsertPrompt = useCallback((prompt: SavedPrompt) => {
    setUserPrompt(prompt.content); setIsPromptCommandOpen(false);
  }, [setUserPrompt]);

  const handleTextAreaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value; setUserPrompt(value);
    if (value.charAt(value.length - 1) === '@' || value.charAt(value.length - 1) === '/') setIsPromptCommandOpen(true);
  }, [setUserPrompt]);

  const handleViewAnalysis = useCallback((analysis: SavedAnalysis) => setViewingAnalysis(analysis), []);

  // UI Minor Refinements
  const textUrlCardDescription = `Step 1: Choose an actor, provide inputs (URLs, queries), and click "Fetch Data". 
  Step 2: Review fetched data (on AI Results tab), then add your prompt and click "Run AI Analysis". 
  You can also directly use pasted text, local files, or Google Drive files with AI Analysis.`;


  return (
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div><CardTitle className="text-2xl">Google Drive AI Analyzer</CardTitle>
              <CardDescription>Select documents from Google Drive and analyze them with AI</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <SavedPrompts {...{ savedPrompts, newPromptTitle, setNewPromptTitle, newPromptContent, setNewPromptContent, onSavePrompt: handleSavePrompt, onDeletePrompt: handleDeletePrompt }} />
              <Button variant="outline" size="icon" onClick={() => setIsSavedAnalysesOpen(true)}><History className="h-4 w-4" /><span className="sr-only">View Saved Analyses</span></Button>
              <Link to="/settings"><Button variant="outline" size="icon"><Settings className="h-4 w-4" /></Button></Link>
              {!isSignedIn && !loading && <Button onClick={signIn} className="bg-blue-600 hover:bg-blue-700">Sign in with Google</Button>}
              {isSignedIn && <Button onClick={signOut} variant="outline" className="flex items-center"><span className="hidden sm:inline mr-2">Sign Out</span><div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg></div></Button>}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="files">Files & Settings</TabsTrigger>
              <TabsTrigger value="result">Data & AI Results</TabsTrigger> {/* Renamed Tab */}
            </TabsList>

            <TabsContent value="files">
              <div className="space-y-6">
                <TooltipProvider>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Tooltip><TooltipTrigger asChild><Button onClick={handleBrowseDrive} disabled={!isSignedIn || !isReady} size="icon" className="bg-green-600 hover:bg-green-700 text-white"><FolderOpen className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Add Files from Google Drive</p></TooltipContent></Tooltip>
                    <Tooltip><TooltipTrigger asChild><Button onClick={handleLocalFileInputClick} size="icon" variant="outline"><Upload className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Select Local Files</p></TooltipContent></Tooltip>
                    <Dialog open={isUnifiedViewOpen} onOpenChange={setIsUnifiedViewOpen}><Tooltip><TooltipTrigger asChild><DialogTrigger asChild><Button size="icon" variant="outline"><Combine className="h-4 w-4" /></Button></DialogTrigger></TooltipTrigger><TooltipContent><p>Unified Content View</p></TooltipContent></Tooltip><DialogContent className="max-w-5xl h-[80vh]"><DialogHeader><DialogTitle>Unified Content View - All Sources</DialogTitle></DialogHeader><UnifiedContentView {...{ googleFiles: selectedFiles, localFiles, pastedText, urls, userPrompt, customInstructions: customInstructionsForUnifiedView, accessToken, isEditable: true }} /></DialogContent></Dialog>
                    <Tooltip><TooltipTrigger asChild><Button onClick={handleClearFiles} disabled={selectedFiles.length === 0 && localFiles.length === 0} size="icon" variant="outline"><Trash2 className="h-4 w-4" /></Button></TooltipTrigger><TooltipContent><p>Clear All Files</p></TooltipContent></Tooltip>
                    <SavedPrompts {...{ savedPrompts, newPromptTitle, setNewPromptTitle, newPromptContent, setNewPromptContent, onSavePrompt: handleSavePrompt, onDeletePrompt: handleDeletePrompt }} />
                    <Button variant="outline" size="icon" onClick={() => setIsSavedAnalysesOpen(true)}><History className="h-4 w-4" /><span className="sr-only">View Saved Analyses</span></Button>
                  </div>
                </TooltipProvider>

                <FileList {...{ googleFiles: selectedFiles, localFiles, displayFiles, onRemoveGoogleFile: handleRemoveFile, onClearGoogleFiles: handleClearFiles, selectedAnalysisIdsForPrompt, savedAnalyses }} />
                <Separator className="my-6" />
                <div className="grid gap-4">
                  <PromptSelector {...{ userPrompt, onUserPromptChange: handleTextAreaInput, isPromptCommandOpen, savedPrompts, onInsertPrompt: handleInsertPrompt, textareaRef }} />
                  <ConfigurationOptions {...{ aiModel, setAiModel, maxFiles, setMaxFiles, includeSubfolders, setIncludeSubfolders, maxDocChars: MAX_DOC_CHARS, customInstructions, setCustomInstructions }} />
                </div>
                <Separator className="my-6" /> 
                <Card>
                  <CardHeader>
                    <CardTitle>External Data & Text Inputs</CardTitle> {/* Renamed Card Title */}
                    <CardDescription>{textUrlCardDescription}</CardDescription> {/* Added new description */}
                  </CardHeader>
                  <CardContent>
                    <TextUrlInput
                      {...{ pastedText, onPastedTextChange: handlePastedTextChange, urls, onUrlAdd: handleAddUrl, onUrlRemove: handleRemoveUrl, onClearPastedText: handleClearPastedText, onClearUrls: handleClearUrls, currentUrlInput, onCurrentUrlInputChange: setCurrentUrlInput,
                        selectedActor, onSelectedActorChange: setSelectedActor, actorWebsiteCrawler: ACTOR_WEBSITE_CRAWLER, actorArticleExtractor: ACTOR_ARTICLE_EXTRACTOR, actorBingSearch: ACTOR_BING_SEARCH, actorRssScraper: ACTOR_RSS_SCRAPER,
                        articleExtractorUrl, onArticleExtractorUrlChange: setArticleExtractorUrl, bingSearchQuery, onBingSearchQueryChange: setBingSearchQuery, rssFeedUrl, onRssFeedUrlChange: setRssFeedUrl,
                        currentActorOptions: actorSpecificOptions[selectedActor] || {}, onActorOptionChange: handleActorOptionChange,
                        crawlingOptions: actorSpecificOptions[ACTOR_WEBSITE_CRAWLER] as ApifyCrawlingOptions, 
                        onCrawlingOptionsChange: (newOpts) => setActorSpecificOptions(prev => ({...prev, [ACTOR_WEBSITE_CRAWLER]: { ...prev[ACTOR_WEBSITE_CRAWLER], ...newOpts }}))
                      }}
                    />
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="result">
              {fetchedActorData !== null && (
                <Card className="mb-6">
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <CardTitle>Fetched Data from Actor</CardTitle>
                      <Button variant="outline" size="sm" onClick={() => { setFetchedActorData(null); setFetchedDataSources([]); toast.info("Fetched data cleared."); }} disabled={isFetchingData || processingStatus.isProcessing}>Clear Fetched Data</Button>
                    </div>
                    <CardDescription>
                      Data retrieved from: {fetchedDataSources.map(s => `${s.actor} (${s.type}: ${s.name})`).join(', ') || 'N/A'}. Review below before sending to AI.
                    </CardDescription>
                  </CardHeader>
                  <CardContent><ScrollArea className="h-72 w-full rounded-md border p-3 bg-muted/10"><Markdown content={fetchedActorData || "No data fetched or data was cleared."} /></ScrollArea></CardContent>
                </Card>
              )}
              <AnalysisResults processingStatus={processingStatus} aiOutput={aiOutput} />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-end border-t p-4">
          <div className="flex flex-wrap gap-2 justify-end">
            <Button onClick={handleFetchData} disabled={!isActorInputValid() || isFetchingData || processingStatus.isProcessing} className="w-full sm:w-auto" variant="outline">
              {isFetchingData ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Fetching Data...</> : <><Zap className="mr-2 h-4 w-4" />Fetch Data from Actor</>}
            </Button>
            <Button onClick={handleRunAnalysis}
              disabled={(!fetchedActorData?.trim() && !pastedText.trim() && localFiles.length === 0 && selectedFiles.length === 0 && (fetchedActorData !== ""/* Allow empty fetched string if that's the actual result */)) || isFetchingData || processingStatus.isProcessing || !userPrompt.trim()}
              className="w-full sm:w-auto">
              {processingStatus.isProcessing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Analyzing with AI...</> : <><RefreshCw className="mr-2 h-4 w-4" />Run AI Analysis</>}
            </Button>
          </div>
        </CardFooter>
      </Card>

      <SavedAnalysesSidebar {...{isOpen: isSavedAnalysesOpen, onOpenChange: setIsSavedAnalysesOpen, savedAnalyses, onViewAnalysis: handleViewAnalysis, onRenameAnalysis: handleRenameAnalysis, onDeleteAnalysis: handleDeleteAnalysis, onDeleteAllAnalyses: handleDeleteAllAnalyses, selectedAnalysisIdsForPrompt, toggleAnalysisSelectionForPrompt }} />

      {viewingAnalysis && (
        <Dialog open={!!viewingAnalysis} onOpenChange={(isOpen) => { if (!isOpen) setViewingAnalysis(null); }}>
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
            <DialogHeader><DialogTitle>{viewingAnalysis.title}</DialogTitle></DialogHeader>
            <div className="overflow-y-auto flex-grow pr-6">
              <SavedAnalysisDetailView analysis={viewingAnalysis} actorConstants={{ ACTOR_WEBSITE_CRAWLER, ACTOR_ARTICLE_EXTRACTOR, ACTOR_BING_SEARCH, ACTOR_RSS_SCRAPER }} />
            </div>
            <DialogFooter className="mt-auto pt-4"><DialogClose asChild><Button type="button" variant="outline">Close</Button></DialogClose></DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
