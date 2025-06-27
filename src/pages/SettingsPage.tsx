
import React, { useState, useEffect } from 'react';
import PageLayout from "@/components/layout/PageLayout";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertCircle, Eye, EyeOff, Maximize2, Key, Shield, Database, MessageSquare } from "lucide-react";
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-gray-900 dark:via-gray-800/50 dark:to-gray-900 p-4 md:p-8">
        <div className="max-w-6xl mx-auto space-y-8">
          {/* Header Section */}
          <div className="text-center space-y-4 mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-4">
              <Shield className="h-8 w-8" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-300 bg-clip-text text-transparent">
              Settings & Configuration
            </h1>
            <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
              Configure your API keys, manage cached documents, and customize your AI analysis experience
            </p>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Custom Instructions Card */}
            <div className="lg:col-span-2">
              <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
                <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-gradient-to-r from-green-500 to-emerald-600 rounded-lg">
                      <MessageSquare className="h-5 w-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-xl">Custom Instructions</CardTitle>
                      <CardDescription>
                        Set default instructions that will be included with every AI analysis prompt
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-6 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="customInstructions" className="text-sm font-medium">
                        Custom Instructions (Auto-saved)
                      </Label>
                      <Dialog open={isCustomInstructionsDialogOpen} onOpenChange={setIsCustomInstructionsDialogOpen}>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm" className="hover:scale-105 transition-transform">
                            <Maximize2 className="h-4 w-4 mr-2" />
                            Expand Editor
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
                              className="resize-none h-[60vh] text-sm"
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
                      className="resize-none bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      These instructions will be automatically prepended to every AI analysis prompt.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Google API Configuration */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-red-500 to-orange-600 rounded-lg">
                    <Key className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Google API Configuration</CardTitle>
                    <CardDescription>
                      Configure your Google API credentials for Drive AI Analyzer
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                <div className="bg-amber-50/80 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                        Setup Required: Google Cloud Project
                      </p>
                      <ol className="list-decimal list-inside text-xs text-amber-700 dark:text-amber-500 space-y-1.5 ml-2">
                        <li>Go to the <a href="https://console.cloud.google.com/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">Google Cloud Console</a></li>
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
                
                <div className="space-y-3">
                  <Label htmlFor="clientId" className="text-sm font-medium">Google OAuth Client ID</Label>
                  <Input
                    id="clientId"
                    placeholder="Enter your Google OAuth Client ID"
                    value={clientIdInput}
                    onChange={(e) => setClientIdInput(e.target.value)}
                    className="bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Example: 123456789012-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="border-t border-gray-200/50 dark:border-gray-700/50 p-6">
                <Button 
                  onClick={handleSaveClientId} 
                  disabled={!clientIdInput.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 hover:scale-105 transition-all duration-200"
                >
                  Save Client ID
                </Button>
              </CardFooter>
            </Card>

            {/* OpenRouter API Configuration */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-purple-500 to-pink-600 rounded-lg">
                    <Shield className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">OpenRouter API Configuration</CardTitle>
                    <CardDescription>
                      Configure your OpenRouter API key for AI analysis
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                <div className="bg-amber-50/80 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                        API Key Required for AI Analysis
                      </p>
                      <ol className="list-decimal list-inside text-xs text-amber-700 dark:text-amber-500 space-y-1.5 ml-2">
                        <li>Visit <a href="https://openrouter.ai/" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">OpenRouter</a></li>
                        <li>Create an account and generate an API key</li>
                        <li>Copy the API key and paste it below</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="openrouterKey" className="text-sm font-medium">
                      OpenRouter API Key
                    </Label>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-8 px-3 text-xs hover:scale-105 transition-transform"
                      onClick={() => setShowOpenRouterKey(!showOpenRouterKey)}
                    >
                      {showOpenRouterKey ? <EyeOff size={14} /> : <Eye size={14} />}
                      <span className="ml-1">{showOpenRouterKey ? 'Hide' : 'Show'}</span>
                    </Button>
                  </div>
                  <Input
                    id="openrouterKey"
                    type={showOpenRouterKey ? "text" : "password"}
                    placeholder="Enter your OpenRouter API Key"
                    value={openRouterKey}
                    onChange={(e) => setOpenRouterKey(e.target.value)}
                    className="font-mono text-sm bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-purple-500"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Example: 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
                  </p>
                </div>
              </CardContent>
              
              <CardFooter className="border-t border-gray-200/50 dark:border-gray-700/50 p-6">
                <Button 
                  onClick={handleSaveApiKey} 
                  disabled={!openRouterKey.trim()}
                  className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 hover:scale-105 transition-all duration-200"
                >
                  Save API Key
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Full Width Cards */}
          <div className="space-y-8">
            {/* Apify API Configuration */}
            <Card className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 border-0 shadow-xl hover:shadow-2xl transition-all duration-300">
              <CardHeader className="border-b border-gray-200/50 dark:border-gray-700/50">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-gradient-to-r from-indigo-500 to-blue-600 rounded-lg">
                    <Database className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-xl">Apify API Configuration</CardTitle>
                    <CardDescription>
                      Configure your Apify API Token for web scraping capabilities
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6 p-6">
                <div className="bg-amber-50/80 dark:bg-amber-950/30 p-4 rounded-xl border border-amber-200/50 dark:border-amber-800/50">
                  <div className="flex gap-3 items-start">
                    <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 mt-0.5 flex-shrink-0" />
                    <div className="space-y-3">
                      <p className="text-sm text-amber-800 dark:text-amber-400 font-medium">
                        Web Scraping API Token Required
                      </p>
                      <ol className="list-decimal list-inside text-xs text-amber-700 dark:text-amber-500 space-y-1.5 ml-2">
                        <li>Go to your <a href="https://console.apify.com/account/integrations" target="_blank" rel="noopener noreferrer" className="underline hover:text-amber-600">Apify Account Integrations</a> page</li>
                        <li>Copy your personal API token</li>
                        <li>Paste it below and save</li>
                      </ol>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-3">
                    <div className="flex justify-between items-center">
                      <Label htmlFor="apifyToken" className="text-sm font-medium">
                        Apify API Token
                      </Label>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="h-8 px-3 text-xs hover:scale-105 transition-transform"
                        onClick={() => setShowApifyToken(!showApifyToken)}
                      >
                        {showApifyToken ? <EyeOff size={14}/> : <Eye size={14}/>}
                        <span className="ml-1">{showApifyToken ? 'Hide' : 'Show'}</span>
                      </Button>
                    </div>
                    <Input
                      id="apifyToken"
                      type={showApifyToken ? "text" : "password"}
                      placeholder="Enter your Apify API Token"
                      value={apifyToken}
                      onChange={(e) => setApifyToken(e.target.value)}
                      className="font-mono text-sm bg-gray-50/50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-indigo-500"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Example: apify_api_xxxxxxxxxxxxxxxxxxxxxxxxxxxx
                    </p>
                  </div>
                  <div className="flex items-end">
                    <Button 
                      onClick={handleSaveApifyToken} 
                      disabled={!apifyToken.trim()}
                      className="w-full h-10 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 hover:scale-105 transition-all duration-200"
                    >
                      Save Token
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Cached Documents Section */}
            <div className="backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 rounded-2xl border-0 shadow-xl p-6">
              <CachedDocumentsManager />
            </div>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
