
import { ApiKeyManager } from './ApiKeyManager';
import { ValidationService } from './ValidationService';

export class ApiCallService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly MAX_RETRIES = 2;
  private static readonly RETRY_DELAY = 1000;

  static async makeApiCall(payload: any, context: string = 'API Call'): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Final validation before sending
    const validation = ValidationService.validateCompletePayload(payload);
    if (!validation.isValid) {
      console.error(`❌ ${context} - Final validation failed:`, validation.errors);
      throw new Error(`Invalid payload: ${validation.errors.join(', ')}`);
    }

    if (validation.warnings.length > 0) {
      console.warn(`⚠️ ${context} - Payload warnings:`, validation.warnings);
    }

    console.log(`📤 ${context} - Sending request:`, {
      model: payload.model,
      messagesCount: payload.messages?.length || 0,
      maxTokens: payload.max_tokens,
      temperature: payload.temperature,
      hasResponseFormat: !!payload.response_format
    });

    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= this.MAX_RETRIES; attempt++) {
      try {
        const response = await fetch(this.OPENAI_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          let errorData;
          
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { error: { message: errorText } };
          }

          const errorMessage = errorData.error?.message || errorText || 'Unknown error';
          
          console.error(`❌ ${context} - API Error (Attempt ${attempt}):`, {
            status: response.status,
            statusText: response.statusText,
            error: errorMessage,
            payload: {
              model: payload.model,
              messagesCount: payload.messages?.length,
              maxTokens: payload.max_tokens
            }
          });

          const error = new Error(`OpenAI API request failed: ${response.status} - ${response.statusText}. ${errorMessage}`);
          lastError = error;

          // Don't retry on certain error types
          if (response.status === 401 || response.status === 403 || response.status === 429) {
            throw error;
          }

          // For 400 errors, log the full payload for debugging
          if (response.status === 400) {
            console.error(`❌ ${context} - Full payload that caused 400 error:`, JSON.stringify(payload, null, 2));
            throw error;
          }

          if (attempt < this.MAX_RETRIES) {
            console.log(`🔄 ${context} - Retrying in ${this.RETRY_DELAY}ms...`);
            await this.delay(this.RETRY_DELAY);
            continue;
          }

          throw error;
        }

        const data = await response.json();
        
        if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Invalid response format from OpenAI API');
        }

        const content = data.choices[0].message.content;
        
        if (!content) {
          throw new Error('No content in OpenAI API response');
        }

        console.log(`✅ ${context} - Success:`, {
          responseLength: content.length,
          finishReason: data.choices[0].finish_reason,
          usage: data.usage
        });
        
        return content;

      } catch (error) {
        lastError = error as Error;
        console.error(`❌ ${context} - Attempt ${attempt} failed:`, error);
        
        if (attempt < this.MAX_RETRIES && this.isRetryableError(error as Error)) {
          console.log(`🔄 ${context} - Retrying in ${this.RETRY_DELAY}ms...`);
          await this.delay(this.RETRY_DELAY);
          continue;
        }
        
        break;
      }
    }

    throw new Error(`${context} failed after ${this.MAX_RETRIES} attempts: ${lastError?.message || 'Unknown error'}`);
  }

  private static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('connection') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('504');
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
