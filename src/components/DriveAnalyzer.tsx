
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
import { useDrivePicker, GoogleFile } from "@/hooks/useDrivePicker";
import { fetchFileContent } from "@/utils/google-api";
import { analyzeWithOpenRouter } from "@/utils/openrouter-api";
import { getDefaultAIModel } from "@/utils/ai-models";
import { scrapeUrls } from "@/utils/scraping";

// Import our components
import { FileList } from "./drive-analyzer/FileList";
import { TextUrlInput } from "./drive-analyzer/TextUrlInput";
import { SavedPrompts, SavedPrompt } from "./drive-analyzer/SavedPrompts";
import { SavedAnalysesSidebar } from "./drive-analyzer/SavedAnalysesSidebar"; 
import { SavedAnalysisDetailView } from "./drive-analyzer/SavedAnalysisDetailView";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { History } from "lucide-react";
import { PromptSelector } from "./drive-analyzer/PromptSelector";
import { AnalysisResults } from "./drive-analyzer/AnalysisResults";
import { ConfigurationOptions } from "./drive-analyzer/ConfigurationOptions";

// Constants moved from the original component
const MAX_DOC_CHARS = 200000;
const DEFAULT_MAX_FILES = 20;
const SAVED_PROMPTS_KEY = "drive-analyzer-saved-prompts";
const CUSTOM_INSTRUCTIONS_KEY = "drive-analyzer-custom-instructions";
const SAVED_ANALYSES_KEY = "drive-analyzer-saved-analyses";

// Type definitions (can be moved to a shared types file later)
export interface SavedAnalysisSource {
  type: 'file' | 'url' | 'text';
  name: string; 
}

export interface SavedAnalysis {
  id: string;
  title: string; 
  timestamp: number; 
  prompt: string;
  aiOutput: string;
  sources: SavedAnalysisSource[];
}

export default function DriveAnalyzer() {
  // State variables
  const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([]);
  const [displayFiles, setDisplayFiles] = useState<GoogleFile[]>([]);
  const [userPrompt, setUserPrompt] = useState(
    "Summarize this content in detail, highlighting key points and insights."
  );
  const [aiModel, setAiModel] = useState<string>(getDefaultAIModel());
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
  const [customInstructions, setCustomInstructions] = useState<string>("");
  const [processingStatus, setProcessingStatus] = useState({
    isProcessing: false,
    currentStep: "",
    progress: 0,
    totalFiles: 0,
    processedFiles: 0,
  });
  const [aiOutput, setAiOutput] = useState("");
  const [activeTab, setActiveTab] = useState("files");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [newPromptTitle, setNewPromptTitle] = useState("");
  const [newPromptContent, setNewPromptContent] = useState("");
  const [isPromptCommandOpen, setIsPromptCommandOpen] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // State for TextUrlInput
  const [pastedText, setPastedText] = useState<string>("");
  const [currentUrlInput, setCurrentUrlInput] = useState<string>("");
  const [urls, setUrls] = useState<string[]>([]);

  // State for SavedAnalyses
  const [savedAnalyses, setSavedAnalyses] = useState<SavedAnalysis[]>([]);
  const [viewingAnalysis, setViewingAnalysis] = useState<SavedAnalysis | null>(null);
  const [isSavedAnalysesOpen, setIsSavedAnalysesOpen] = useState(false);

  // Hooks
  const { isSignedIn, accessToken, loading, signIn, signOut } = useGoogleAuth();
  const { openPicker, isReady } = useDrivePicker({ accessToken });

  // Load saved prompts from localStorage
  useEffect(() => {
    const loadedPrompts = localStorage.getItem(SAVED_PROMPTS_KEY);
    if (loadedPrompts) {
      setSavedPrompts(JSON.parse(loadedPrompts));
    }
    
    // Load custom instructions
    const savedInstructions = localStorage.getItem(CUSTOM_INSTRUCTIONS_KEY);
    if (savedInstructions) {
      setCustomInstructions(savedInstructions);
    }

    // Load saved analyses
    const loadedAnalyses = localStorage.getItem(SAVED_ANALYSES_KEY);
    if (loadedAnalyses) {
      setSavedAnalyses(JSON.parse(loadedAnalyses));
    }
  }, []);
  
  // Save custom instructions to localStorage when changed
  useEffect(() => {
    if (customInstructions !== undefined) {
      localStorage.setItem(CUSTOM_INSTRUCTIONS_KEY, customInstructions);
    }
  }, [customInstructions]);

  // When selected files change, update display files
  useEffect(() => {
    setDisplayFiles(selectedFiles.slice(0, 100)); // Limit display to first 100 files
  }, [selectedFiles]);

  // Handle browsing Google Drive and selecting files
  const handleBrowseDrive = useCallback(() => {
    if (!isReady) {
      toast.error("Google Drive Picker is not ready");
      return;
    }

    // Use the enhanced picker that allows folder navigation and file selection
    openPicker({ multiple: true }, (files) => {
      if (files.length > 0) {
        // Merge new files with existing ones, avoiding duplicates by file ID
        const existingFileIds = new Set(selectedFiles.map(file => file.id));
        const newFiles = files.filter(file => !existingFileIds.has(file.id));
        
        setSelectedFiles(prev => [...prev, ...newFiles]);
        toast.success(`Added ${newFiles.length} new file(s)`);
      }
    });
  }, [isReady, openPicker, selectedFiles]);

  // Remove individual file
  const handleRemoveFile = useCallback((fileId: string) => {
    setSelectedFiles(prev => prev.filter(file => file.id !== fileId));
  }, []);

  // Clear selected files
  const handleClearFiles = useCallback(() => {
    setSelectedFiles([]);
    setDisplayFiles([]);
  }, []);

  // Process files and send to OpenRouter for analysis
  const handleRunAnalysis = useCallback(async () => {
    if (!accessToken && selectedFiles.length > 0) { // Only require accessToken if Drive files are selected
      toast.error("Please sign in to Google Drive to process selected files.");
      return;
    }

    if (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0) {
      toast.error("Please select files, paste text, or add URLs to analyze.");
      return;
    }

    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt for the AI");
      return;
    }

    // Determine the total number of items to process for progress calculation
    const totalItems = selectedFiles.length + (urls.length > 0 ? 1 : 0) + (pastedText.trim() !== "" ? 1 : 0);

    setProcessingStatus({
      isProcessing: true,
      currentStep: "Starting analysis...",
      progress: 0,
      totalFiles: totalItems, // Use totalItems here, might rename totalFiles later
      processedFiles: 0,
    });

    setAiOutput("");
    setActiveTab("result");

    try {
      const allContentSources: string[] = [];
      let currentProgress = 0;
      let itemsProcessed = 0;

      // 1. Scrape URLs
      if (urls.length > 0) {
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Scraping ${urls.length} URL(s)...`,
          progress: Math.round((itemsProcessed / totalItems) * 15), // Scraping takes up to 15%
          processedFiles: itemsProcessed -1, // visually show progress on current item
        }));
        const scrapeResult = await scrapeUrls(urls);
        if (scrapeResult.failedUrls.length > 0) {
          toast.warning(`Failed to scrape: ${scrapeResult.failedUrls.join(', ')}`);
        }
        if (scrapeResult.combinedText.trim() !== "") {
          allContentSources.push(scrapeResult.combinedText.trim());
        }
        currentProgress = 15; // Mark scraping as 15% done
      }

      // 2. Process Pasted Text
      if (pastedText.trim() !== "") {
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: "Processing pasted text...",
          progress: currentProgress + Math.round((itemsProcessed / totalItems) * 5), // Pasted text adds up to 5%
          processedFiles: itemsProcessed -1,
        }));
        allContentSources.push(`### Pasted Text Content\n\n${pastedText.trim()}`);
        currentProgress += 5; // Add 5% for pasted text
      }
      
      // 3. Process Google Drive Files
      const fileProcessingProgressMax = 60; // Files take up to 60% of progress
      const initialProgressForFiles = currentProgress;

      if (selectedFiles.length > 0 && !accessToken) {
        toast.error("Cannot process Google Drive files without being signed in.");
        // Reset processing status or handle as a partial failure if other content exists
        setProcessingStatus({ isProcessing: false, currentStep: "", progress: 0, totalFiles: 0, processedFiles: 0 });
        return;
      }


      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        itemsProcessed++;
        setProcessingStatus(prev => ({
          ...prev,
          currentStep: `Processing file ${i + 1} of ${selectedFiles.length}: ${file.name}`,
          // Progress for files is spread within their 60% allocation
          progress: initialProgressForFiles + Math.round(((i + 1) / selectedFiles.length) * fileProcessingProgressMax),
          processedFiles: itemsProcessed -1,
        }));

        try {
          const content = await fetchFileContent(file, accessToken!); // accessToken is checked above for selectedFiles
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

      // Update progress status for OpenRouter API call (remaining progress up to 100%)
      setProcessingStatus(prev => ({
        ...prev,
        currentStep: "Analyzing with AI...",
        progress: Math.min(currentProgress + 5, 95), // AI call starts, moves to 95% before completion
        processedFiles: totalItems, // All source items processed
      }));
      
      // Call OpenRouter API with custom instructions if provided
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

      const currentTimestamp = Date.now();
      const newAnalysis: SavedAnalysis = {
        id: currentTimestamp.toString(),
        title: `Analysis - ${new Date(currentTimestamp).toLocaleString()}`,
        timestamp: currentTimestamp,
        prompt: finalPrompt,
        aiOutput: result,
        sources: analysisSources,
      };

      setSavedAnalyses(prevAnalyses => {
        const updatedAnalyses = [newAnalysis, ...prevAnalyses];
        // Optional: Limit the number of saved analyses, e.g., keep latest 50
        // const limitedAnalyses = updatedAnalyses.slice(0, 50); 
        localStorage.setItem(SAVED_ANALYSES_KEY, JSON.stringify(updatedAnalyses /* or limitedAnalyses */));
        return updatedAnalyses; /* or limitedAnalyses */
      });
      toast.success("Analysis saved successfully!");


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
  }, [accessToken, selectedFiles, userPrompt, customInstructions, aiModel, urls, pastedText, isSignedIn, isReady]);

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
  }, [newPromptTitle, newPromptContent, savedPrompts]);

  // Handle deleting a saved prompt
  const handleDeletePrompt = useCallback((id: string) => {
    const updatedPrompts = savedPrompts.filter(prompt => prompt.id !== id);
    setSavedPrompts(updatedPrompts);
    localStorage.setItem(SAVED_PROMPTS_KEY, JSON.stringify(updatedPrompts));
    toast.success("Prompt deleted");
  }, [savedPrompts]);

  // Handle inserting a prompt into the text area
  const handleInsertPrompt = useCallback((prompt: SavedPrompt) => {
    setUserPrompt(prompt.content);
    setIsPromptCommandOpen(false);
  }, []);

  // Handlers for TextUrlInput
  const handlePastedTextChange = useCallback((text: string) => {
    setPastedText(text);
  }, []);

  const handleCurrentUrlInputChange = useCallback((url: string) => {
    setCurrentUrlInput(url);
  }, []);

  const handleAddUrl = useCallback(() => {
    if (currentUrlInput.trim() !== "") {
      if (currentUrlInput.startsWith('http://') || currentUrlInput.startsWith('https://')) {
        setUrls(prevUrls => [...prevUrls, currentUrlInput.trim()]);
        setCurrentUrlInput(""); 
      } else {
        toast.error("Please enter a valid URL (starting with http:// or https://)");
      }
    }
  }, [currentUrlInput]);

  const handleRemoveUrl = useCallback((index: number) => {
    setUrls(prevUrls => prevUrls.filter((_, i) => i !== index));
  }, []);

  const handleClearPastedText = useCallback(() => {
    setPastedText("");
  }, []);

  const handleClearUrls = useCallback(() => {
    setUrls([]);
  }, []);

  // Handlers for SavedAnalyses
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
    localStorage.removeItem(SAVED_ANALYSES_KEY); // Or setItem to '[]'
    toast.success("All saved analyses have been deleted!");
  }, []);

  const handleViewAnalysis = useCallback((analysis: SavedAnalysis) => {
    setViewingAnalysis(analysis);
    // Logic to open a dialog will be added later when integrating SavedAnalysisDetailView
    // For now, we can log to console or trigger a toast to confirm it's called
    // console.log("Viewing analysis:", analysis);
    // toast.info(`Viewing analysis: ${analysis.title}`); 
  }, []);


  // Handle text area input to check for trigger characters
  const handleTextAreaInput = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setUserPrompt(value);
    
    // Check if the last character is @ or /
    const lastChar = value.charAt(value.length - 1);
    if (lastChar === '@' || lastChar === '/') {
      setIsPromptCommandOpen(true);
    }
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
                    onClick={handleClearFiles}
                    disabled={selectedFiles.length === 0}
                    className="flex-1"
                    variant="outline"
                  >
                    <Trash2 className="mr-2" />
                    Clear All Files
                  </Button>
                </div>

                {/* File List Component */}
                <FileList 
                  selectedFiles={selectedFiles}
                  displayFiles={displayFiles}
                  onRemoveFile={handleRemoveFile}
                  onClearFiles={handleClearFiles}
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
                      onCurrentUrlInputChange={handleCurrentUrlInputChange}
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
              (!isSignedIn && selectedFiles.length > 0) || // Disable if not signed in AND trying to process files
              (!isReady && selectedFiles.length > 0) || // Disable if picker not ready AND trying to process files
              (selectedFiles.length === 0 && pastedText.trim() === "" && urls.length === 0) ||
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
