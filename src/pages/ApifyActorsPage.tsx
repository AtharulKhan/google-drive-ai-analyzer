import React, { useState, useEffect } from 'react';
import PageLayout from "@/components/layout/PageLayout";
import { Button } from "@/components/ui/button";
import { Loader2 } from 'lucide-react'; // For loading indicator
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shapes } from 'lucide-react';
import { toast } from 'sonner';
import SmartArticleExtractorForm from '@/components/apify-actors/SmartArticleExtractorForm';
import BingSearchScraperForm from '@/components/apify-actors/BingSearchScraperForm';
import RssXmlScraperForm from '@/components/apify-actors/RssXmlScraperForm';
import { runApifyActor, ActorRunResult } from '@/utils/apify-api'; // Updated import

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
  const [actorRunResult, setActorRunResult] = useState<ActorRunResult | null>(null);
  const [actorRunError, setActorRunError] = useState<any | null>(null); // Store general errors too

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
    setActorRunResult(null); // Clear previous results when changing actor
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
    setActorRunResult(null);
    setActorRunError(null);

    try {
      toast.info(`Starting ${actorToRun.name}...`);
      const result = await runApifyActor(actualActorId, data, apifyToken);
      
      if (result.success) {
        setActorRunResult(result);
        console.log(`Actor ${actorToRun.name} finished successfully. Results:`, result.data);
        toast.success(`${actorToRun.name} finished successfully!`, {
          description: `${result.data?.length || 0} items fetched. Results logged and displayed. Run ID: ${result.runId}`,
        });
      } else {
        setActorRunError(result.error || 'Actor run failed. Check console for details.');
        console.error(`Actor ${actorToRun.name} failed. Error:`, result.error, "Run ID:", result.runId);
        toast.error(`${actorToRun.name} failed.`, {
          description: `Error: ${result.error || 'Unknown error'}. Run ID: ${result.runId || 'N/A'}. Check console.`,
        });
      }
    } catch (error: any) {
      setActorRunError(error.message || 'An unexpected error occurred during actor execution.');
      console.error(`Unexpected error running actor ${actorToRun.name}:`, error);
      toast.error(`An unexpected error occurred with ${actorToRun.name}.`, {
        description: error.message || 'Check console for details.',
      });
    } finally {
      setIsRunningActor(false);
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
            {(isRunningActor || actorRunResult || actorRunError) && (
              <Card className="shadow-lg mt-6 lg:mt-8">
                <CardHeader>
                  <CardTitle>Actor Run Status</CardTitle>
                </CardHeader>
                <CardContent>
                  {isRunningActor && (
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Actor is running... Please wait.</span>
                    </div>
                  )}
                  {actorRunError && !isRunningActor && (
                    <div>
                      <h3 className="text-red-600 font-semibold">Run Failed:</h3>
                      <pre className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded text-sm text-red-700 dark:text-red-400 overflow-auto">
                        {typeof actorRunError === 'string' ? actorRunError : JSON.stringify(actorRunError, null, 2)}
                      </pre>
                    </div>
                  )}
                  {actorRunResult && !isRunningActor && (
                    <div>
                      <h3 className="text-green-600 font-semibold">Run Successful:</h3>
                      {actorRunResult.runId && <p className="text-sm">Run ID: {actorRunResult.runId}</p>}
                      {actorRunResult.datasetId && <p className="text-sm">Dataset ID: {actorRunResult.datasetId}</p>}
                      <p className="text-sm mb-2">Fetched {actorRunResult.data?.length || 0} items.</p>
                      {actorRunResult.data && actorRunResult.data.length > 0 && (
                        <ScrollArea className="h-[300px] border rounded p-2 bg-gray-50 dark:bg-gray-800/50">
                          <pre className="text-xs">
                            {JSON.stringify(actorRunResult.data, null, 2)}
                          </pre>
                        </ScrollArea>
                      )}
                      {(!actorRunResult.data || actorRunResult.data.length === 0) && (
                        <p className="text-sm text-muted-foreground">No items returned in the dataset.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ApifyActorsPage;
