
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

// Import our components
import { FileList } from "./drive-analyzer/FileList";
import { SavedPrompts, SavedPrompt } from "./drive-analyzer/SavedPrompts";
import { PromptSelector } from "./drive-analyzer/PromptSelector";
import { AnalysisResults } from "./drive-analyzer/AnalysisResults";
import { ConfigurationOptions } from "./drive-analyzer/ConfigurationOptions";

// Constants moved from the original component
const MAX_DOC_CHARS = 200000;
const DEFAULT_MAX_FILES = 20;
const SAVED_PROMPTS_KEY = "drive-analyzer-saved-prompts";
const CUSTOM_INSTRUCTIONS_KEY = "drive-analyzer-custom-instructions";

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
    if (!accessToken) {
      toast.error("Please sign in to Google Drive first");
      return;
    }

    if (selectedFiles.length === 0) {
      toast.error("Please select files to analyze first");
      return;
    }

    if (!userPrompt.trim()) {
      toast.error("Please enter a prompt for the AI");
      return;
    }

    setProcessingStatus({
      isProcessing: true,
      currentStep: "Starting analysis...",
      progress: 0,
      totalFiles: selectedFiles.length,
      processedFiles: 0,
    });

    setAiOutput("");
    setActiveTab("result");

    try {
      // Process each file to extract text
      const fileContents: string[] = [];

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setProcessingStatus({
          isProcessing: true,
          currentStep: `Processing file ${i + 1} of ${selectedFiles.length}: ${
            file.name
          }`,
          progress: Math.round((i / selectedFiles.length) * 50), // First half of progress bar for file extraction
          totalFiles: selectedFiles.length,
          processedFiles: i,
        });

        try {
          const content = await fetchFileContent(file, accessToken);
          const truncatedContent = content.slice(0, MAX_DOC_CHARS); // Limit content size
          fileContents.push(
            `### ${file.name} (ID: ${file.id})\n${truncatedContent}`
          );
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
          fileContents.push(
            `### ${file.name} (ID: ${file.id})\n(Error extracting content: ${
              error instanceof Error ? error.message : "Unknown error"
            })`
          );
        }
      }

      // Combine all file contents
      const combinedContent = fileContents.join(
        "\n\n--- DOC SEPARATOR ---\n\n"
      );

      // Update progress status for OpenRouter API call
      setProcessingStatus({
        isProcessing: true,
        currentStep: "Analyzing with AI...",
        progress: 50, // Second half starts
        totalFiles: selectedFiles.length,
        processedFiles: selectedFiles.length,
      });

      // Call OpenRouter API with custom instructions if provided
      const finalPrompt = customInstructions 
        ? `${customInstructions}\n\n${userPrompt}`
        : userPrompt;
        
      const result = await analyzeWithOpenRouter(combinedContent, finalPrompt, {
        model: aiModel,
      });

      // Show result
      setAiOutput(result);
      setProcessingStatus({
        isProcessing: true,
        currentStep: "Analysis complete!",
        progress: 100,
        totalFiles: selectedFiles.length,
        processedFiles: selectedFiles.length,
      });

      toast.success("Analysis completed successfully");

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
  }, [accessToken, selectedFiles, userPrompt, customInstructions, aiModel]);

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

                <Separator />

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
              !isSignedIn ||
              !isReady ||
              selectedFiles.length === 0 ||
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
    </div>
  );
}
