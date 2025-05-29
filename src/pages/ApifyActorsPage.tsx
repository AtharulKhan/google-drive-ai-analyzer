import React, { useState, useEffect } from 'react';
import PageLayout from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react'; // For loading indicator
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shapes } from 'lucide-react';
import { toast } from 'sonner';
import { Textarea } from "@/components/ui/textarea"; // Added for AI Prompt
import { Markdown } from "@/components/ui/markdown"; // Added for AI Result Display
import { analyzeWithOpenRouter } from "@/utils/openrouter-api"; // Added for AI Analysis
import SmartArticleExtractorForm from '@/components/apify-actors/SmartArticleExtractorForm';
import BingSearchScraperForm from '@/components/apify-actors/BingSearchScraperForm';
import RssXmlScraperForm from '@/components/apify-actors/RssXmlScraperForm';
import { runApifyActor, ApiActorRunResult } from '@/utils/apify-api'; // Fixed import

// Define the extended ActorRunResult type
interface ActorRunResult extends ApiActorRunResult {
  actorName?: string;
  timestamp?: string;
}

// Corrected Actor IDs
const availableActors = [
  { id: 'smart-article-extractor', name: 'Smart Article Extractor', description: 'Extracts articles from news websites, blogs, etc. Uses actor: lukaskrivka/article-extractor-smart', actualActorId: 'lukaskrivka/article-extractor-smart' },
  { id: 'bing-search-scraper', name: 'Bing Search Scraper', description: 'Scrapes Bing search results pages. Uses actor: tri_angle/bing-search-scraper', actualActorId: 'tri_angle/bing-search-scraper' },
  { id: 'rss-xml-scraper', name: 'RSS / XML Scraper', description: 'Scrapes content from RSS feeds and XML files. Uses actor: jupri/rss-xml-scraper', actualActorId: 'jupri/rss-xml-scraper' },
];

const ApifyActorsPage: React.FC = () => {
  const [selectedActorId, setSelectedActorId] = useState<string | null>(null);
  const [apifyToken, setApifyToken] = useState<string | null>(null);
  const [isRunningActor, setIsRunningActor] = useState<boolean>(false);
  const [actorRunResultsData, setActorRunResultsData] = useState<ActorRunResult[]>([]);
  const [actorRunError, setActorRunError] = useState<any | null>(null); // Store general errors too

  // State for AI Analysis
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [aiAnalysisResult, setAiAnalysisResult] = useState<string | null>(null);
  const [isAnalyzingWithAI, setIsAnalyzingWithAI] = useState<boolean>(false);
  const [aiAnalysisError, setAiAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('apifyApiToken');
    if (token) {
      setApifyToken(token);
    } else {
      toast.warning("Apify API token not found. Please set it in Settings.", {
        description: "You won't be able to run actors until the token is set.",
      });
    }
  }, []);

  const handleActorSelect = (actorId: string) => {
    setSelectedActorId(actorId);
    // Not clearing actorRunResultsData here to maintain a list of all runs
    setActorRunError(null);
  };

  const handleActorSubmit = async (formActorId: string, data: any) => {
    if (!apifyToken) {
      toast.error("Apify API Token is missing.", {
        description: "Please set your Apify API token in the settings page.",
      });
      return;
    }

    const actorToRun = availableActors.find(a => a.id === formActorId);
    if (!actorToRun) {
      toast.error("Selected actor details not found.");
      return;
    }
    const actualActorId = actorToRun.actualActorId;

    setIsRunningActor(true);
    setActorRunError(null);

    try {
      toast.info(`Starting ${actorToRun.name}...`);
      const result = await runApifyActor(actualActorId, data, apifyToken);
      
      if (result.success) {
        const newResult: ActorRunResult = {
          ...result,
          actorName: actorToRun.name,
          timestamp: new Date().toISOString(),
        };
        setActorRunResultsData(prevResults => [...prevResults, newResult]);
        toast.success(`${actorToRun.name} finished successfully!`, {
          description: `${newResult.data?.length || 0} items fetched. Run ID: ${newResult.runId}`,
        });
      } else {
        const errorMessage = typeof result.error === 'string' ? result.error : result.error?.message || 'Actor run failed. Check console for details.';
        setActorRunError(result.error || { message: 'Actor run failed. Check console for details.' });
        toast.error(`${actorToRun.name} failed.`, {
          description: `Error: ${errorMessage}. Run ID: ${result.runId || 'N/A'}. Check console for details.`,
        });
      }
    } catch (error: any) {
      const errorMessage = error.message || 'An unexpected error occurred during actor execution.';
      setActorRunError({ message: errorMessage, details: error });
      toast.error(`An unexpected error occurred with ${actorToRun.name}.`, {
        description: errorMessage || 'Check console for details.',
      });
    } finally {
      setIsRunningActor(false);
    }
  };

  const formatActorResultsForAI = (results: ActorRunResult[]): string => {
    let formattedString = "";
    const commonFields = ['title', 'url', 'link', 'href', 'text', 'summary', 'description', 'name', 'content', 'snippet'];

    results.forEach((result, index) => {
      formattedString += `## Results from ${result.actorName || 'Unknown Actor'} (Timestamp: ${result.timestamp ? new Date(result.timestamp).toLocaleString() : 'N/A'}) ##\n\n`;

      if (result.data) {
        if (Array.isArray(result.data)) {
          if (result.data.length === 0) {
            formattedString += "No data items found in this run.\n";
          } else {
            result.data.forEach((item, itemIndex) => {
              let itemSummary = "";
              if (item && typeof item === 'object') {
                const itemKeys = Object.keys(item);
                let foundFields = 0;
                commonFields.forEach(field => {
                  const key = itemKeys.find(k => k.toLowerCase() === field.toLowerCase());
                  if (key && item[key]) {
                    // Capitalize first letter of field for display
                    const displayField = field.charAt(0).toUpperCase() + field.slice(1);
                    itemSummary += `${displayField}: ${item[key]}\n`;
                    foundFields++;
                  }
                });

                // Add other relevant fields if not too many already
                if (foundFields < 5) {
                    itemKeys.forEach(key => {
                        // Avoid re-adding already processed common fields and keep it concise
                        if (!commonFields.includes(key.toLowerCase()) && item[key] && typeof item[key] !== 'object' && String(item[key]).length < 200) {
                            if (foundFields < 6) { // Limit total fields to avoid excessive length
                                itemSummary += `${key}: ${item[key]}\n`;
                                foundFields++;
                            }
                        }
                    });
                }
              }

              if (itemSummary) {
                formattedString += `Item ${itemIndex + 1}:\n${itemSummary}---\n`;
              } else if (typeof item === 'string') {
                formattedString += `Item ${itemIndex + 1}:\n${item}\n---\n`;
              } else {
                // Fallback for items that are not objects/strings or have no common fields
                formattedString += `Item ${itemIndex + 1}:\n${JSON.stringify(item, null, 2)}\n---\n`;
              }
            });
          }
        } else {
          // If result.data is not an array but exists
          formattedString += `${JSON.stringify(result.data, null, 2)}\n`;
        }
      } else {
        formattedString += "No data found for this run.\n";
      }

      if (index < results.length - 1) {
        formattedString += "\n====================================\n\n";
      }
    });

    return formattedString;
  };

  const handleAiAnalysisSubmit = async () => {
    if (!userPrompt || actorRunResultsData.length === 0) {
      toast.warning("Please enter a prompt and ensure there are actor results to analyze.");
      return;
    }

    setIsAnalyzingWithAI(true);
    setAiAnalysisResult(null);
    setAiAnalysisError(null);
    toast.info("Starting AI analysis...");

    try {
      const contextData = formatActorResultsForAI(actorRunResultsData);
      
      if (!contextData.trim()) {
        toast.error("No data available from actor runs to analyze.", {
          description: "Please ensure your actor runs have produced some output or the formatting resulted in empty content."
        });
        setIsAnalyzingWithAI(false);
        return;
      }

      const analysis = await analyzeWithOpenRouter(contextData, userPrompt);
      
      if (analysis.success && analysis.markdownReport) {
        setAiAnalysisResult(analysis.markdownReport);
        toast.success("AI analysis completed successfully.");
      } else {
        const errorMsg = typeof analysis.error === 'string' ? analysis.error : analysis.error?.message || "AI analysis failed. No specific error message provided.";
        setAiAnalysisError(errorMsg);
        toast.error("AI Analysis Failed", { description: errorMsg });
      }
    } catch (error: any) {
      const errorMsg = error.message || "An unexpected error occurred during AI analysis.";
      setAiAnalysisError(errorMsg);
      toast.error("AI Analysis Error", { description: errorMsg });
    } finally {
      setIsAnalyzingWithAI(false);
    }
  };

  const selectedActorDetails = availableActors.find(actor => actor.id === selectedActorId);

  return (
    <PageLayout>
      <div className="container mx-auto p-4">
        <header className="mb-6">
          <h1 className="text-3xl font-bold">Apify Actors</h1>
          <p className="text-muted-foreground">
            Select an Apify actor to configure its parameters and integrate its data.
          </p>
        </header>

        <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
          {/* Column for Actor Selection */}
          <div className="md:col-span-1">
            <Card className="shadow-lg sticky top-20"> {/* Added sticky top for selection list */}
              <CardHeader>
                <CardTitle>Available Actors</CardTitle>
                <CardDescription>Choose an actor to configure.</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[calc(100vh-200px)] pr-3"> {/* ScrollArea for long list */}
                  <div className="space-y-3">
                    {availableActors.map((actor) => (
                      <Button
                        key={actor.id}
                        variant={selectedActorId === actor.id ? "default" : "outline"}
                        className="w-full justify-start text-left h-auto py-3"
                        onClick={() => handleActorSelect(actor.id)}
                      >
                        <div>
                          <p className="font-semibold">{actor.name}</p>
                          <p className="text-xs text-muted-foreground mt-1">{actor.description}</p>
                        </div>
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>

          {/* Column for Actor Configuration Form */}
          <div className="md:col-span-2">
            <Card className="shadow-lg min-h-[calc(100vh-120px)]"> {/* Ensure card takes height */}
              <CardHeader>
                <CardTitle>
                  {selectedActorDetails ? `${selectedActorDetails.name} Configuration` : "Actor Configuration"}
                </CardTitle>
                <CardDescription>
                  {selectedActorDetails ? `Set the parameters for ${selectedActorDetails.name}.` : "Select an actor from the list to see its options."}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {selectedActorId === 'smart-article-extractor' && selectedActorDetails ? (
                  <SmartArticleExtractorForm
                    apifyToken={apifyToken}
                    onSubmit={(data) => handleActorSubmit('smart-article-extractor', data)}
                    isLoading={isRunningActor}
                  />
                ) : selectedActorId === 'bing-search-scraper' && selectedActorDetails ? (
                  <BingSearchScraperForm
                    apifyToken={apifyToken}
                    onSubmit={(data) => handleActorSubmit('bing-search-scraper', data)}
                    isLoading={isRunningActor}
                  />
                ) : selectedActorId === 'rss-xml-scraper' && selectedActorDetails ? (
                  <RssXmlScraperForm
                    apifyToken={apifyToken}
                    onSubmit={(data) => handleActorSubmit('rss-xml-scraper', data)}
                    isLoading={isRunningActor}
                  />
                ) : selectedActorId && selectedActorDetails ? (
                  <div className="p-6">
                    <p className="text-lg font-semibold mb-2">Configure: {selectedActorDetails.name}</p>
                    <p>Configuration form for "{selectedActorDetails.name}" is not yet implemented.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center h-full min-h-[300px] p-6">
                    <Shapes size={48} className="text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      Select an actor from the list on the left to view and configure its options.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results/Error Display Area */}
            {(isRunningActor || actorRunResultsData.length > 0 || actorRunError) && (
              <Card className="shadow-lg mt-6 lg:mt-8">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Actor Run Status</CardTitle>
                  {actorRunResultsData.length > 0 && !isRunningActor && (
                    <Button variant="outline" size="sm" onClick={() => {
                      setActorRunResultsData([]);
                      setActorRunError(null);
                      toast.info("All actor run results cleared.");
                    }}>
                      Clear All Results
                    </Button>
                  )}
                </CardHeader>
                <CardContent>
                  {isRunningActor && (
                    <div className="flex items-center space-x-2 mb-4"> {/* Added mb-4 for spacing */}
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Actor is running... Please wait.</span>
                    </div>
                  )}
                  {actorRunError && !isRunningActor && (
                    <div className="mb-4"> {/* Added mb-4 for spacing if results follow */}
                      <h3 className="text-red-600 font-semibold">Last Run Failed:</h3>
                      <pre className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400 overflow-auto">
                        {typeof actorRunError === 'string' ? actorRunError : JSON.stringify(actorRunError, null, 2)}
                      </pre>
                    </div>
                  )}
                  {!isRunningActor && actorRunResultsData.length > 0 && (
                    <ScrollArea className="h-[400px] pr-3"> {/* ScrollArea for multiple results */}
                      {actorRunResultsData.slice().reverse().map((runResult, index) => ( // Display newest first
                        <Card key={runResult.runId || `run-${index}-${runResult.timestamp}`} className="mb-4 shadow-md">
                          <CardHeader className="pb-3 pt-4 bg-slate-50 dark:bg-slate-800/50 rounded-t-lg">
                            <CardTitle className="text-base flex justify-between items-center">
                              <span>{runResult.actorName || 'Actor'} Run</span>
                              <span className="text-xs font-normal text-muted-foreground">
                                {runResult.timestamp ? new Date(runResult.timestamp).toLocaleString() : 'N/A'}
                              </span>
                            </CardTitle>
                            <CardDescription className="text-xs pt-1">
                              Run ID: {runResult.runId || 'N/A'} 
                              {runResult.datasetId && ` | Dataset ID: ${runResult.datasetId}`}
                            </CardDescription>
                          </CardHeader>
                          <CardContent className="pt-3">
                            <p className="text-sm mb-2">
                              Status: <span className="font-semibold text-green-600">Successful</span> | Fetched {runResult.data?.length || 0} items.
                            </p>
                            {runResult.data && runResult.data.length > 0 ? (
                              <ScrollArea className="h-[200px] border rounded p-2 bg-gray-50 dark:bg-gray-900/60 text-xs">
                                <pre>
                                  {JSON.stringify(runResult.data.slice(0, 5), null, 2)}
                                  {runResult.data.length > 5 && `\n... (showing first 5 items of ${runResult.data.length})`}
                                </pre>
                              </ScrollArea>
                            ) : (
                              <p className="text-sm text-muted-foreground">No items returned in this run.</p>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </ScrollArea>
                  )}
                  {!isRunningActor && actorRunResultsData.length === 0 && !actorRunError && (
                     <div className="flex flex-col items-center justify-center text-center h-full min-h-[100px] p-6">
                        <Shapes size={32} className="text-muted-foreground mb-3" />
                        <p className="text-sm text-muted-foreground">
                          No actor runs performed yet, or all results have been cleared.
                        </p>
                     </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* AI Analysis Section */}
            <Card className="shadow-lg mt-6 lg:mt-8">
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
                <CardDescription>
                  Use the combined results from successful actor runs as context for an AI prompt.
                  Ensure your OpenRouter API key is set in Settings.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Textarea
                    placeholder="Enter your prompt here to analyze the actor run results..."
                    value={userPrompt}
                    onChange={(e) => setUserPrompt(e.target.value)}
                    rows={4}
                    disabled={isAnalyzingWithAI || actorRunResultsData.length === 0}
                  />
                  <Button
                    onClick={handleAiAnalysisSubmit}
                    disabled={
                      !userPrompt.trim() ||
                      actorRunResultsData.length === 0 ||
                      isRunningActor || // Also disable if an actor is running, to avoid confusion/overlap
                      isAnalyzingWithAI
                    }
                  >
                    {isAnalyzingWithAI ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Analyze with AI
                  </Button>

                  {(isAnalyzingWithAI || aiAnalysisResult || aiAnalysisError) && (
                    <div className="pt-4">
                      <h4 className="text-md font-semibold mb-2">AI Analysis Result:</h4>
                      {isAnalyzingWithAI && (
                        <div className="flex items-center space-x-2 text-muted-foreground">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>AI is analyzing... Please wait.</span>
                        </div>
                      )}
                      {aiAnalysisError && !isAnalyzingWithAI && (
                        <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400">
                          <p className="font-semibold">Error:</p>
                          <pre className="whitespace-pre-wrap">{aiAnalysisError}</pre>
                        </div>
                      )}
                      {aiAnalysisResult && !isAnalyzingWithAI && (
                        <Card className="bg-slate-50 dark:bg-slate-800/50">
                          <CardContent className="p-4 prose dark:prose-invert max-w-none">
                            <Markdown content={aiAnalysisResult} />
                          </CardContent>
                        </Card>
                      )}
                       {!isAnalyzingWithAI && !aiAnalysisResult && !aiAnalysisError && actorRunResultsData.length > 0 && (
                         <p className="text-sm text-muted-foreground">Enter a prompt and click "Analyze with AI" to see results here.</p>
                       )}
                       {!isAnalyzingWithAI && !aiAnalysisResult && !aiAnalysisError && actorRunResultsData.length === 0 && (
                         <p className="text-sm text-muted-foreground">Run an actor first to generate data for analysis.</p>
                       )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ApifyActorsPage;
