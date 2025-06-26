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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { FolderOpen, Loader2, RefreshCw, Settings, Trash2, Combine, Upload, ChevronDown, Sparkles, Zap, FileText, Globe } from "lucide-react";
import { toast } from "sonner";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useDrivePicker } from "@/hooks/useDrivePicker";
import { fetchFileContent } from "@/utils/google-api";
import { analyzeWithOpenRouter } from "@/utils/openrouter-api";
import { getDefaultAIModel } from "@/utils/ai-models";
import { analyzeMultipleUrlsWithApify } from "@/utils/apify-api";
import useAnalysisState, { 
  CUSTOM_INSTRUCTIONS_KEY,
  SAVED_PROMPTS_KEY,
  SavedPrompt,
  SavedAnalysis,
} from "@/hooks/useAnalysisState";
import { processLocalFiles } from "@/utils/local-file-processor";
import { sendToWebhook } from "@/utils/webhook-sender";
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
  // Use our custom hook for state management
  const {
    // Files
    selectedFiles,
    setSelectedFiles,
    displayFiles,
    handleAddFiles,
    handleRemoveFile,
    handleClearFiles,
    
    // Text/URL inputs
    pastedText,
    handlePastedTextChange,
    handleClearPastedText,
    currentUrlInput,
    setCurrentUrlInput,
    urls,
    handleAddUrl,
    handleRemoveUrl,
    handleClearUrls,
    
    // Crawling options
    crawlingOptions,
    handleCrawlingOptionsChange,
    webhookUrl,
    handleWebhookUrlChange,
    
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
    handleSaveAnalysis,
    handleRenameAnalysis,
    handleDeleteAnalysis,
    handleDeleteAllAnalyses,
    selectedAnalysisIdsForPrompt,
    toggleAnalysisSelectionForPrompt,
    handleImportAnalysis,
  } = useAnalysisState();

  // Local state
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isUnifiedViewOpen, setIsUnifiedViewOpen] = useState(false);
  const [isAdditionalOptionsOpen, setIsAdditionalOptionsOpen] = useState(false);

  // State variables
  const [aiModel, setAiModel] = useState<string>(getDefaultAIModel());
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isPromptCommandOpen, setIsPromptCommandOpen] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<SavedAnalysis | null>(null);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentAnalysisResultForDownload, setCurrentAnalysisResultForDownload] = useState<SavedAnalysis | null>(null);

  // Hooks
  const { isSignedIn, accessToken, loading, signIn, signOut } = useGoogleAuth();
  const { openPicker, isReady } = useDrivePicker({ accessToken });

  // Handle local file selection
  const handleLocalFilesSelected = useCallback((files: File[]) => {
    setLocalFiles(files);
  }, []);

  // Handle local file input
  const handleLocalFileInputClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (files) {
        handleLocalFilesSelected(Array.from(files));
      }
    };
    input.click();
  }, [handleLocalFilesSelected]);

  // Handle browsing Google Drive and selecting files
  const handleBrowseDrive = useCallback(() => {
    if (!isReady) {
      toast.error("Google Drive Picker is not ready");
      return;
    }

    openPicker({ multiple: true }, (files) => {
      if (files.length > 0) {
        handleAddFiles(files);
        toast.success(`Added ${files.length} new file(s)`);
      }
    });
  }, [isReady, openPicker, handleAddFiles]);

  // Clear currentAnalysisResultForDownload when relevant sources are cleared
  useEffect(() => {
    if (selectedFiles.length === 0 && localFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && aiOutput === "") {
      setCurrentAnalysisResultForDownload(null);
    }
  }, [selectedFiles, localFiles, pastedText, urls, aiOutput]);

  // Load custom instructions for unified view
  const customInstructionsForUnifiedView = React.useMemo(() => {
    return localStorage.getItem('drive-analyzer-custom-instructions') || '';
  }, [isUnifiedViewOpen]);

  // Updated process files and send to OpenRouter for analysis with local file support
  const handleRunAnalysis = useCallback(async () => {
    if (!accessToken && selectedFiles.length > 0) { // Only require accessToken if Drive files are selected
      toast.error("Please sign in to Google Drive to process selected files.");
      return;
    }

    if (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && localFiles.length === 0) {
      toast.error("Please select files, paste text, or add URLs to analyze.");
      return;
    }

    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt for the AI");
      return;
    }

    const totalItems = selectedFiles.length + (urls.length > 0 ? 1 : 0) + (pastedText.trim() !== "" ? 1 : 0) + localFiles.length;

    setProcessingStatus({
      isProcessing: true,
      currentStep: "Starting analysis...",
      progress: 0,
      totalFiles: totalItems,
      processedFiles: 0,
    });

    setAiOutput("");
    setActiveTab("result");
    setCurrentAnalysisResultForDownload(null); // Reset on new analysis run

    try {
      const allContentSources: string[] = [];
      let currentProgress = 0;
      let itemsProcessed = 0;

      // 1. Analyze URLs with Apify (using our new crawling options)
      if (urls.length > 0) {
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Analyzing ${urls.length} URL(s) with Apify...`,
          progress: Math.round((itemsProcessed / totalItems) * 15), // Scraping takes up to 15%
          processedFiles: itemsProcessed - 1, // visually show progress on current item
        }));
        
        const apifyResult = await analyzeMultipleUrlsWithApify(urls, crawlingOptions);
        
        if (apifyResult.failedUrls.length > 0) {
          toast.warning(`Failed to analyze: ${apifyResult.failedUrls.join(', ')}`);
        }
        if (apifyResult.combinedAnalyzedText.trim() !== "") {
          allContentSources.push(apifyResult.combinedAnalyzedText.trim());
        }
        currentProgress = 15; // Mark URL analysis as 15% done
      }

      // 2. Process Pasted Text
      if (pastedText.trim() !== "") {
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: "Processing pasted text...",
          progress: currentProgress + Math.round((itemsProcessed / totalItems) * 5), // Pasted text adds up to 5%
          processedFiles: itemsProcessed - 1,
        }));
        allContentSources.push(`### Pasted Text Content\n\n${pastedText.trim()}`);
        currentProgress += 5; // Add 5% for pasted text
      }

      // 3. Process Local Files
      if (localFiles.length > 0) {
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Processing ${localFiles.length} local file(s)...`,
          progress: currentProgress + 5,
          processedFiles: itemsProcessed,
        }));

        try {
          const localFileContents = await processLocalFiles(localFiles);
          allContentSources.push(...localFileContents);
          itemsProcessed += localFiles.length;
          currentProgress += 15; // Local files take up to 15% of progress
        } catch (error) {
          console.error("Error processing local files:", error);
          toast.error(`Error processing local files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 4. Process Google Drive Files
      const fileProcessingProgressMax = 45; // Reduced from 60% to account for local files
      const initialProgressForFiles = currentProgress;

      if (selectedFiles.length > 0 && !accessToken) {
        toast.error("Cannot process Google Drive files without being signed in.");
        setProcessingStatus({ isProcessing: false, currentStep: "", progress: 0, totalFiles: 0, processedFiles: 0 });
        return;
      }

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Processing Google Drive file ${i + 1} of ${selectedFiles.length}: ${file.name}`,
          progress: initialProgressForFiles + Math.round(((i + 1) / selectedFiles.length) * fileProcessingProgressMax),
          processedFiles: itemsProcessed - 1,
        }));

        try {
          const content = await fetchFileContent(file, accessToken!);
          const truncatedContent = content.slice(0, MAX_DOC_CHARS);
          allContentSources.push(
            `### ${file.name} (ID: ${file.id})\n${truncatedContent}`
          );
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          allContentSources.push(
            `### ${file.name} (ID: ${file.id})\n(Error extracting content: ${
              error instanceof Error ? error.message : "Unknown error"
            })`
          );
        }
      }
      currentProgress = initialProgressForFiles + (selectedFiles.length > 0 ? fileProcessingProgressMax : 0);

      if (allContentSources.length === 0) {
        toast.error("No content could be processed from the provided sources.");
        setProcessingStatus({ isProcessing: false, currentStep: "", progress: 0, totalFiles: 0, processedFiles: 0 });
        return;
      }

      const combinedContent = allContentSources.join("\n\n--- DOC SEPARATOR ---\n\n");

      setProcessingStatus(prev => ({
        ...prev,
        currentStep: "Analyzing with AI...",
        progress: Math.min(currentProgress + 5, 95), // AI call starts, moves to 95% before completion
        processedFiles: totalItems, // All source items processed
      }));
      
      let finalUserPrompt = userPrompt;
      if (selectedAnalysisIdsForPrompt.length > 0) {
        const selectedAnalyses = savedAnalyses.filter(analysis => 
          selectedAnalysisIdsForPrompt.includes(analysis.id)
        );

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
      
      // Get custom instructions from localStorage instead of state
      const customInstructions = localStorage.getItem('drive-analyzer-custom-instructions') || '';
      const finalPrompt = customInstructions 
        ? `${customInstructions}\n\n${finalUserPrompt}`
        : finalUserPrompt;
        
      const result = await analyzeWithOpenRouter(combinedContent, finalPrompt, {
        model: aiModel,
      });

      setAiOutput(result);
      setProcessingStatus(prev => ({
        ...prev,
        currentStep: "Analysis complete!",
        progress: 100,
      }));

      toast.success("Analysis completed successfully");

      const analysisSources: SavedAnalysisSource[] = [];
      selectedFiles.forEach(file => analysisSources.push({ type: 'file', name: file.name }));
      urls.forEach(url => analysisSources.push({ type: 'url', name: url }));
      if (pastedText.trim() !== "") {
        analysisSources.push({ type: 'text', name: 'Pasted Text Content' });
      }
      if (localFiles.length > 0) {
        localFiles.forEach(file => analysisSources.push({ type: 'file', name: file.name }));
      }

      const currentTimestamp = Date.now();
      const newAnalysis = {
        id: currentTimestamp.toString(),
        title: `Analysis - ${new Date(currentTimestamp).toLocaleString()}`,
        timestamp: currentTimestamp,
        prompt: userPrompt, // Save the original user prompt, not the augmented one
        aiOutput: result,
        sources: analysisSources,
      };

      handleSaveAnalysis(newAnalysis);
      setCurrentAnalysisResultForDownload(newAnalysis); // Store for download

      // Send to webhook if URL is configured
      if (webhookUrl && (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://'))) {
        toast.promise(sendToWebhook(webhookUrl, newAnalysis), {
          loading: "Sending analysis to webhook...",
          success: (result) => {
            if (result.success) {
              return `Webhook sent successfully to ${webhookUrl}`;
            } else {
              // This case implies sendToWebhook resolved with { success: false }
              throw new Error(result.error || "Unknown webhook error");
            }
          },
          error: (err) => `Failed to send webhook to ${webhookUrl}: ${err.message}`,
        });
      }
      
      if (selectedAnalysisIdsForPrompt.length > 0) {
        selectedAnalysisIdsForPrompt.forEach(id => toggleAnalysisSelectionForPrompt(id)); // This will clear the array
      }

      setTimeout(() => {
        setProcessingStatus({
          isProcessing: false,
          currentStep: "",
          progress: 0,
          totalFiles: 0,
          processedFiles: 0,
        });
      }, 1000);
    } catch (error) {
      console.error("Error during analysis:", error);
      toast.error(
        `Analysis failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
      setProcessingStatus({
        isProcessing: false,
        currentStep: "",
        progress: 0,
        totalFiles: 0,
        processedFiles: 0,
      });
    }
  }, [
    accessToken,
    selectedFiles,
    userPrompt,
    aiModel,
    urls,
    pastedText,
    crawlingOptions,
    handleSaveAnalysis,
    localFiles,
    webhookUrl,
    savedAnalyses,
    selectedAnalysisIdsForPrompt,
    toggleAnalysisSelectionForPrompt,
    setAiOutput,
    setProcessingStatus,
    setActiveTab,
  ]);

  // Handle saving a new prompt
  const handleSavePrompt = useCallback(() => {
    if (!newPromptTitle.trim() || !newPromptContent.trim()) {
      toast.error("Both title and content are required for saving a prompt");
      return;
    }

    const newPrompt: SavedPrompt = {
      id: Date.now().toString(),
      title: newPromptTitle,
      content: newPromptContent,
      createdAt: Date.now(),
    };

    const updatedPrompts = [...savedPrompts, newPrompt];
    setSavedPrompts(updatedPrompts);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(updatedPrompts));
    
    setNewPromptTitle("");
    setNewPromptContent("");
    
    toast.success(`Prompt "${newPromptTitle}" saved successfully`);
  }, [newPromptTitle, newPromptContent, savedPrompts, setSavedPrompts]);

  // Handle deleting a saved prompt
  const handleDeletePrompt = useCallback((id: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(updatedPrompts));
    toast.success("Prompt deleted");
  }, [savedPrompts, setSavedPrompts]);

  // Handle inserting a prompt into the text area
  const handleInsertPrompt = useCallback((prompt: SavedPrompt) => {
    setUserPrompt(prompt.content);
    setIsPromptCommandOpen(false);
  }, [setUserPrompt]);

  // Handle text area input to check for trigger characters
  const handleTextAreaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserPrompt(value);
    
    const lastChar = value.charAt(value.length - 1);
    if (lastChar === '@' || lastChar === '/') {
      setIsPromptCommandOpen(true);
    }
  }, [setUserPrompt]);

  const handleViewAnalysis = useCallback((analysis: SavedAnalysis) => {
    setViewingAnalysis(analysis);
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-indigo-900 transition-all duration-500">
      <div className="container mx-auto p-4 max-w-7xl animate-fade-in">
        {/* Hero Section */}
        <div className="text-center mb-8 animate-scale-in">
          <div className="relative">
            <h1 className="text-4xl md:text-6xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4 animate-pulse-slow">
              AI Document Analyzer
            </h1>
            <div className="absolute -top-2 -right-2 animate-bounce">
              <Sparkles className="h-8 w-8 text-yellow-500" />
            </div>
          </div>
          <p className="text-xl text-muted-foreground mb-6 max-w-2xl mx-auto">
            Transform your documents with the power of AI analysis
          </p>
        </div>

        {/* Main Card */}
        <Card className="w-full shadow-2xl bg-white/80 backdrop-blur-lg border-0 rounded-3xl overflow-hidden animate-slide-in-right">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-indigo-500/5"></div>
          
          <CardHeader className="relative z-10 border-b border-gradient-to-r from-blue-200 to-purple-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 shadow-lg animate-pulse-slow">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <div>
                  <CardTitle className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    AI Analysis Hub
                  </CardTitle>
                  <CardDescription className="text-gray-600">
                    Upload, analyze, and gain insights from your documents
                  </CardDescription>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Link to="/settings">
                  <Button variant="outline" size="icon" className="rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>

                {!isSignedIn && !loading && (
                  <Button
                    onClick={signIn}
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-full px-6 py-2 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105"
                  >
                    <FolderOpen className="mr-2 h-4 w-4" />
                    Connect Google Drive
                  </Button>
                )}
                {isSignedIn && (
                  <Button
                    onClick={signOut}
                    variant="outline"
                    className="rounded-full hover:shadow-lg hover:scale-105 transition-all duration-300 border-green-200 hover:border-green-300"
                  >
                    <span className="hidden sm:inline mr-2">Connected</span>
                    <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-500 to-emerald-500 flex items-center justify-center shadow-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                    </div>
                  </Button>
                )}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="pt-6">
              <TooltipProvider>
                <div className="flex flex-wrap items-center justify-center gap-3 px-2">
                  {/* Drive Files Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleBrowseDrive}
                        disabled={!isSignedIn || !isReady}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white rounded-full px-6 py-3 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
                      >
                        <FolderOpen className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                        <span className="font-medium">Drive Files</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add Files from Google Drive</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Local Files Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleLocalFileInputClick}
                        variant="outline"
                        className="rounded-full px-6 py-3 border-2 border-blue-200 hover:border-blue-400 hover:bg-blue-50 transition-all duration-300 transform hover:scale-105 group"
                      >
                        <Upload className="h-5 w-5 mr-2 group-hover:-translate-y-1 transition-transform duration-300" />
                        <span className="font-medium">Local Files</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select Local Files</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Unified View Button */}
                  <Dialog open={isUnifiedViewOpen} onOpenChange={setIsUnifiedViewOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            className="rounded-full px-6 py-3 border-2 border-purple-200 hover:border-purple-400 hover:bg-purple-50 transition-all duration-300 transform hover:scale-105 group"
                          >
                            <Combine className="h-5 w-5 mr-2 group-hover:rotate-180 transition-transform duration-500" />
                            <span className="font-medium">Unified View</span>
                          </Button>
                        </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Unified Content View</p>
                      </TooltipContent>
                    </Tooltip>
                    <DialogContent className="max-w-5xl h-[80vh] rounded-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                          Unified Content View - All Sources
                        </DialogTitle>
                      </DialogHeader>
                      <UnifiedContentView
                        googleFiles={selectedFiles}
                        localFiles={localFiles}
                        pastedText={pastedText}
                        urls={urls}
                        userPrompt={userPrompt}
                        customInstructions={customInstructionsForUnifiedView}
                        accessToken={accessToken}
                        isEditable={true}
                      />
                    </DialogContent>
                  </Dialog>

                  {/* Clear Button */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleClearFiles}
                        disabled={selectedFiles.length === 0 && localFiles.length === 0}
                        variant="outline"
                        className="rounded-full px-6 py-3 border-2 border-red-200 hover:border-red-400 hover:bg-red-50 transition-all duration-300 transform hover:scale-105 group disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5 mr-2 group-hover:scale-110 transition-transform duration-300" />
                        <span className="font-medium">Clear</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear All Files</p>
                    </TooltipContent>
                  </Tooltip>

                  {/* Saved Items Buttons */}
                  <div className="flex items-center gap-3">
                    <SavedPrompts
                      savedPrompts={savedPrompts}
                      newPromptTitle={newPromptTitle}
                      setNewPromptTitle={setNewPromptTitle}
                      newPromptContent={newPromptContent}
                      setNewPromptContent={setNewPromptContent}
                      onSavePrompt={handleSavePrompt}
                      onDeletePrompt={handleDeletePrompt}
                    />
                    
                    <Button 
                      variant="outline" 
                      onClick={() => setIsSavedAnalysesOpen(true)} 
                      className="rounded-full px-6 py-3 border-2 border-indigo-200 hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-300 transform hover:scale-105 group"
                    >
                      <History className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="font-medium">History</span>
                    </Button>
                  </div>
                </div>
              </TooltipProvider>
            </div>
          </CardHeader>

          <CardContent className="relative z-10 p-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full p-1 shadow-inner">
                <TabsTrigger value="files" className="rounded-full font-medium transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-blue-600">
                  <FileText className="h-4 w-4 mr-2" />
                  Files & Settings
                </TabsTrigger>
                <TabsTrigger value="result" className="rounded-full font-medium transition-all duration-300 data-[state=active]:bg-white data-[state=active]:shadow-lg data-[state=active]:text-purple-600">
                  <Sparkles className="h-4 w-4 mr-2" />
                  AI Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-8 animate-fade-in">
                {/* File List Component */}
                <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <FileText className="h-5 w-5 text-blue-600" />
                      Document Sources
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileList
                      googleFiles={selectedFiles}
                      localFiles={localFiles}
                      displayFiles={displayFiles}
                      onRemoveGoogleFile={handleRemoveFile}
                      onClearGoogleFiles={handleClearFiles}
                      selectedAnalysisIdsForPrompt={selectedAnalysisIdsForPrompt}
                      savedAnalyses={savedAnalyses}
                      accessToken={accessToken}
                    />
                  </CardContent>
                </Card>

                <Separator className="my-8 bg-gradient-to-r from-blue-200 to-purple-200 h-px" />

                {/* Prompt Section */}
                <Card className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Zap className="h-5 w-5 text-purple-600" />
                      AI Prompt
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <PromptSelector
                      userPrompt={userPrompt}
                      onUserPromptChange={handleTextAreaInput}
                      isPromptCommandOpen={isPromptCommandOpen}
                      savedPrompts={savedPrompts}
                      onInsertPrompt={handleInsertPrompt}
                      textareaRef={textareaRef}
                    />
                  </CardContent>
                </Card>

                {/* Additional Options */}
                <Collapsible open={isAdditionalOptionsOpen} onOpenChange={setIsAdditionalOptionsOpen}>
                  <div className="space-y-6">
                    <Card className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <Settings className="h-5 w-5 text-emerald-600" />
                          Additional Options
                        </CardTitle>
                      </CardHeader>
                      
                      {!isAdditionalOptionsOpen && (
                        <CardContent>
                          <div className="relative">
                            <div className="relative overflow-hidden max-h-24 opacity-60">
                              <div className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
                                  <div className="h-12 bg-gradient-to-r from-gray-100 to-gray-200 rounded-lg animate-pulse"></div>
                                </div>
                              </div>
                            </div>
                            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-white to-transparent pointer-events-none"></div>
                          </div>
                          
                          <div className="flex justify-center mt-4">
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-10 w-10 rounded-full bg-white border-2 border-emerald-200 shadow-lg hover:shadow-xl hover:border-emerald-400 transition-all duration-300 transform hover:scale-110"
                              >
                                <ChevronDown className="h-4 w-4 text-emerald-600" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </CardContent>
                      )}
                      
                      {isAdditionalOptionsOpen && (
                        <CardContent>
                          <div className="flex justify-center mb-6">
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-10 w-10 rounded-full bg-white border-2 border-emerald-200 shadow-lg hover:shadow-xl hover:border-emerald-400 transition-all duration-300 transform hover:scale-110"
                              >
                                <ChevronDown className="h-4 w-4 text-emerald-600 rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </CardContent>
                      )}
                    </Card>
                    
                    <CollapsibleContent className="space-y-6 animate-fade-in">
                      <ConfigurationOptions
                        aiModel={aiModel}
                        setAiModel={setAiModel}
                        maxFiles={maxFiles}
                        setMaxFiles={setMaxFiles}
                        includeSubfolders={includeSubfolders}
                        setIncludeSubfolders={setIncludeSubfolders}
                        maxDocChars={MAX_DOC_CHARS}
                        webhookUrl={webhookUrl}
                        handleWebhookUrlChange={handleWebhookUrlChange}
                      />
                      
                      <Separator className="bg-gradient-to-r from-emerald-200 to-teal-200 h-px" />
                      
                      <Card className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 border-0 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Globe className="h-5 w-5 text-orange-600" />
                            Text & URL Inputs
                          </CardTitle>
                          <CardDescription>Paste text directly or add URLs to scrape content for analysis.</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <TextUrlInput
                            pastedText={pastedText}
                            onPastedTextChange={handlePastedTextChange}
                            urls={urls}
                            onUrlAdd={handleAddUrl}
                            onUrlRemove={handleRemoveUrl}
                            onClearPastedText={handleClearPastedText}
                            onClearUrls={handleClearUrls}
                            currentUrlInput={currentUrlInput}
                            onCurrentUrlInputChange={setCurrentUrlInput}
                            crawlingOptions={crawlingOptions}
                            onCrawlingOptionsChange={handleCrawlingOptionsChange}
                          />
                        </CardContent>
                      </Card>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              </TabsContent>

              <TabsContent value="result" className="animate-fade-in">
                <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-0 rounded-2xl shadow-lg">
                  <CardHeader className="pb-4">
                    <CardTitle className="text-xl font-semibold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                      Analysis Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <AnalysisResults 
                      processingStatus={processingStatus}
                      aiOutput={aiOutput}
                      currentAnalysisResult={currentAnalysisResultForDownload}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="relative z-10 border-t border-gradient-to-r from-blue-200 to-purple-200 p-6 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
            <div className="w-full flex justify-center">
              <Button
                onClick={handleRunAnalysis}
                disabled={
                  (!isSignedIn && selectedFiles.length > 0) ||
                  (!isReady && selectedFiles.length > 0) ||
                  (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && localFiles.length === 0) ||
                  processingStatus.isProcessing
                }
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white rounded-full px-12 py-4 text-lg font-semibold shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {processingStatus.isProcessing ? (
                  <>
                    <Loader2 className="mr-3 h-5 w-5 animate-spin" />
                    Processing Magic...
                  </>
                ) : (
                  <>
                    <Zap className="mr-3 h-5 w-5 group-hover:rotate-12 transition-transform duration-300" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* Saved Analyses Sidebar */}
      <SavedAnalysesSidebar
        isOpen={isSavedAnalysesOpen}
        onOpenChange={setIsSavedAnalysesOpen}
        savedAnalyses={savedAnalyses}
        onViewAnalysis={handleViewAnalysis}
        onRenameAnalysis={handleRenameAnalysis}
        onDeleteAnalysis={handleDeleteAnalysis}
        onDeleteAllAnalyses={handleDeleteAllAnalyses}
        selectedAnalysisIdsForPrompt={selectedAnalysisIdsForPrompt}
        toggleAnalysisSelectionForPrompt={toggleAnalysisSelectionForPrompt}
        onImportAnalysis={handleImportAnalysis}
      />

      {/* Analysis Detail Dialog */}
      {viewingAnalysis && (
        <Dialog
          open={!!viewingAnalysis}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setViewingAnalysis(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col rounded-2xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-900">
            <DialogHeader>
              <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {viewingAnalysis.title}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-grow pr-6">
              <SavedAnalysisDetailView analysis={viewingAnalysis} />
            </div>
            <DialogFooter className="mt-auto pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="rounded-full">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
