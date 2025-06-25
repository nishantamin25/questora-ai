
import { ApiKeyManager } from './ApiKeyManager';
import { PayloadValidator } from './PayloadValidator';

export class ImageAnalysisService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    if (!base64Image || !prompt) {
      throw new Error('Both image data and prompt are required');
    }

    // VALIDATE: Check prompt length
    const wordValidation = PayloadValidator.validateWordCount(prompt, 1000); // Lower limit for vision
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ IMAGE ANALYSIS - Prompt validated:', wordValidation.wordCount, 'words');
    
    try {
      // PREPARE: Create properly structured vision messages
      const messages = [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: prompt
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ]
        }
      ];

      const maxTokens = 1500;
      const model = 'gpt-4o';

      // VALIDATE: Ensure payload is properly structured for vision
      const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
      
      if (!payloadValidation.isValid) {
        console.error('❌ IMAGE ANALYSIS - Payload validation failed:', payloadValidation.error);
        throw new Error(payloadValidation.error!);
      }

      if (payloadValidation.error) {
        console.warn('⚠️ IMAGE ANALYSIS - Payload warning:', payloadValidation.error);
      }

      const requestBody = {
        model,
        messages: payloadValidation.messages,
        max_tokens: maxTokens,
        temperature: 0.7
      };

      console.log('🔍 IMAGE ANALYSIS - Final payload validation:', {
        model: requestBody.model,
        messagesCount: requestBody.messages.length,
        maxTokens: requestBody.max_tokens,
        hasVisionContent: requestBody.messages.some(m => Array.isArray(m.content))
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
        throw new Error('No analysis result from OpenAI API');
      }
      
      return content;
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
