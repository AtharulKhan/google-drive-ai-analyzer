
import { useState, useCallback, useEffect } from 'react';

export interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  createdAt: number;
}

export interface ProcessingStatus {
  isProcessing: boolean;
  currentStep: string;
  progress: number;
  totalFiles: number;
  processedFiles: number;
}

const SAVED_PROMPTS_KEY = "drive-analyzer-saved-prompts";

export default function usePromptState() {
  // Prompts and analysis state
  const [userPrompt, setUserPrompt] = useState("Summarize this content in detail, highlighting key points and insights.");
  const [aiOutput, setAiOutput] = useState("");
  const [savedPrompts, setSavedPrompts] = useState<SavedPrompt[]>([]);
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus>({
    isProcessing: false,
    currentStep: "",
    progress: 0,
    totalFiles: 0,
    processedFiles: 0,
  });
  const [activeTab, setActiveTab] = useState("files");
  
  // Load saved data from localStorage
  useEffect(() => {
    const loadedPrompts = localStorage.getItem(SAVED_PROMPTS_KEY);
    if (loadedPrompts) {
      setSavedPrompts(JSON.parse(loadedPrompts));
    }
  }, []);

  return {
    userPrompt,
    setUserPrompt,
    aiOutput,
    setAiOutput,
    savedPrompts,
    setSavedPrompts,
    processingStatus,
    setProcessingStatus,
    activeTab,
    setActiveTab,
  };
}
