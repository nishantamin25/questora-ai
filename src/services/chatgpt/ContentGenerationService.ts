
import { ApiKeyManager } from './ApiKeyManager';
import { PayloadValidator } from './PayloadValidator';

export class ContentGenerationService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // MERGE: Combine prompt and file content properly
    const mergedContent = PayloadValidator.mergePromptAndFileContent(prompt, fileContent);
    
    // VALIDATE: Check word count before processing
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 2000);
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ CONTENT GENERATION - Word count validated:', wordValidation.wordCount, 'words');
    
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

      // PREPARE: Create properly structured messages
      const messages = [
        {
          role: 'system',
          content: 'You generate content that respects user intent and source material boundaries. When provided with source content, you use ONLY that content. You never fabricate educational frameworks, methodologies, or terminology not present in the source or explicitly requested by the user.'
        },
        {
          role: 'user',
          content: strictPrompt
        }
      ];

      const maxTokens = 2000;
      const model = 'gpt-4.1-2025-04-14';

      // VALIDATE: Ensure payload is properly structured
      const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
      
      if (!payloadValidation.isValid) {
        console.error('❌ CONTENT GENERATION - Payload validation failed:', payloadValidation.error);
        throw new Error(payloadValidation.error!);
      }

      if (payloadValidation.error) {
        console.warn('⚠️ CONTENT GENERATION - Payload warning:', payloadValidation.error);
      }

      const requestBody = {
        model,
        messages: payloadValidation.messages,
        max_tokens: maxTokens,
        temperature: 0.2
      };

      console.log('🔍 CONTENT GENERATION - Final payload validation:', {
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        maxTokens: requestBody.max_tokens,
        allMessagesValid: requestBody.messages.every(m => m.content && m.content.length > 0)
      });

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        throw new Error(`OpenAI API request failed: ${response.status} - ${response.statusText}. ${errorData}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content generated from OpenAI API');
      }
      
      return content;
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
