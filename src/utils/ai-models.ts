
// List of available AI models for OpenRouter API
export interface AIModel {
  id: string; 
  name: string;
  description: string;
}

export const AI_MODELS: AIModel[] = [
  {
    id: "google/gemini-2.5-flash-preview-05-20",
    name: "Gemini 2.5 Flash Preview 05-20",
    description: "Google's fastest Gemini model for quick analysis"
  },
  {
    id: "google/gemini-2.5-pro-preview",
    name: "Gemini 2.5 Pro Preview 06-05",
    description: "Google's high-performance model for detailed analysis"
  },
  {
    id: "anthropic/claude-sonnet-4",
    name: "Claude 4 Sonnet",
    description: "Anthropic's balanced model for quality and speed"
  },
  {
    id: "anthropic/claude-opus-4",
    name: "Claude 4 Opus",
    description: "Anthropic's most powerful model for in-depth analysis"
  },
  {
    id: "openai/gpt-4.1",
    name: "ChatGPT 4.1",
    description: "Meta's largest open model for comprehensive analysis"
  },
  {
    id: "deepseek/deepseek-r1-0528",
    name: "DeepSeek R1 Latest",
    description: "Mistral's powerful model for efficient analysis"
  },
  {
    id: "openai/o3",
    name: "ChatGPT o3",
    description: "OpenAI's advanced multimodal model"
  }
];

export const getDefaultAIModel = (): string => {
  return localStorage.getItem('preferred-ai-model') || "google/gemini-2.5-flash-preview";
};

export const savePreferredAIModel = (modelId: string): void => {
  localStorage.setItem('preferred-ai-model', modelId);
};
