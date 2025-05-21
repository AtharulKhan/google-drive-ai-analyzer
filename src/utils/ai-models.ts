
// List of available AI models for OpenRouter API
export interface AIModel {
  id: string; 
  name: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "google/gemini-2.5-flash-preview",
    name: "Gemini Flash Preview",
    description: "Google's fastest Gemini model for quick analysis"
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Gemini Pro Preview",
    description: "Google's high-performance model for detailed analysis"
  },
  {
    id: "anthropic/claude-3-5-sonnet",
    name: "Claude 3.5 Sonnet",
    description: "Anthropic's balanced model for quality and speed"
  },
  {
    id: "anthropic/claude-3-opus",
    name: "Claude 3 Opus",
    description: "Anthropic's most powerful model for in-depth analysis"
  },
  {
    id: "meta-llama/llama-3-405b-instruct",
    name: "Llama 3 405B",
    description: "Meta's largest open model for comprehensive analysis"
  },
  {
    id: "mistralai/mistral-large-latest",
    name: "Mistral Large",
    description: "Mistral's powerful model for efficient analysis"
  },
  {
    id: "openai/gpt-4o",
    name: "GPT-4o",
    description: "OpenAI's advanced multimodal model"
  }
];

export const getDefaultAIModel = (): string => {
  return localStorage.getItem('preferred-ai-model') || "google/gemini-2.5-flash-preview";
};

export const savePreferredAIModel = (modelId: string): void => {
  localStorage.setItem('preferred-ai-model', modelId);
};
