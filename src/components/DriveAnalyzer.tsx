
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
import { FolderOpen, Loader2, RefreshCw, Settings, Trash2, Combine, Upload } from "lucide-react";
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
  } = useAnalysisState();

  // Local state
  const [localFiles, setLocalFiles] = useState<File[]>([]);
  const [isUnifiedViewOpen, setIsUnifiedViewOpen] = useState(false);

  // State variables
  const [aiModel, setAiModel] = useState<string>(getDefaultAIModel());
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isPromptCommandOpen, setIsPromptCommandOpen] = useState(false);
  const [viewingAnalysis, setViewingAnalysis] = useState<SavedAnalysis | null>(null);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Hooks
  const { isSignedIn, accessToken, loading, signIn, signOut } = useGoogleAuth();
  const { openPicker, isReady } = useDrivePicker({ accessToken });

  // Load custom instructions from localStorage
  useEffect(() => {
    const savedInstructions = localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY);
    if (savedInstructions) {
      setCustomInstructions(savedInstructions);
    }
  }, []);
  
  // Save custom instructions to localStorage when changed
  useEffect(() => {
    if (customInstructions !== undefined) {
      localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
    }
  }, [customInstructions]);

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

    // Use the enhanced picker that allows folder navigation and file selection
    openPicker({ multiple: true }, (files) => {
      if (files.length > 0) {
        handleAddFiles(files);
        toast.success(`Added ${files.length} new file(s)`);
      }
    });
  }, [isReady, openPicker, handleAddFiles]);

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
  }, [accessToken, selectedFiles, userPrompt, customInstructions, aiModel, urls, pastedText, crawlingOptions, handleSaveAnalysis, localFiles]);

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
    <div className="container mx-auto p-4 max-w-6xl">
      <Card className="w-full shadow-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">
                Google Drive AI Analyzer
              </CardTitle>
              <CardDescription>
                Select documents from Google Drive and analyze them with AI
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {/* Saved Prompts Sheet */}
              <SavedPrompts
                savedPrompts={savedPrompts}
                newPromptTitle={newPromptTitle}
                setNewPromptTitle={setNewPromptTitle}
                newPromptContent={newPromptContent}
                setNewPromptContent={setNewPromptContent}
                onSavePrompt={handleSavePrompt}
                onDeletePrompt={handleDeletePrompt}
              />
               <Button variant="outline" size="icon" onClick={() => setIsSavedAnalysesOpen(true)}>
                <History className="h-4 w-4" />
                <span className="sr-only">View Saved Analyses</span>
              </Button>
              <Link to="/settings">
                <Button variant="outline" size="icon">
                  <Settings className="h-4 w-4" />
                </Button>
              </Link>

              {!isSignedIn && !loading && (
                <Button
                  onClick={signIn}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  Sign in with Google
                </Button>
              )}
              {isSignedIn && (
                <Button
                  onClick={signOut}
                  variant="outline"
                  className="flex items-center"
                >
                  <span className="hidden sm:inline mr-2">Sign Out</span>
                  <div className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3 text-white"><polyline points="20 6 9 17 4 12"></polyline></svg>
                  </div>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid grid-cols-2 mb-4">
              <TabsTrigger value="files">Files & Settings</TabsTrigger>
              <TabsTrigger value="result">AI Results</TabsTrigger>
            </TabsList>

            <TabsContent value="files">
              <div className="space-y-6">
                {/* File Selection Section - Now with icons and tooltips */}
                <TooltipProvider>
                  <div className="flex items-center justify-center gap-2 mb-6">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          onClick={handleBrowseDrive}
                          disabled={!isSignedIn || !isReady}
                          size="icon"
                          variant="outline"
                        >
                          <FolderOpen className="h-4 w-4" />
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
                          size="icon"
                          variant="outline"
                        >
                          <Upload className="h-4 w-4" />
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
                            <Button size="icon" variant="outline">
                              <Combine className="h-4 w-4" />
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
                          size="icon"
                          variant="outline"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Clear All Files</p>
                      </TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>

                {/* File List Component */}
                <FileList
                  googleFiles={selectedFiles}
                  localFiles={localFiles}
                  displayFiles={displayFiles}
                  onRemoveGoogleFile={handleRemoveFile}
                  onClearGoogleFiles={handleClearFiles}
                  selectedAnalysisIdsForPrompt={selectedAnalysisIdsForPrompt}
                  savedAnalyses={savedAnalyses}
                />

                <Separator className="my-6" />

                {/* Configuration Section */}
                <div className="grid gap-4">
                  {/* Prompt Selector Component */}
                  <PromptSelector
                    userPrompt={userPrompt}
                    onUserPromptChange={handleTextAreaInput}
                    isPromptCommandOpen={isPromptCommandOpen}
                    savedPrompts={savedPrompts}
                    onInsertPrompt={handleInsertPrompt}
                    textareaRef={textareaRef}
                  />

                  {/* Configuration Options Component */}
                  <ConfigurationOptions
                    aiModel={aiModel}
                    setAiModel={setAiModel}
                    maxFiles={maxFiles}
                    setMaxFiles={setMaxFiles}
                    includeSubfolders={includeSubfolders}
                    setIncludeSubfolders={setIncludeSubfolders}
                    maxDocChars={MAX_DOC_CHARS}
                    customInstructions={customInstructions}
                    setCustomInstructions={setCustomInstructions}
                  />
                </div>
                
                <Separator className="my-6" /> 
                
                <Card>
                  <CardHeader>
                    <CardTitle>Text & URL Inputs</CardTitle>
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

              </div>
            </TabsContent>

            <TabsContent value="result">
              {/* Analysis Results Component */}
              <AnalysisResults 
                processingStatus={processingStatus}
                aiOutput={aiOutput}
              />
            </TabsContent>
          </Tabs>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-4 justify-end border-t p-4">
          <Button
            onClick={handleRunAnalysis}
            disabled={
              (!isSignedIn && selectedFiles.length > 0) ||
              (!isReady && selectedFiles.length > 0) ||
              (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && localFiles.length === 0) ||
              processingStatus.isProcessing
            }
            className="w-full sm:w-auto"
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
          <DialogContent className="sm:max-w-2xl md:max-w-3xl lg:max-w-4xl max-h-[90vh] flex flex-col">
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
