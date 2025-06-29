
import { useState, useCallback, useEffect } from 'react';
import { toast } from 'sonner';

const WEBHOOK_URL_KEY = "drive-analyzer-webhook-url";

export default function useTextInputState() {
  // Text/URL inputs state
  const [pastedText, setPastedText] = useState<string>("");
  const [currentUrlInput, setCurrentUrlInput] = useState<string>("");
  const [urls, setUrls] = useState<string[]>([]);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  
  // Load webhook URL from localStorage
  useEffect(() => {
    const loadedWebhookUrl = localStorage.getItem(WEBHOOK_URL_KEY);
    if (loadedWebhookUrl) {
      setWebhookUrl(loadedWebhookUrl);
    }
  }, []);

  // Save webhookUrl to localStorage when it changes
  useEffect(() => {
    if (webhookUrl) {
      localStorage.setItem(WEBHOOK_URL_KEY, webhookUrl);
    } else {
      localStorage.removeItem(WEBHOOK_URL_KEY); // Clear if empty
    }
  }, [webhookUrl]);
  
  // Handle URL operations
  const handleAddUrl = useCallback((url: string) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      setUrls(prev => [...prev, url]);
    } else {
      toast.error("Please enter a valid URL (starting with http:// or https://)");
    }
  }, []);
  
  const handleRemoveUrl = useCallback((index: number) => {
    setUrls(prev => prev.filter((_, i) => i !== index));
  }, []);
  
  const handleClearUrls = useCallback(() => {
    setUrls([]);
  }, []);

  // Handle webhook URL change
  const handleWebhookUrlChange = useCallback((url: string) => {
    setWebhookUrl(url);
  }, []);
  
  // Handle text operations
  const handlePastedTextChange = useCallback((text: string) => {
    setPastedText(text);
  }, []);
  
  const handleClearPastedText = useCallback(() => {
    setPastedText("");
  }, []);

  return {
    pastedText,
    setPastedText,
    handlePastedTextChange,
    handleClearPastedText,
    currentUrlInput,
    setCurrentUrlInput,
    urls,
    setUrls,
    handleAddUrl,
    handleRemoveUrl,
    handleClearUrls,
    webhookUrl,
    handleWebhookUrlChange,
  };
}
