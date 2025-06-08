
import { getDocumentsForPrompts } from '@/utils/local-cache';

// Function to analyze text with OpenRouter API
export async function analyzeWithOpenRouter(content: string, userPrompt: string, options: { model?: string } = {}) {
  try {
    // Get API key from localStorage
    const apiKey = localStorage.getItem('openRouterApiKey');
    
    if (!apiKey) {
      throw new Error("OpenRouter API key is not set. Please add it in Settings.");
    }
    
    const model = options.model || 'google/gemini-2.5-flash-preview';

    // Get cached documents marked for auto-inclusion
    const cachedDocsForPrompts = getDocumentsForPrompts();
    let cachedContent = '';
    
    if (cachedDocsForPrompts.length > 0) {
      cachedContent = '\n\n================ CACHED REFERENCE DOCUMENTS ================\n' +
        cachedDocsForPrompts.map(doc => 
          `--- ${doc.name} (${doc.type}) ---\n${doc.content}`
        ).join('\n\n') +
        '\n==============================================================\n';
    }

    // Prepare the prompt by combining user prompt, content, and cached documents
    const prompt = `${userPrompt.trim()}${cachedContent}\n\n================ SOURCE DOCUMENTS ================\n${content}\n==================================================`;
    
    // Call the OpenRouter API
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'You are a helpful assistant. Respond in GitHub‑flavored Markdown. Be as comprehensive and accurate as possible based on the provided documents. You MUST respond in Markdown format with proper headings such as #, ##, ### and proper bullet points.' },
          { role: 'user', content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenRouter API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0]?.message?.content) {
      throw new Error("Invalid response from OpenRouter API");
    }

    return data.choices[0].message.content;
  } catch (error) {
    console.error("Error calling OpenRouter API:", error);
    throw error;
  }
}
