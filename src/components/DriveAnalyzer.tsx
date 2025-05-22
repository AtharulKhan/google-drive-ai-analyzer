
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
import { FolderOpen, Loader2, RefreshCw, Settings, Trash2 } from "lucide-react";
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

// Import our components
import { FileList } from "./drive-analyzer/FileList";
import { TextUrlInput } from "./drive-analyzer/TextUrlInput";
import { SavedPrompts } from "./drive-analyzer/SavedPrompts";
import { SavedAnalysesSidebar } from "./drive-analyzer/SavedAnalysesSidebar"; 
import { SavedAnalysisDetailView, SavedAnalysisSource } from "./drive-analyzer/SavedAnalysisDetailView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
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
  selectedSavedAnalysesSources,
  toggleSavedAnalysisAsSource,
  removeSelectedSavedAnalysisSource,
  } = useAnalysisState();

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

  // Updated process files and send to OpenRouter for analysis with Apify integration
  const handleRunAnalysis = useCallback(async () => {
    if (!accessToken && selectedFiles.length > 0) { // Only require accessToken if Drive files are selected
      toast.error("Please sign in to Google Drive to process selected files.");
      return;
    }

    // Check if any source (files, text, URLs, or selected saved analyses) is present
    if (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && selectedSavedAnalysesSources.length === 0) {
      toast.error("Please select files, paste text, add URLs, or choose saved analyses to analyze.");
      return;
    }

    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt for the AI");
      return;
    }

    // Determine the total number of items to process for progress calculation
    // Now includes selectedSavedAnalysesSources in the count of sources
    const totalItems = selectedFiles.length + 
                       (urls.length > 0 ? 1 : 0) + 
                       (pastedText.trim() !== "" ? 1 : 0) +
                       selectedSavedAnalysesSources.length; // Add count of saved analyses

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
      
      // 3. Process Google Drive Files
      // Define file processing progress allocation, assuming other sources might take up to 20% (URLs 15%, Text 5%)
      // Saved analyses will be processed similarly to files or text.
      // Let's allocate up to 60% for files and saved analyses combined for simplicity in progress.
      const sourcesProcessingProgressMax = 60; 
      const initialProgressForSources = currentProgress; // Progress before files and saved analyses

      if (selectedFiles.length > 0 && !accessToken) {
        toast.error("Cannot process Google Drive files without being signed in.");
        setProcessingStatus({ isProcessing: false, currentStep: "", progress: 0, totalFiles: 0, processedFiles: 0 });
        return;
      }

      const totalLocalSources = selectedFiles.length + selectedSavedAnalysesSources.length;
      let localSourcesProcessed = 0;

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        itemsProcessed++;
        localSourcesProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Processing file ${i + 1} of ${selectedFiles.length}: ${file.name}`,
          progress: initialProgressForSources + Math.round((localSourcesProcessed / totalLocalSources) * sourcesProcessingProgressMax),
          processedFiles: itemsProcessed - 1,
        }));

        try {
          const content = await fetchFileContent(file, accessToken!);
          const truncatedContent = content.slice(0, MAX_DOC_CHARS);
          allContentSources.push(
            `### File: ${file.name} (ID: ${file.id})\n\n${truncatedContent}` // Added "File: " for clarity
          );
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          allContentSources.push(
            `### File: ${file.name} (ID: ${file.id})\n\n(Error extracting content: ${
              error instanceof Error ? error.message : "Unknown error"
            })`
          );
        }
      }

      // 4. Process Selected Saved Analyses
      for (let i = 0; i < selectedSavedAnalysesSources.length; i++) {
        const source = selectedSavedAnalysesSources[i];
        itemsProcessed++;
        localSourcesProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Processing saved analysis ${i + 1} of ${selectedSavedAnalysesSources.length}: ${source.name}`,
          progress: initialProgressForSources + Math.round((localSourcesProcessed / totalLocalSources) * sourcesProcessingProgressMax),
          processedFiles: itemsProcessed - 1,
        }));
        allContentSources.push(
          `### Saved Analysis: ${source.name} (ID: ${source.id})\n\n${source.content}`
        );
      }
      currentProgress = initialProgressForSources + (totalLocalSources > 0 ? sourcesProcessingProgressMax : 0);
      
      // Check if any content was actually gathered
      if (allContentSources.length === 0) {
        toast.error("No content could be processed from the provided sources.");
        setProcessingStatus({ isProcessing: false, currentStep: "", progress: 0, totalFiles: 0, processedFiles: 0 });
        return;
      }

      const combinedContent = allContentSources.join("\n\n--- DOC SEPARATOR ---\n\n");

      // Update progress status for OpenRouter API call
      setProcessingStatus(prev => ({
        ...prev,
        currentStep: "Analyzing with AI...",
        progress: Math.min(currentProgress + 5, 95), 
        processedFiles: totalItems, 
      }));
      
      // The userPrompt is now directly used, customInstructions are prepended if they exist.
      // The content from selectedSavedAnalysesSources is already in combinedContent.
      const finalPrompt = customInstructions 
        ? `${customInstructions}\n\n${userPrompt}` 
        : userPrompt;
        
      const result = await analyzeWithOpenRouter(combinedContent, finalPrompt, {
        model: aiModel,
      });

      // Show result
      setAiOutput(result);
      setProcessingStatus(prev => ({
        ...prev,
        currentStep: "Analysis complete!",
        progress: 100,
      }));

      toast.success("Analysis completed successfully");

      // Save the analysis
      const analysisSources: SavedAnalysisSource[] = [];
      selectedFiles.forEach(file => analysisSources.push({ type: 'file', name: file.name }));
      urls.forEach(url => analysisSources.push({ type: 'url', name: url }));
      if (pastedText.trim() !== "") {
        analysisSources.push({ type: 'text', name: 'Pasted Text Content' });
      }
      selectedSavedAnalysesSources.forEach(sSource => {
        analysisSources.push({ type: 'savedAnalysis', name: sSource.name });
      });

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
      
      // Clear selected saved analyses sources after use
      if (selectedSavedAnalysesSources.length > 0) {
        // Create a new empty array or call a specific clearing function if available
        // For now, let's assume toggling them all off or a dedicated clear function would handle this.
        // This part depends on how `selectedSavedAnalysesSources` is managed.
        // If clearing is done by toggling each, that's handled by useAnalysisState's clear functions.
        // For now, we'll rely on the `handleClearFiles` in `useAnalysisState` being updated,
        // or a new specific function like `clearSelectedSavedAnalysesSources()` if added.
        // The prompt asks to update handleClearFiles, which should cover this implicitly when sources are "cleared".
        // However, for clarity after *each* run, we might want to explicitly clear them.
        // Let's refine this: the prompt says `handleClearFiles` clears them.
        // But for *after run analysis*, they should be cleared too.
        // The existing logic for `selectedAnalysisIdsForPrompt.forEach(id => toggleAnalysisSelectionForPrompt(id))`
        // effectively cleared the selection. We need similar logic for selectedSavedAnalysesSources.
        // We can iterate and call `toggleSavedAnalysisAsSource` for each selected source's original analysis object.
        // This is a bit tricky as `toggleSavedAnalysisAsSource` expects `SavedAnalysis` not `SavedAnalysisContentSource`.
        // A simpler approach for now might be to call a dedicated clear function if one existed,
        // or rely on the user to de-select.
        // For now, let's assume `handleClearFiles` (if called) or manual deselection handles this.
        // The prompt for useAnalysisState updates handleClearFiles.
        // The prompt for DriveAnalyzer.tsx: "The existing handleClearFiles function should also be augmented... to clear selectedSavedAnalysesSources"
        // This is done in useAnalysisState.
        // After a run, we should clear them.
        const analysesToToggleOff = savedAnalyses.filter(sa => selectedSavedAnalysesSources.find(ssas => ssas.id === sa.id));
        analysesToToggleOff.forEach(analysis => toggleSavedAnalysisAsSource(analysis));
      }

      // Reset processing state after a short delay
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
  }, [accessToken, selectedFiles, userPrompt, customInstructions, aiModel, urls, pastedText, crawlingOptions, handleSaveAnalysis]);

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
    
    // Reset input fields
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
    
    // Check if the last character is @ or /
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
                {/* File Selection Section */}
                <div className="flex flex-col md:flex-row gap-4 mb-6">
                  <Button
                    onClick={handleBrowseDrive}
                    disabled={!isSignedIn || !isReady}
                    className="flex-1"
                  >
                    <FolderOpen className="mr-2" />
                    Add Files from Google Drive
                  </Button>

                  <Button
                    onClick={handleClearFiles} // This now clears selectedFiles AND selectedSavedAnalysesSources
                    disabled={selectedFiles.length === 0 && selectedSavedAnalysesSources.length === 0}
                    className="flex-1"
                    variant="outline"
                  >
                    <Trash2 className="mr-2" />
                    Clear All Sources
                  </Button>
                </div>

                {/* File List Component */}
                <FileList 
                  sources={
                    [
                      ...displayFiles.map(file => ({ id: file.id, name: file.name, type: 'file' as const, original: file, icon: file.iconLink, webViewLink: file.webViewLink }) ),
                      ...selectedSavedAnalysesSources.map(source => ({ id: source.id, name: source.name, type: 'savedAnalysis' as const, original: source, icon: undefined, webViewLink: undefined }))
                    ]
                  }
                  onRemoveSource={(id, type) => {
                    if (type === 'file') {
                      handleRemoveFile(id);
                    } else if (type === 'savedAnalysis') {
                      removeSelectedSavedAnalysisSource(id);
                    }
                  }}
                  onClearAllSources={handleClearFiles} // handleClearFiles now clears all types of sources
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
              (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0 && selectedSavedAnalysesSources.length === 0) || // Updated condition
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
        selectedAnalysisIdsForPrompt={selectedSavedAnalysesSources.map(s => s.id)} // Pass IDs for checkbox state
        toggleAnalysisSelectionForPrompt={(analysisId) => { // Adapt to what SavedAnalysesSidebar expects or update sidebar
          const analysis = savedAnalyses.find(a => a.id === analysisId);
          if (analysis) {
            toggleSavedAnalysisAsSource(analysis);
          }
        }}
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
