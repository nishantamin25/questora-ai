
import { ApiKeyManager } from './ApiKeyManager';
import { ContentValidator } from './ContentValidator';

export class ContentEnhancementService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async enhanceTextContent(textContent: string, userPrompt: string = ''): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    try {
      const organizationPrompt = userPrompt 
        ? `USER REQUEST: "${userPrompt}"

DOCUMENT CONTENT:
${textContent}

STRICT INSTRUCTIONS:
- Organize the document content according to the user's request
- Use ONLY information present in the source text
- Do NOT add educational frameworks, methodologies, or concepts not in the source
- Do NOT add terms like "assessment preparation", "learning structure", "educational goals" unless present in source
- Simply reorganize and clarify existing content while honoring user intent

Organize the content now:`
        : `Clean and organize this text content for educational use. Preserve ALL original information. Do NOT add frameworks, methodologies, or educational concepts not present in the source:

${textContent}`;

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
              content: 'You organize content while preserving source integrity. You NEVER add information, frameworks, or educational terminology not present in the source. You follow user structural requests while staying within source boundaries.'
            },
            {
              role: 'user',
              content: organizationPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const enhancedContent = data.choices[0]?.message?.content || textContent;
      
      if (ContentValidator.validateContentIntegrity(textContent, enhancedContent)) {
        return enhancedContent;
      } else {
        console.warn('Enhanced content failed integrity check, returning original');
        return textContent;
      }
    } catch (error) {
      console.error('Error enhancing text content:', error);
      return textContent;
    }
  }
}
