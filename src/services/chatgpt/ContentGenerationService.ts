
import { ApiKeyManager } from './ApiKeyManager';

export class ContentGenerationService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    try {
      const strictPrompt = fileContent 
        ? `USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

STRICT GENERATION RULES:
- Respond to the user's request using ONLY the document content provided
- Do NOT add educational terminology, frameworks, or concepts not in the document
- Do NOT fabricate "learning objectives", "assessment preparation", "educational structure" unless in source
- Honor the user's intent while staying strictly within document boundaries
- Generate content based on actual file information only

Generate response now:`
        : `USER REQUEST: "${prompt}"

Generate focused content based strictly on this request. Do not add generic educational frameworks or methodologies unless specifically requested.`;

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You generate content that respects user intent and source material boundaries. When provided with source content, you use ONLY that content. You never fabricate educational frameworks, methodologies, or terminology not present in the source or explicitly requested by the user.'
            },
            {
              role: 'user',
              content: strictPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Unable to generate content.';
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content with ChatGPT');
    }
  }
}
