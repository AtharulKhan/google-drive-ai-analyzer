
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
import { FolderOpen, Loader2, RefreshCw, Settings, Trash2, Combine, Upload, ChevronDown } from "lucide-react";
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 p-4">
      <div className="container mx-auto max-w-7xl animate-fade-in">
        {/* Header Section */}
        <div className="mb-8 text-center animate-scale-in">
          <div className="inline-flex items-center gap-3 mb-4">
            <div className="p-3 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 shadow-lg animate-pulse-slow">
              <FolderOpen className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
              AI Document Analyzer
            </h1>
          </div>
          <p className="text-lg text-slate-600 max-w-2xl mx-auto">
            Transform your documents into actionable insights with powerful AI analysis
          </p>
        </div>

        {/* Action Buttons Section */}
        <div className="mb-8">
          <Card className="backdrop-blur-sm bg-white/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500 hover:-translate-y-1">
            <CardHeader className="pb-4">
              <div className="flex flex-col space-y-4">
                {/* Auth Section */}
                <div className="flex justify-end">
                  <div className="flex items-center gap-3">
                    <Link to="/settings">
                      <Button 
                        variant="outline" 
                        size="icon"
                        className="hover:scale-110 transition-all duration-300 hover:shadow-lg border-slate-200 hover:border-blue-300 hover:bg-blue-50"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    </Link>

                    {!isSignedIn && !loading ? (
                      <Button
                        onClick={signIn}
                        className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                      >
                        Sign in with Google
                      </Button>
                    ) : isSignedIn ? (
                      <Button
                        onClick={signOut}
                        variant="outline"
                        className="flex items-center hover:scale-105 transition-all duration-300 border-green-200 hover:border-green-300 hover:bg-green-50"
                      >
                        <span className="hidden sm:inline mr-2">Sign Out</span>
                        <div className="w-5 h-5 rounded-full bg-gradient-to-r from-green-400 to-emerald-500 flex items-center justify-center shadow-sm">
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                        </div>
                      </Button>
                    ) : null}
                  </div>
                </div>

                {/* Main Action Buttons */}
                <TooltipProvider>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleBrowseDrive}
                          disabled={!isSignedIn || !isReady}
                          className="h-16 flex-col gap-2 bg-gradient-to-br from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <FolderOpen className="h-5 w-5" />
                          <span className="text-xs font-medium">Drive Files</span>
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
                          className="h-16 flex-col gap-2 bg-gradient-to-br from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                        >
                          <Upload className="h-5 w-5" />
                          <span className="text-xs font-medium">Local Files</span>
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
                            <Button className="h-16 flex-col gap-2 bg-gradient-to-br from-purple-500 to-violet-600 hover:from-purple-600 hover:to-violet-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                              <Combine className="h-5 w-5" />
                              <span className="text-xs font-medium">Unified View</span>
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
                          className="h-16 flex-col gap-2 bg-gradient-to-br from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <Trash2 className="h-5 w-5" />
                          <span className="text-xs font-medium">Clear Files</span>
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
                      onClick={() => setIsSavedAnalysesOpen(true)}
                      className="h-16 flex-col gap-2 bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
                    >
                      <History className="h-5 w-5" />
                      <span className="text-xs font-medium">History</span>
                    </Button>
                  </div>
                </TooltipProvider>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Main Content */}
        <Card className="backdrop-blur-sm bg-white/60 border-white/20 shadow-xl hover:shadow-2xl transition-all duration-500">
          <CardContent className="p-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gradient-to-r from-slate-100 to-blue-50 p-1 rounded-lg">
                <TabsTrigger 
                  value="files" 
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-500 data-[state=active]:to-indigo-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105"
                >
                  Files & Settings
                </TabsTrigger>
                <TabsTrigger 
                  value="result"
                  className="data-[state=active]:bg-gradient-to-r data-[state=active]:from-green-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white transition-all duration-300 hover:scale-105"
                >
                  AI Results
                </TabsTrigger>
              </TabsList>

              <TabsContent value="files" className="space-y-6 animate-fade-in">
                {/* File List Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
                    Selected Files
                  </h3>
                  <Card className="bg-gradient-to-br from-blue-50/50 to-indigo-50/30 border-blue-100/50 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
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
                </div>

                <Separator className="my-6 bg-gradient-to-r from-transparent via-slate-200 to-transparent" />

                {/* Prompt Section */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-gradient-to-r from-green-500 to-emerald-600"></div>
                    AI Prompt
                  </h3>
                  <Card className="bg-gradient-to-br from-green-50/50 to-emerald-50/30 border-green-100/50 hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-4">
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
                </div>

                {/* Additional Options */}
                <Collapsible open={isAdditionalOptionsOpen} onOpenChange={setIsAdditionalOptionsOpen}>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-slate-700 flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-gradient-to-r from-purple-500 to-violet-600"></div>
                        Additional Options
                      </h3>
                      <CollapsibleTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 w-8 rounded-full hover:bg-purple-100 transition-all duration-300 hover:scale-110"
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform duration-300 ${isAdditionalOptionsOpen ? 'rotate-180' : ''}`} />
                        </Button>
                      </CollapsibleTrigger>
                    </div>
                    
                    {!isAdditionalOptionsOpen && (
                      <Card className="bg-gradient-to-br from-purple-50/30 to-violet-50/20 border-purple-100/30 opacity-60 hover:opacity-80 transition-all duration-300">
                        <CardContent className="p-4">
                          <div className="space-y-4 relative">
                            <div className="grid gap-4">
                              <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-md animate-pulse"></div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-md animate-pulse"></div>
                                <div className="h-10 bg-gradient-to-r from-slate-100 to-slate-200 rounded-md animate-pulse"></div>
                              </div>
                            </div>
                            <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>
                          </div>
                        </CardContent>
                      </Card>
                    )}
                    
                    <CollapsibleContent className="space-y-6 animate-accordion-down">
                      <Card className="bg-gradient-to-br from-purple-50/50 to-violet-50/30 border-purple-100/50 hover:shadow-lg transition-all duration-300">
                        <CardContent className="p-6">
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
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-br from-amber-50/50 to-orange-50/30 border-amber-100/50 hover:shadow-lg transition-all duration-300">
                        <CardHeader>
                          <CardTitle className="text-amber-700">Text & URL Inputs</CardTitle>
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
                <Card className="bg-gradient-to-br from-emerald-50/50 to-teal-50/30 border-emerald-100/50">
                  <CardContent className="p-6">
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

          <CardFooter className="border-t bg-gradient-to-r from-slate-50/50 to-blue-50/30 p-6">
            <div className="w-full flex justify-end">
              <Button
                onClick={handleRunAnalysis}
                disabled={
                  (!isSignedIn && selectedFiles.length > 0) ||
                  (!isReady && selectedFiles.length > 0) ||
                  (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && localFiles.length === 0) ||
                  processingStatus.isProcessing
                }
                className="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {processingStatus.isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Processing Analysis...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5" />
                    Run AI Analysis
                  </>
                )}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

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
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col backdrop-blur-sm bg-white/95 border-white/20">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                {viewingAnalysis.title}
              </DialogTitle>
            </DialogHeader>
            <div className="overflow-y-auto flex-grow pr-6">
              <SavedAnalysisDetailView analysis={viewingAnalysis} />
            </div>
            <DialogFooter className="mt-auto pt-4">
              <DialogClose asChild>
                <Button type="button" variant="outline" className="hover:scale-105 transition-all duration-300">
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
