
interface OpenRouterOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

/**
 * Call OpenRouter API to analyze content
 */
export async function analyzeWithOpenRouter(
  content: string, 
  prompt: string,
  options: OpenRouterOptions = {}
): Promise<string> {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY;
  
  if (!apiKey) {
    console.error('OpenRouter API key not found');
    return 'Error: OpenRouter API key not configured';
  }
  
  const {
    model = 'google/gemini-2.5-flash-preview',
    temperature = 0.2,
    maxTokens = 4000
  } = options;
  
  try {
    const payload = {
      model,
      temperature,
      max_tokens: maxTokens,
      messages: [
        { 
          role: 'system', 
          content: 'You are a helpful assistant. Respond in GitHub-flavored Markdown. Be as comprehensive and accurate as possible based on the provided documents.'
        },
        { 
          role: 'user',   
          content: `${prompt}\n\n================ SOURCE DOCUMENTS ================\n${content}\n==================================================`
        }
      ]
    };

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API request failed (Status ${response.status}): ${errorText}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || `OpenRouter API error: ${JSON.stringify(data.error)}`);
    }
    
    if (data.choices && data.choices.length > 0 && data.choices[0].message && data.choices[0].message.content) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('OpenRouter response malformed or no content found');
    }
  } catch (error) {
    console.error('Error calling OpenRouter API:', error);
    return `Error analyzing content: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}
