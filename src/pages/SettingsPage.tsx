import React, { useState, useEffect } from 'react';
import PageLayout from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Eye, EyeOff, Maximize2 } from "lucide-react";
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { toast } from 'sonner';
import { CachedDocumentsManager } from "@/components/drive-analyzer/CachedDocumentsManager";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const { clientId, setClientId } = useGoogleAuth();
  const [clientIdInput, setClientIdInput] = useState(clientId || '');
  
  // State for OpenRouter API key
  const [openRouterKey, setOpenRouterKey] = useState('');
  const [showOpenRouterKey, setShowOpenRouterKey] = useState(false);
  
  // State for Apify API key
  const [apifyToken, setApifyToken] = useState('');
  const [showApifyToken, setShowApifyToken] = useState(false);
  
  // State for Custom Instructions
  const [customInstructions, setCustomInstructions] = useState('');
  const [isCustomInstructionsDialogOpen, setIsCustomInstructionsDialogOpen] = useState(false);
  
  // Load API keys and custom instructions from localStorage on component mount
  useEffect(() => {
    const savedOpenRouterKey = localStorage.getItem('openRouterApiKey') || '';
    const savedApifyToken = localStorage.getItem('apifyApiToken') || '';
    const savedCustomInstructions = localStorage.getItem('drive-analyzer-custom-instructions') || '';
    
    if (savedOpenRouterKey) {
      setOpenRouterKey(savedOpenRouterKey);
    }
    
    if (savedApifyToken) {
      setApifyToken(savedApifyToken);
    }
    
    setCustomInstructions(savedCustomInstructions);
  }, []);
  
  // Save custom instructions to localStorage when changed
  useEffect(() => {
    localStorage.setItem('drive-analyzer-custom-instructions', customInstructions);
  }, [customInstructions]);
  
  const handleSaveClientId = () => {
    if (clientIdInput.trim()) {
      setClientId(clientIdInput.trim());
    }
  };
  
  const handleSaveApiKey = () => {
    if (openRouterKey.trim()) {
      localStorage.setItem('openRouterApiKey', openRouterKey.trim());
      toast.success("OpenRouter API Key saved successfully");
    }
  };
  
  const handleSaveApifyToken = () => {
    if (apifyToken.trim()) {
      localStorage.setItem('apifyApiToken', apifyToken.trim());
      toast.success("Apify API Token saved successfully");
    }
  };
  
  return (
    <PageLayout>
      <div className="container mx-auto p-4 max-w-4xl">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        
        {/* Cached Documents Section */}
        <div className="mb-6">
          <CachedDocumentsManager />
        </div>
        
        {/* Custom Instructions Card */}
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle>Custom Instructions</CardTitle>
            <CardDescription>
              Set default instructions that will be included with every AI analysis prompt
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="customInstructions">Custom Instructions (Saved Automatically)</Label>
                <Dialog open={isCustomInstructionsDialogOpen} onOpenChange={setIsCustomInstructionsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm">
                      <Maximize2 className="h-4 w-4 mr-2" />
                      Expand
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl h-[80vh]">
                    <DialogHeader>
                      <DialogTitle>Custom Instructions - Full Screen Editor</DialogTitle>
                    </DialogHeader>
                    <div className="flex-1 space-y-4">
                      <Textarea
                        value={customInstructions}
                        onChange={(e) => setCustomInstructions(e.target.value)}
                        placeholder="Add custom instructions that will be included with every prompt. These will be saved automatically for future sessions."
                        className="resize-none h-[60vh]"
                      />
                      <p className="text-sm text-muted-foreground">
                        These instructions will be automatically prepended to every AI analysis prompt. Changes are saved automatically.
                      </p>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <Textarea
                id="customInstructions"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="Add custom instructions that will be included with every prompt. These will be saved for future sessions."
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                These instructions will be automatically prepended to every AI analysis prompt.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle>Google API Configuration</CardTitle>
            <CardDescription>
              Configure your Google API credentials for Drive AI Analyzer
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800 mb-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    To use the Google Drive AI Analyzer, you need to create a Google Cloud project and set up OAuth credentials.
                  </p>
                  <ol className="list-decimal list-inside text-xs text-amber-700 dark:text-amber-500 mt-2 space-y-1">
                    <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline">Google Cloud Console</a></li>
                    <li>Create a new project or select an existing one</li>
                    <li>Enable the Google Drive API, Docs API, Sheets API, and Slides API</li>
                    <li>Configure the OAuth consent screen</li>
                    <li>Create OAuth 2.0 credentials for a Web Application</li>
                    <li>Add your domain to the authorized JavaScript origins</li>
                    <li>Copy the Client ID and paste it below</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="clientId">Google OAuth Client ID</Label>
              <Input
                id="clientId"
                placeholder="Enter your Google OAuth Client ID"
                value={clientIdInput}
                onChange={(e) => setClientIdInput(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Example: 123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
              </p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button onClick={handleSaveClientId} disabled={!clientIdInput.trim()}>
              Save Client ID
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="shadow-md mb-6">
          <CardHeader>
            <CardTitle>OpenRouter API Configuration</CardTitle>
            <CardDescription>
              Configure your OpenRouter API key for AI analysis
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800 mb-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    To use the AI analysis features, you need an OpenRouter API key.
                  </p>
                  <ol className="list-decimal list-inside text-xs text-amber-700 dark:text-amber-500 mt-2 space-y-1">
                    <li>Visit <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="underline">OpenRouter</a></li>
                    <li>Create an account and generate an API key</li>
                    <li>Copy the API key and paste it below</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="openrouterKey" className="flex justify-between">
                <span>OpenRouter API Key</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-2 text-xs"
                  onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                >
                  {showOpenRouterKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  <span className="ml-1">{showOpenRouterKey ? 'Hide' : 'Show'}</span>
                </Button>
              </Label>
              <Input
                id="openrouterKey"
                type={showOpenRouterKey ? "text" : "password"}
                placeholder="Enter your OpenRouter API Key"
                value={openRouterKey}
                onChange={(e) => setOpenRouterKey(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Example: 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
              </p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button onClick={handleSaveApiKey} disabled={!openRouterKey.trim()}>
              Save API Key
            </Button>
          </CardFooter>
        </Card>
        
        <Card className="shadow-md">
          <CardHeader>
            <CardTitle>Apify API Configuration</CardTitle>
            <CardDescription>
              Configure your Apify API Token for web scraping capabilities.
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4">
            <div className="bg-amber-50 dark:bg-amber-950/30 p-3 rounded-md border border-amber-200 dark:border-amber-800 mb-4">
              <div className="flex gap-2 items-start">
                <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-400">
                    An Apify API Token is required to use advanced web scraping features.
                  </p>
                  <ol className="list-decimal list-inside text-xs text-amber-700 dark:text-amber-500 mt-2 space-y-1">
                    <li>Go to your <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="underline">Apify Account Integrations</a> page.</li>
                    <li>Copy your personal API token.</li>
                    <li>Paste it below and save.</li>
                  </ol>
                </div>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="apifyToken" className="flex justify-between items-center">
                <span>Apify API Token</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-5 px-2 text-xs"
                  onClick={() => setShowApifyToken(!showApifyToken)}
                >
                  {showApifyToken ? <EyeOff size={14}/> : <Eye size={14}/>}
                  <span className="ml-1">{showApifyToken ? 'Hide' : 'Show'}</span>
                </Button>
              </Label>
              <Input
                id="apifyToken"
                type={showApifyToken ? "text" : "password"}
                placeholder="Enter your Apify API Token"
                value={apifyToken}
                onChange={(e) => setApifyToken(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Example: apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
              </p>
            </div>
          </CardContent>
          
          <CardFooter>
            <Button onClick={handleSaveApifyToken} disabled={!apifyToken.trim()}>
              Save Apify Token
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageLayout>
  );
}
