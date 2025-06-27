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
import { FolderOpen, Loader2, RefreshCw, Settings, Trash2, Combine, Upload, ChevronDown, History } from "lucide-react";
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
import { MobileButtonGroup } from '@/components/ui/mobile-button-group';

// Import our components
import { FileList } from "./drive-analyzer/FileList";
import { TextUrlInput } from "./drive-analyzer/TextUrlInput";
import { SavedPrompts } from "./drive-analyzer/SavedPrompts";
import { SavedAnalysesSidebar } from "./drive-analyzer/SavedAnalysesSidebar"; 
import { SavedAnalysisDetailView, SavedAnalysisSource } from "./drive-analyzer/SavedAnalysisDetailView";
import { DialogClose, DialogFooter } from "@/components/ui/dialog";
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

  const handleRunAnalysis = useCallback(async () => {
    if (!accessToken && selectedFiles.length > 0) {
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
    setCurrentAnalysisResultForDownload(null);

    try {
      const allContentSources: string[] = [];
      let currentProgress = 0;
      let itemsProcessed = 0;

      // 1. Analyze URLs with Apify
      if (urls.length > 0) {
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Analyzing ${urls.length} URL(s) with Apify...`,
          progress: Math.round((itemsProcessed / totalItems) * 15),
          processedFiles: itemsProcessed - 1,
        }));
        
        const apifyResult = await analyzeMultipleUrlsWithApify(urls, crawlingOptions);
        
        if (apifyResult.failedUrls.length > 0) {
          toast.warning(`Failed to analyze: ${apifyResult.failedUrls.join(', ')}`);
        }
        if (apifyResult.combinedAnalyzedText.trim() !== "") {
          allContentSources.push(apifyResult.combinedAnalyzedText.trim());
        }
        currentProgress = 15;
      }

      // 2. Process Pasted Text
      if (pastedText.trim() !== "") {
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: "Processing pasted text...",
          progress: currentProgress + Math.round((itemsProcessed / totalItems) * 5),
          processedFiles: itemsProcessed - 1,
        }));
        allContentSources.push(`### Pasted Text Content\n\n${pastedText.trim()}`);
        currentProgress += 5;
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
          currentProgress += 15;
        } catch (error) {
          console.error("Error processing local files:", error);
          toast.error(`Error processing local files: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // 4. Process Google Drive Files
      const fileProcessingProgressMax = 45;
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
        progress: Math.min(currentProgress + 5, 95),
        processedFiles: totalItems,
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
        prompt: userPrompt,
        aiOutput: result,
        sources: analysisSources,
      };

      handleSaveAnalysis(newAnalysis);
      setCurrentAnalysisResultForDownload(newAnalysis);

      if (webhookUrl && (webhookUrl.startsWith('http://') || webhookUrl.startsWith('https://'))) {
        toast.promise(sendToWebhook(webhookUrl, newAnalysis), {
          loading: "Sending analysis to webhook...",
          success: (result) => {
            if (result.success) {
              return `Webhook sent successfully to ${webhookUrl}`;
            } else {
              throw new Error(result.error || "Unknown webhook error");
            }
          },
          error: (err) => `Failed to send webhook to ${webhookUrl}: ${err.message}`,
        });
      }
      
      if (selectedAnalysisIdsForPrompt.length > 0) {
        selectedAnalysisIdsForPrompt.forEach(id => toggleAnalysisSelectionForPrompt(id));
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
    <div className="container-custom py-8 animate-fade-in">
      <Card variant="gradient" className="w-full shadow-2xl border-0">
        <CardHeader className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
          <div className="relative">
            {/* Header Actions */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 to-purple-600 bg-clip-text text-transparent">
                    AI Document Analyzer
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    Analyze documents, URLs, and text with advanced AI
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Link to="/settings">
                  <Button variant="outline" size="icon" className="shadow-sm">
                    <Settings className="h-4 w-4" />
                  </Button>
                </Link>

                {!isSignedIn && !loading && (
                  <Button
                    onClick={signIn}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                  >
                    Sign in with Google
                  </Button>
                )}
                {isSignedIn && (
                  <Button
                    onClick={signOut}
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <span className="hidden sm:inline">Sign Out</span>
                    <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white">
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                  </Button>
                )}
              </div>
            </div>

            {/* Action Buttons - Mobile Optimized */}
            <div className="pt-4">
              <TooltipProvider>
                <MobileButtonGroup maxVisible={4} className="mb-6">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleBrowseDrive}
                        disabled={!isSignedIn || !isReady}
                        className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
                      >
                        <FolderOpen className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Drive Files</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Add Files from Google Drive</p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleLocalFileInputClick}
                        variant="outline"
                        className="shadow-sm"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Local Files</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Select Local Files</p>
                    </TooltipContent>
                  </Tooltip>

                  <Dialog open={isUnifiedViewOpen} onOpenChange={setIsUnifiedViewOpen}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <DialogTrigger asChild>
                          <Button variant="outline" className="shadow-sm">
                            <Combine className="h-4 w-4 mr-2" />
                            <span className="hidden sm:inline">Preview</span>
                          </Button>
                        </DialogTrigger>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Unified Content View</p>
                      </TooltipContent>
                    </Tooltip>
                    <DialogContent className="max-w-5xl h-[80vh]">
                      <DialogHeader>
                        <DialogTitle>Unified Content View - All Sources</DialogTitle>
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

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        onClick={handleClearFiles}
                        disabled={selectedFiles.length === 0 && localFiles.length === 0}
                        variant="outline"
                        className="shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        <span className="hidden sm:inline">Clear</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Clear All Files</p>
                    </TooltipContent>
                  </Tooltip>

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
                    className="shadow-sm"
                  >
                    <History className="h-4 w-4 mr-2" />
                    <span className="hidden sm:inline">History</span>
                  </Button>
                </MobileButtonGroup>
              </TooltipProvider>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="modern-tabs mb-8 w-full">
              <TabsTrigger value="files" className="tab-trigger flex-1">
                Files & Configuration
              </TabsTrigger>
              <TabsTrigger value="result" className="tab-trigger flex-1">
                AI Analysis Results
              </TabsTrigger>
            </TabsList>

            <TabsContent value="files" className="space-y-8 animate-slide-up">
              {/* Files Section */}
              <div className="section-files animate-fade-in">
                <h3 className="text-lg font-semibold mb-4 text-blue-700">
                  📁 Document Sources
                </h3>
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
              </div>

              <Separator className="my-8" />

              {/* Prompt Section */}
              <div className="section-config animate-fade-in animate-delay-150">
                <h3 className="text-lg font-semibold mb-4 text-purple-700">
                  🤖 AI Analysis Configuration
                </h3>
                <PromptSelector
                  userPrompt={userPrompt}
                  onUserPromptChange={handleTextAreaInput}
                  isPromptCommandOpen={isPromptCommandOpen}
                  savedPrompts={savedPrompts}
                  onInsertPrompt={handleInsertPrompt}
                  textareaRef={textareaRef}
                />
              </div>

              {/* Additional Options */}
              <Collapsible open={isAdditionalOptionsOpen} onOpenChange={setIsAdditionalOptionsOpen}>
                <div className="space-y-4 animate-fade-in animate-delay-300">
                  <h3 className="text-lg font-semibold text-gray-700">⚙️ Advanced Options</h3>
                  
                  {!isAdditionalOptionsOpen && (
                    <div className="collapsible-preview">
                      <div className="section-config opacity-60 pointer-events-none">
                        <div className="grid gap-4">
                          <div>
                            <label className="text-sm font-medium text-gray-600">Webhook URL</label>
                            <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 mt-1"></div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-gray-600">AI Model</label>
                              <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 mt-1"></div>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-gray-600">Max Files</label>
                              <div className="h-10 bg-gray-100 rounded-xl border border-gray-200 mt-1"></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-center">
                    <CollapsibleTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="expand-trigger"
                      >
                        <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isAdditionalOptionsOpen ? 'rotate-180' : ''}`} />
                      </Button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                
                <CollapsibleContent className="space-y-6 animate-slide-up">
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
                  
                  <Separator />
                  
                  <Card variant="modern" className="section-text">
                    <CardHeader>
                      <CardTitle className="text-green-700">📝 Text & URL Inputs</CardTitle>
                      <CardDescription>
                        Add text content or URLs to scrape for analysis
                      </CardDescription>
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
              </Collapsible>
            </TabsContent>

            <TabsContent value="result" className="animate-slide-up">
              <div className="section-results">
                <h3 className="text-lg font-semibold mb-4 text-amber-700">
                  ✨ Analysis Results
                </h3>
                <AnalysisResults 
                  processingStatus={processingStatus}
                  aiOutput={aiOutput}
                  currentAnalysisResult={currentAnalysisResultForDownload}
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="border-t bg-gradient-to-r from-gray-50/50 to-blue-50/30 p-6">
          <div className="w-full flex justify-end">
            <Button
              onClick={handleRunAnalysis}
              disabled={
                (!isSignedIn && selectedFiles.length > 0) ||
                (!isReady && selectedFiles.length > 0) ||
                (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && localFiles.length === 0) ||
                processingStatus.isProcessing
              }
              className="btn-modern min-w-[200px] floating"
            >
              {processingStatus.isProcessing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run AI Analysis
                </>
              )}
            </Button>
          </div>
        </CardFooter>
      </Card>

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

      {viewingAnalysis && (
        <Dialog
          open={!!viewingAnalysis}
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              setViewingAnalysis(null);
            }
          }}
        >
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col modern-card">
            <DialogHeader>
              <DialogTitle>{viewingAnalysis.title}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-grow pr-6 custom-scrollbar">
              <SavedAnalysisDetailView analysis={viewingAnalysis} />
            </div>
            <DialogFooter className="mt-auto pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
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
