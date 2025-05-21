
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Loader2,
  FileText,
  FolderOpen,
  Trash2,
  RefreshCw,
  Settings,
  Copy,
  Save,
  X,
  Plus,
  Menu,
} from "lucide-react";
import { toast } from "sonner";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";
import { useDrivePicker, GoogleFile } from "@/hooks/useDrivePicker";
import { fetchFileContent, listFolderContents } from "@/utils/google-api";
import { analyzeWithOpenRouter } from "@/utils/openrouter-api";
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command";

// Maximum number of characters to process from each file
const MAX_DOC_CHARS = 200000;

// Maximum number of files to process from a folder
const DEFAULT_MAX_FILES = 20;

// Local Storage Keys
const SAVED_PROMPTS_KEY = "drive-analyzer-saved-prompts";

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export default function DriveAnalyzer() {
  // State variables
  const [selectedFiles, setSelectedFiles] = useState<GoogleFile[]>([]);
  const [displayFiles, setDisplayFiles] = useState<GoogleFile[]>([]);
  const [userPrompt, setUserPrompt] = useState(
    "Summarize this content in detail, highlighting key points and insights."
  );
  const [aiModel, setAiModel] = useState("google/gemini-2.5-flash-preview");
  const [maxFiles, setMaxFiles] = useState<number>(DEFAULT_MAX_FILES);
  const [includeSubfolders, setIncludeSubfolders] = useState(true);
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
  }, []);

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

      // Call OpenRouter API
      const result = await analyzeWithOpenRouter(combinedContent, userPrompt, {
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
  }, [accessToken, selectedFiles, userPrompt, aiModel]);

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

  // Debug information
  useEffect(() => {
    console.log("Auth state:", {
      isSignedIn,
      accessToken: !!accessToken,
      loading,
    });
    console.log("Picker ready:", isReady);
  }, [isSignedIn, accessToken, loading, isReady]);

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
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Saved Prompts</SheetTitle>
                    <SheetDescription>
                      Create and manage your saved prompts for quick access.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="mt-6 space-y-6">
                    {/* Add new prompt form */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Add New Prompt</h3>
                      <div className="grid gap-2">
                        <Label htmlFor="promptTitle">Title</Label>
                        <Input 
                          id="promptTitle" 
                          value={newPromptTitle}
                          onChange={(e) => setNewPromptTitle(e.target.value)} 
                          placeholder="Enter a title for your prompt"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="promptContent">Content</Label>
                        <Textarea 
                          id="promptContent" 
                          value={newPromptContent}
                          onChange={(e) => setNewPromptContent(e.target.value)} 
                          placeholder="Enter the prompt content"
                          rows={4}
                        />
                      </div>
                      <Button 
                        onClick={handleSavePrompt} 
                        className="w-full"
                        disabled={!newPromptTitle.trim() || !newPromptContent.trim()}
                      >
                        <Save className="mr-2 h-4 w-4" />
                        Save Prompt
                      </Button>
                    </div>
                    
                    <Separator />
                    
                    {/* Saved prompts list */}
                    <div className="space-y-4">
                      <h3 className="font-medium">Your Saved Prompts</h3>
                      {savedPrompts.length > 0 ? (
                        <ScrollArea className="h-[200px]">
                          <div className="space-y-2">
                            {savedPrompts.map((prompt) => (
                              <div 
                                key={prompt.id} 
                                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
                              >
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{prompt.title}</p>
                                  <p className="text-xs text-muted-foreground truncate">
                                    {prompt.content.length > 50
                                      ? prompt.content.substring(0, 50) + "..."
                                      : prompt.content}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeletePrompt(prompt.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      ) : (
                        <div className="text-center py-4 text-muted-foreground">
                          No saved prompts yet. Add one above!
                        </div>
                      )}
                    </div>
                  </div>
                </SheetContent>
              </Sheet>

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
                    <Check className="w-3 h-3 text-white" />
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

                {/* Selected Files List */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-medium">Selected Files</h3>
                    <Badge
                      variant={selectedFiles.length > 0 ? "default" : "outline"}
                    >
                      {selectedFiles.length} file(s)
                    </Badge>
                  </div>

                  {selectedFiles.length > 0 ? (
                    <ScrollArea className="h-48 border rounded-md p-2">
                      <ul className="space-y-1">
                        {displayFiles.map((file) => (
                          <li
                            key={file.id}
                            className="flex items-center gap-2 p-1 hover:bg-muted/50 rounded group"
                          >
                            <FileText className="h-4 w-4 shrink-0" />
                            <span className="truncate flex-1">{file.name}</span>
                            <Badge
                              variant="outline"
                              className="text-xs ml-2 shrink-0"
                            >
                              {file.mimeType.split(".").pop()}
                            </Badge>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity ml-auto shrink-0"
                              onClick={() => handleRemoveFile(file.id)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </li>
                        ))}
                        {selectedFiles.length > displayFiles.length && (
                          <li className="text-center text-sm text-muted-foreground pt-2">
                            + {selectedFiles.length - displayFiles.length} more
                            files
                          </li>
                        )}
                      </ul>
                    </ScrollArea>
                  ) : (
                    <div className="h-48 border rounded-md flex items-center justify-center text-muted-foreground">
                      No files selected. Use the buttons above to select files
                      or a folder.
                    </div>
                  )}
                </div>

                <Separator />

                {/* Configuration Section */}
                <div className="grid gap-4">
                  <div className="relative">
                    <Label htmlFor="prompt">Prompt (Instructions for AI)</Label>
                    <Textarea
                      id="prompt"
                      value={userPrompt}
                      onChange={handleTextAreaInput}
                      placeholder="What would you like the AI to do with the selected documents?"
                      rows={3}
                      ref={textareaRef}
                    />
                    
                    {isPromptCommandOpen && (
                      <div className="absolute left-0 right-0 bottom-full mb-2 z-10">
                        <Command className="border shadow-md rounded-lg">
                          <CommandInput placeholder="Search saved prompts..." />
                          <CommandList>
                            <CommandEmpty>No saved prompts found</CommandEmpty>
                            <CommandGroup heading="Saved Prompts">
                              {savedPrompts.map(prompt => (
                                <CommandItem 
                                  key={prompt.id} 
                                  onSelect={() => handleInsertPrompt(prompt)}
                                  className="flex items-center justify-between"
                                >
                                  <span>{prompt.title}</span>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="model">AI Model</Label>
                      <Input
                        id="model"
                        value={aiModel}
                        onChange={(e) => setAiModel(e.target.value)}
                        placeholder="OpenRouter model"
                      />
                    </div>
                    <div>
                      <Label htmlFor="maxFiles">
                        Max Files (for folder selection)
                      </Label>
                      <Input
                        id="maxFiles"
                        type="number"
                        min="1"
                        max="100"
                        value={maxFiles}
                        onChange={(e) => setMaxFiles(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeSubfolders"
                      checked={includeSubfolders}
                      onCheckedChange={(checked) =>
                        setIncludeSubfolders(!!checked)
                      }
                    />
                    <Label htmlFor="includeSubfolders">
                      Include Subfolders (when selecting folder)
                    </Label>
                  </div>
                </div>

                <Alert variant="default" className="bg-muted/50">
                  <AlertTitle>Processing Information</AlertTitle>
                  <AlertDescription>
                    Files will be processed up to{" "}
                    {MAX_DOC_CHARS.toLocaleString()} characters each. When
                    selecting a folder, up to {maxFiles} most recent files will
                    be processed.
                  </AlertDescription>
                </Alert>
              </div>
            </TabsContent>

            <TabsContent value="result">
              <div className="space-y-4">
                {processingStatus.isProcessing && (
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span>{processingStatus.currentStep}</span>
                      <span>
                        {processingStatus.processedFiles} /{" "}
                        {processingStatus.totalFiles} files
                      </span>
                    </div>
                    <Progress value={processingStatus.progress} />
                  </div>
                )}

                {aiOutput ? (
                  <div className="relative">
                    <Button
                      className="absolute top-2 right-2 z-10"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(aiOutput);
                        toast.success("Results copied to clipboard");
                      }}
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy
                    </Button>
                    <ScrollArea className="border rounded-md p-4 h-[500px]">
                      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                        {aiOutput.split("\n").map((line, i) => (
                          <React.Fragment key={i}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                ) : (
                  <div className="h-[500px] border rounded-md flex items-center justify-center text-muted-foreground">
                    {processingStatus.isProcessing
                      ? "Processing... Please wait."
                      : "No analysis results yet. Select files and run analysis."}
                  </div>
                )}
              </div>
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
