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
import { FolderOpen, Loader2, RefreshCw, Trash2, Combine, Upload, ChevronDown, ChevronRight } from "lucide-react";
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

const MAX_DOC_CHARS = 200000;
const DEFAULT_MAX_FILES = 20;

export default function DriveAnalyzer() {
  const {
    selectedFiles,
    setSelectedFiles,
    displayFiles,
    handleAddFiles,
    handleRemoveFile,
    handleClearFiles,
    pastedText,
    handlePastedTextChange,
    handleClearPastedText,
    currentUrlInput,
    setCurrentUrlInput,
    urls,
    handleAddUrl,
    handleRemoveUrl,
    handleClearUrls,
    crawlingOptions,
    handleCrawlingOptionsChange,
    webhookUrl,
    handleWebhookUrlChange,
    userPrompt,
    setUserPrompt,
    aiOutput,
    setAiOutput,
    processingStatus,
    setProcessingStatus,
    activeTab,
    setActiveTab,
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

  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isUnifiedViewOpen, setIsUnifiedViewOpen] = useState(false);
  const [isAdditionalOptionsOpen, setIsAdditionalOptionsOpen] = useState(false);
  const [aiModel, setAiModel] = useState<string>(getDefaultAIModel());
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isPromptCommandOpen, setIsPromptCommandOpen] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<SavedAnalysis | null>(null);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const [isMoreButtonsOpen, setIsMoreButtonsOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [currentAnalysisResultForDownload, setCurrentAnalysisResultForDownload] = useState<SavedAnalysis | null>(null);

  const { isSignedIn, accessToken, loading, signIn, signOut } = useGoogleAuth();
  const { openPicker, isReady } = useDrivePicker({ accessToken });

  const handleLocalFilesSelected = useCallback((files: File[]) => {
    setLocalFiles(files);
  }, []);

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

  const handleClearAllFiles = useCallback(() => {
    handleClearFiles();
    setLocalFiles([]);
    handleClearPastedText();
    handleClearUrls();
    toast.success("All files and content cleared");
  }, [handleClearFiles, handleClearPastedText, handleClearUrls]);

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

  const handleDeletePrompt = useCallback((id: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(updatedPrompts));
    toast.success("Prompt deleted");
  }, [savedPrompts, setSavedPrompts]);

  const handleInsertPrompt = useCallback((prompt: SavedPrompt) => {
    setUserPrompt(prompt.content);
    setIsPromptCommandOpen(false);
  }, [setUserPrompt]);

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

  useEffect(() => {
    if (selectedFiles.length === 0 && localFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && aiOutput === "") {
      setCurrentAnalysisResultForDownload(null);
    }
  }, [selectedFiles, localFiles, pastedText, urls, aiOutput]);

  const customInstructionsForUnifiedView = React.useMemo(() => {
    return localStorage.getItem('drive-analyzer-custom-instructions') || '';
  }, [isUnifiedViewOpen]);

  return (
    <div className="w-full max-w-6xl mx-auto px-2 sm:px-4 lg:px-6 animate-fade-in">
      <Card className="w-full shadow-xl border-0 bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 backdrop-blur-sm relative overflow-hidden">
        <div className="absolute inset-0"></div>
        <div className="absolute inset-[1px] rounded-lg bg-gradient-to-br from-white via-slate-50/50 to-blue-50/30 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900"></div>
        
        <div className="relative z-10">
          <CardContent className="p-3 sm:p-4 lg:p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid grid-cols-2 mb-4 sm:mb-6 bg-gradient-to-r from-slate-100/80 to-blue-100/60 dark:from-gray-800/80 dark:to-gray-700/60 border border-white/20 backdrop-blur-sm animate-fade-in w-full">
                <TabsTrigger value="files" className="transition-all duration-200 hover:bg-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-500 data-[state=active]:text-white animate-slide-in text-sm">
                  Files & Settings
                </TabsTrigger>
                <TabsTrigger value="result" className="transition-all duration-200 hover:bg-white/80 data-[state=active]:bg-gradient-to-r data-[state=active]:from-purple-500 data-[state=active]:to-pink-500 data-[state=active]:text-white animate-slide-in-delayed text-sm">
                  AI Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="animate-fade-in space-y-4 sm:space-y-6">
                <div className="space-y-4 sm:space-y-6">
                  <div className="bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-white/20">
                    <TooltipProvider>
                      <div className="flex flex-wrap gap-2 sm:gap-3">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleBrowseDrive}
                              disabled={!isSignedIn || !isReady}
                              size="sm"
                              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white transform hover:scale-105 transition-all duration-200 shadow-md hover:shadow-lg text-xs sm:text-sm"
                            >
                              <FolderOpen className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Browse Drive</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Browse and select files from Google Drive</p>
                          </TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              onClick={handleLocalFileInputClick}
                              size="sm"
                              variant="outline"
                              className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/50 text-xs sm:text-sm"
                            >
                              <Upload className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                              <span className="hidden sm:inline">Local Files</span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Select files from your computer</p>
                          </TooltipContent>
                        </Tooltip>

                        <Dialog open={isUnifiedViewOpen} onOpenChange={setIsUnifiedViewOpen}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button size="sm" variant="outline" className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-r hover:from-slate-50 hover:to-purple-50/50 text-xs sm:text-sm">
                                  <Combine className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                  <span className="hidden sm:inline">Preview</span>
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Preview all content in unified view</p>
                            </TooltipContent>
                          </Tooltip>
                          <DialogContent className="max-w-5xl h-[80vh] animate-scale-in">
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

                        <Dialog open={isMoreButtonsOpen} onOpenChange={setIsMoreButtonsOpen}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <DialogTrigger asChild>
                                <Button 
                                  size="sm" 
                                  variant="outline" 
                                  className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-r hover:from-slate-50 hover:to-gray-50/50 text-xs sm:text-sm"
                                >
                                  <ChevronRight className="h-3 w-3 sm:h-4 sm:w-4" />
                                  <span className="hidden sm:inline">More</span>
                                </Button>
                              </DialogTrigger>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>More actions</p>
                            </TooltipContent>
                          </Tooltip>
                          <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                              <DialogTitle>More Actions</DialogTitle>
                            </DialogHeader>
                            <div className="grid grid-cols-2 gap-3 py-4">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    onClick={() => {
                                      handleClearAllFiles();
                                      setIsMoreButtonsOpen(false);
                                    }}
                                    disabled={selectedFiles.length === 0 && localFiles.length === 0 && pastedText.trim() === "" && urls.length === 0}
                                    size="sm"
                                    variant="outline"
                                    className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-r hover:from-red-50 hover:to-pink-50 text-xs sm:text-sm"
                                  >
                                    <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                    Clear All
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>Clear all files, text, and URLs</p>
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
                                size="sm" 
                                onClick={() => {
                                  setIsSavedAnalysesOpen(true);
                                  setIsMoreButtonsOpen(false);
                                }} 
                                className="hover:scale-105 transition-all duration-200 hover:shadow-md hover:bg-gradient-to-r hover:from-indigo-50 hover:to-blue-50 text-xs sm:text-sm"
                              >
                                <History className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                                <span className="hidden sm:inline">History</span>
                                <span className="sr-only">View Saved Analyses</span>
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </TooltipProvider>
                  </div>

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

                  <Separator className="my-4 sm:my-6 bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />

                  <div className="space-y-4">
                    <PromptSelector
                      userPrompt={userPrompt}
                      onUserPromptChange={handleTextAreaInput}
                      isPromptCommandOpen={isPromptCommandOpen}
                      savedPrompts={savedPrompts}
                      onInsertPrompt={handleInsertPrompt}
                      textareaRef={textareaRef}
                    />

                    <Collapsible open={isAdditionalOptionsOpen} onOpenChange={setIsAdditionalOptionsOpen}>
                      <div className="space-y-4">
                        <h3 className="text-sm font-medium text-muted-foreground">Additional Options</h3>
                        
                        {!isAdditionalOptionsOpen && (
                          <div className="relative">
                            <div className="relative overflow-hidden max-h-40 sm:max-h-32">
                              <div className="space-y-6 opacity-60 transform scale-98 transition-all duration-300">
                                <div className="grid gap-4">
                                  <div>
                                    <label className="text-sm font-medium mb-2 block">Webhook URL (Optional)</label>
                                    <div className="h-10 bg-gradient-to-r from-slate-100/50 to-blue-100/30 rounded-md border border-slate-200/50 flex items-center px-3">
                                      <span className="text-xs text-muted-foreground">Send results to external service...</span>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">AI Model</label>
                                      <div className="h-10 bg-gradient-to-r from-slate-100/50 to-purple-100/30 rounded-md border border-slate-200/50 flex items-center px-3">
                                        <span className="text-xs text-muted-foreground">Current: {aiModel}</span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">Max Files</label>
                                      <div className="h-10 bg-gradient-to-r from-slate-100/50 to-indigo-100/30 rounded-md border border-slate-200/50 flex items-center px-3">
                                        <span className="text-xs text-muted-foreground">Limit: {maxFiles} files</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">Text & URL Input</label>
                                      <div className="h-16 bg-gradient-to-r from-slate-100/50 to-green-100/30 rounded-md border border-slate-200/50 flex items-center px-3">
                                        <span className="text-xs text-muted-foreground">
                                          {pastedText.length > 0 || urls.length > 0 
                                            ? `${pastedText.length > 0 ? 'Text' : ''}${pastedText.length > 0 && urls.length > 0 ? ' & ' : ''}${urls.length > 0 ? `${urls.length} URL(s)` : ''} added`
                                            : 'Paste text or add URLs for analysis'
                                          }
                                        </span>
                                      </div>
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium mb-2 block">Configuration</label>
                                      <div className="h-16 bg-gradient-to-r from-slate-100/50 to-orange-100/30 rounded-md border border-slate-200/50 flex items-center px-3">
                                        <span className="text-xs text-muted-foreground">Advanced settings & options</span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-background via-background/80 to-transparent pointer-events-none"></div>
                            </div>
                            
                            <div className="flex justify-center -mt-1">
                              <CollapsibleTrigger asChild>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  className="h-8 w-8 rounded-full bg-gradient-to-r from-white to-slate-50 border shadow-md hover:shadow-lg z-10 relative hover:scale-110 transition-all duration-200"
                                >
                                  <ChevronDown className="h-4 w-4" />
                                </Button>
                              </CollapsibleTrigger>
                            </div>
                          </div>
                        )}
                        
                        {isAdditionalOptionsOpen && (
                          <div className="flex justify-center">
                            <CollapsibleTrigger asChild>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                className="h-8 w-8 rounded-full bg-gradient-to-r from-white to-slate-50 border shadow-md hover:shadow-lg hover:scale-110 transition-all duration-200"
                              >
                                <ChevronDown className="h-4 w-4 rotate-180" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        )}
                      </div>
                      
                      <CollapsibleContent className="space-y-4 sm:space-y-6 animate-fade-in">
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
                        
                        <Separator className="bg-gradient-to-r from-transparent via-slate-300/50 to-transparent" />
                        
                        <Card className="border-0 bg-gradient-to-br from-slate-50/50 to-blue-50/30 shadow-md animate-slide-up">
                          <CardHeader className="p-3 sm:p-6">
                            <CardTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-lg sm:text-xl">Text & URL Inputs</CardTitle>
                            <CardDescription className="text-sm">Paste text directly or add URLs to scrape content for analysis.</CardDescription>
                          </CardHeader>
                          <CardContent className="p-3 sm:p-6 pt-0">
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
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="result" className="animate-fade-in">
                <AnalysisResults 
                  processingStatus={processingStatus}
                  aiOutput={aiOutput}
                  currentAnalysisResult={currentAnalysisResultForDownload}
                />
              </TabsContent>
            </Tabs>
          </CardContent>

          <CardFooter className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-end border-t border-gradient-to-r from-blue-100/50 to-purple-100/50 dark:from-gray-700/50 dark:to-gray-600/50 p-3 sm:p-6">
            <Button
              onClick={handleRunAnalysis}
              disabled={
                (!isSignedIn && selectedFiles.length > 0) ||
                (!isReady && selectedFiles.length > 0) ||
                (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && localFiles.length === 0) ||
                processingStatus.isProcessing
              }
              className="w-full sm:w-auto bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl animate-glow text-sm sm:text-base py-2 sm:py-3"
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
          </CardFooter>
        </div>

        <div className="absolute top-4 right-4 w-2 h-2 bg-blue-400/30 rounded-full animate-pulse"></div>
        <div className="absolute bottom-4 left-4 w-1 h-1 bg-purple-400/30 rounded-full animate-pulse delay-1000"></div>
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
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col animate-scale-in">
            <DialogHeader>
              <DialogTitle>{viewingAnalysis.title}</DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-grow pr-6">
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
