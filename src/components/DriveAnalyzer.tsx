import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Play, Save, Trash2, FileDown, Upload, Zap, Settings } from "lucide-react";
import { toast } from "sonner";

import useAnalysisState from "@/hooks/useAnalysisState";
import { useDrivePicker } from "@/hooks/useDrivePicker";
import { useGoogleAuth } from "@/hooks/useGoogleAuth";

import { FileList } from "./drive-analyzer/FileList";
import { LocalFileInput } from "./drive-analyzer/LocalFileInput";
import { TextUrlInput } from "./drive-analyzer/TextUrlInput";
import { CrawlingOptions } from "./drive-analyzer/CrawlingOptions";
import { ConfigurationOptions } from "./drive-analyzer/ConfigurationOptions";
import { AnalysisResults } from "./drive-analyzer/AnalysisResults";
import { ProcessingStatus } from "./drive-analyzer/ProcessingStatus";
import { SavedPrompts } from "./drive-analyzer/SavedPrompts";
import { SavedAnalysesSidebar } from "./drive-analyzer/SavedAnalysesSidebar";
import { CachedDocumentsManager } from "./drive-analyzer/CachedDocumentsManager";

import { analyzeWithAI } from "@/utils/openrouter-api";
import { crawlUrls } from "@/utils/scraping";
import { processLocalFiles } from "@/utils/local-file-processor";
import { fetchFileContent } from "@/utils/google-api";
import { sendToWebhook } from "@/utils/webhook-sender";

export default function DriveAnalyzer() {
  const {
    selectedFiles,
    displayFiles,
    localFiles,
    handleAddFiles,
    handleRemoveFile,
    handleRemoveLocalFile,
    handleClearFiles,
    handleAddLocalFiles,
    handleClearLocalFiles,
    pastedText,
    handlePastedTextChange,
    handleClearPastedText,
    currentUrlInput,
    setCurrentUrlInput,
    urls,
    handleAddUrl,
    handleRemoveUrl,
    handleClearUrls,
    webhookUrl,
    handleWebhookUrlChange,
    crawlingOptions,
    handleCrawlingOptionsChange,
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

  const { isSignedIn, signIn, signOut, accessToken } = useGoogleAuth();
  const { openPicker } = useDrivePicker(accessToken, handleAddFiles);

  const [customInstructions, setCustomInstructions] = useState(localStorage.getItem("drive-analyzer-custom-instructions") || "");
  const [isProcessing, setIsProcessing] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (aiOutput) {
      setSaved(false);
    }
  }, [aiOutput]);

  useEffect(() => {
    localStorage.setItem("drive-analyzer-custom-instructions", customInstructions);
  }, [customInstructions]);

  const handleAnalyze = async () => {
    if (isProcessing) {
      toast.error("Analysis is already in progress. Please wait.");
      return;
    }

    if (!userPrompt) {
      toast.error("Please enter a prompt.");
      return;
    }

    if (
      selectedFiles.length === 0 &&
      localFiles.length === 0 &&
      urls.length === 0 &&
      pastedText.length === 0 &&
      selectedAnalysisIdsForPrompt.length === 0
    ) {
      toast.error("Please select at least one file, enter text, or select a saved analysis.");
      return;
    }

    setIsProcessing(true);
    setAiOutput("");
    setProcessingStatus({
      isProcessing: true,
      currentStep: "Preparing...",
      progress: 0,
      totalFiles: selectedFiles.length + localFiles.length + urls.length,
      processedFiles: 0,
    });

    try {
      let allContent = "";

      // 1. Saved Analyses
      const savedAnalysisContent = savedAnalyses
        .filter((analysis) => selectedAnalysisIdsForPrompt.includes(analysis.id))
        .map((analysis) => `Title: ${analysis.title}\nContent:${analysis.aiOutput}`)
        .join("\n\n");
      allContent += savedAnalysisContent;

      // 2. Google Drive Files
      if (selectedFiles.length > 0) {
        setProcessingStatus((prev) => ({ ...prev, currentStep: "Fetching Google Drive files..." }));
        await Promise.all(
          selectedFiles.map(async (file) => {
            try {
              const content = await fetchFileContent(file, accessToken);
              allContent += `\n\n${file.name}:\n${content}`;
            } catch (error: any) {
              toast.error(`Failed to fetch content from ${file.name}: ${error.message || error}`);
            } finally {
              setProcessingStatus((prev) => ({ ...prev, processedFiles: prev.processedFiles + 1, progress: (prev.processedFiles / prev.totalFiles) * 100 }));
            }
          })
        );
      }

      // 3. Local Files
      if (localFiles.length > 0) {
        setProcessingStatus((prev) => ({ ...prev, currentStep: "Processing local files..." }));
        const localFileContents = await processLocalFiles(localFiles);
        localFileContents.forEach((content, index) => {
          allContent += `\n\n${localFiles[index].name}:\n${content}`;
          setProcessingStatus((prev) => ({ ...prev, processedFiles: prev.processedFiles + 1, progress: (prev.processedFiles / prev.totalFiles) * 100 }));
        });
      }

      // 4. URLs
      if (urls.length > 0) {
        setProcessingStatus((prev) => ({ ...prev, currentStep: "Crawling URLs..." }));
        const crawledContent = await crawlUrls(urls, crawlingOptions);
        crawledContent.forEach((content, index) => {
          allContent += `\n\n${urls[index]}:\n${content}`;
          setProcessingStatus((prev) => ({ ...prev, processedFiles: prev.processedFiles + 1, progress: (prev.processedFiles / prev.totalFiles) * 100 }));
        });
      }

      // 5. Pasted Text
      if (pastedText.length > 0) {
        allContent += `\n\nPasted Text:\n${pastedText}`;
      }

      // Analyze with AI
      setProcessingStatus((prev) => ({ ...prev, currentStep: "Analyzing with AI..." }));
      const analysis = await analyzeWithAI(allContent, userPrompt, customInstructions);
      setAiOutput(analysis);

      // Send to Webhook
      if (webhookUrl) {
        setProcessingStatus((prev) => ({ ...prev, currentStep: "Sending to webhook..." }));
        await sendToWebhook(webhookUrl, analysis, {
          selectedFiles: selectedFiles.map((file) => file.name),
          localFiles: localFiles.map((file) => file.name),
          urls: urls,
          pastedText: pastedText,
          prompt: userPrompt,
        });
      }

      setProcessingStatus((prev) => ({ ...prev, currentStep: "Analysis Complete", progress: 100 }));
      toast.success("Analysis complete!");
    } catch (error: any) {
      console.error("Analysis failed", error);
      toast.error(`Analysis failed: ${error.message || error}`);
    } finally {
      setIsProcessing(false);
      setProcessingStatus((prev) => ({ ...prev, isProcessing: false }));
    }
  };

  const handleSaveCurrentAnalysis = () => {
    if (!aiOutput) {
      toast.error("No analysis to save.");
      return;
    }

    const title = prompt("Enter a title for this analysis:", "Analysis Result");
    if (title) {
      const analysisToSave = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        title: title,
        prompt: userPrompt,
        aiOutput: aiOutput,
        sources: [
          ...selectedFiles.map((file) => ({ id: file.id, name: file.name, type: "google" })),
          ...localFiles.map((file) => ({ id: `${file.name}-${file.lastModified}`, name: file.name, type: "local" })),
          ...urls.map((url) => ({ id: url, name: url, type: "url" })),
          ...(pastedText ? [{ id: "pasted-text", name: "Pasted Text", type: "text" }] : []),
        ],
      };
      handleSaveAnalysis(analysisToSave);
      setSaved(true);
    } else {
      toast.info("Saving cancelled.");
    }
  };

  const handleClearAllSources = () => {
    handleClearFiles();
    handleClearLocalFiles();
    handleClearUrls();
    handleClearPastedText();
    setSelectedAnalysisIdsForPrompt([]);
    setAiOutput("");
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header and Authentication Section */}
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">Drive AI Analyzer</h1>
        <p className="text-muted-foreground">
          Unleash the power of AI to analyze your Google Drive files, local documents, and web content.
        </p>
        <div className="mt-4">
          {isSignedIn ? (
            <>
              <Button variant="destructive" onClick={signOut}>
                Sign Out
              </Button>
              <Badge className="ml-2">Signed in as {isSignedIn ? "Google User" : "Guest"}</Badge>
            </>
          ) : (
            <Button onClick={signIn}>Sign In with Google</Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          {/* File Sources Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Sources
              </CardTitle>
              <CardDescription>
                Add files from Google Drive or upload local files
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="files">Files</TabsTrigger>
                  <TabsTrigger value="text">Text/URLs</TabsTrigger>
                  <TabsTrigger value="cache">Cache</TabsTrigger>
                </TabsList>

                <TabsContent value="files" className="space-y-4">
                  <div className="flex flex-wrap gap-2">
                    {isSignedIn ? (
                      <Button onClick={openPicker} variant="outline" className="flex items-center gap-2">
                        <FileDown className="h-4 w-4" />
                        Pick from Google Drive
                      </Button>
                    ) : (
                      <Button variant="secondary" onClick={signIn} className="flex items-center gap-2">
                        <FileDown className="h-4 w-4" />
                        Connect Google Drive
                      </Button>
                    )}
                  </div>
                  
                  <LocalFileInput 
                    onFilesAdded={handleAddLocalFiles}
                    acceptedTypes=".txt,.pdf,.doc,.docx,.json,.csv,.md"
                  />

                  <FileList
                    googleFiles={selectedFiles}
                    localFiles={localFiles}
                    displayFiles={displayFiles}
                    onRemoveGoogleFile={handleRemoveFile}
                    onRemoveLocalFile={handleRemoveLocalFile}
                    onClearGoogleFiles={handleClearFiles}
                    selectedAnalysisIdsForPrompt={selectedAnalysisIdsForPrompt}
                    savedAnalyses={savedAnalyses}
                    accessToken={accessToken}
                  />
                </TabsContent>

                <TabsContent value="text" className="space-y-4">
                  <TextUrlInput
                    currentUrlInput={currentUrlInput}
                    setCurrentUrlInput={setCurrentUrlInput}
                    urls={urls}
                    onAddUrl={handleAddUrl}
                    onRemoveUrl={handleRemoveUrl}
                    onClearUrls={handleClearUrls}
                    webhookUrl={webhookUrl}
                    onWebhookUrlChange={handleWebhookUrlChange}
                  />
                  <Textarea
                    placeholder="Paste your text here..."
                    value={pastedText}
                    onChange={(e) => handlePastedTextChange(e.target.value)}
                    className="min-h-[100px]"
                  />
                  <div className="flex justify-end">
                    <Button variant="secondary" size="sm" onClick={handleClearPastedText}>
                      Clear Text
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="cache" className="space-y-4">
                  <CachedDocumentsManager />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>

          {/* Configuration Options Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configuration
              </CardTitle>
              <CardDescription>Adjust crawling and analysis settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <CrawlingOptions crawlingOptions={crawlingOptions} onCrawlingOptionsChange={handleCrawlingOptionsChange} />
              <ConfigurationOptions customInstructions={customInstructions} setCustomInstructions={setCustomInstructions} />
            </CardContent>
          </Card>

          {/* Analysis Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Analysis
              </CardTitle>
              <CardDescription>Enter your prompt and analyze the selected content</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Textarea
                  placeholder="Enter your prompt here..."
                  value={userPrompt}
                  onChange={(e) => setUserPrompt(e.target.value)}
                  className="min-h-[100px]"
                />
                <div className="flex justify-between items-center">
                  <Button
                    className="flex items-center gap-2"
                    onClick={handleAnalyze}
                    disabled={processingStatus.isProcessing}
                  >
                    <Play className="h-4 w-4" />
                    Start Analysis
                  </Button>
                  <Button
                    variant="secondary"
                    className="flex items-center gap-2"
                    onClick={handleClearAllSources}
                    disabled={processingStatus.isProcessing}
                  >
                    <Trash2 className="h-4 w-4" />
                    Clear Sources
                  </Button>
                </div>
              </div>
              <AnalysisResults aiOutput={aiOutput} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="lg:col-span-1">
          <SavedAnalysesSidebar
            savedAnalyses={savedAnalyses}
            handleRenameAnalysis={handleRenameAnalysis}
            handleDeleteAnalysis={handleDeleteAnalysis}
            handleDeleteAllAnalyses={handleDeleteAllAnalyses}
            selectedAnalysisIdsForPrompt={selectedAnalysisIdsForPrompt}
            toggleAnalysisSelectionForPrompt={toggleAnalysisSelectionForPrompt}
            handleImportAnalysis={handleImportAnalysis}
          />

          <div className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Actions</CardTitle>
                <CardDescription>Save or download the current analysis</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  variant={saved ? "secondary" : "default"}
                  className="w-full flex items-center gap-2"
                  onClick={handleSaveCurrentAnalysis}
                  disabled={processingStatus.isProcessing}
                >
                  <Save className="h-4 w-4" />
                  {saved ? "Saved" : "Save Analysis"}
                </Button>
                {aiOutput && (
                  <Button
                    variant="outline"
                    className="w-full flex items-center gap-2"
                    onClick={() => {
                      const blob = new Blob([aiOutput], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "analysis.txt";
                      document.body.appendChild(a);
                      a.click();
                      document.body.removeChild(a);
                      URL.revokeObjectURL(url);
                    }}
                    disabled={processingStatus.isProcessing}
                  >
                    <FileDown className="h-4 w-4" />
                    Download Analysis
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Processing Status */}
      <ProcessingStatus processingStatus={processingStatus} />
    </div>
  );
}
