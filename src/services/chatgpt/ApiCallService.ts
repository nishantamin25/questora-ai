
import { ApiKeyManager } from './ApiKeyManager';
import { ValidationService } from './ValidationService';
import { ErrorHandler } from './ErrorHandler';
import { RecoveryService } from './RecoveryService';

export class ApiCallService {
  private static readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 1000;
  private static readonly REQUEST_TIMEOUT = 60000; // 60 seconds

  static async makeApiCall(payload: any, context: string = 'API Call'): Promise<string> {
    return RecoveryService.executeWithRecovery(
      () => this.performApiCall(payload, context),
      context
    );
  }

  private static async performApiCall(payload: any, context: string): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Validate API key format
    if (!apiKey.startsWith('sk-') || apiKey.length < 40) {
      throw new Error('Invalid OpenAI API key format');
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
      hasResponseFormat: !!payload.response_format,
      timestamp: new Date().toISOString()
    });

    // Save request for recovery
    RecoveryService.saveRecoveryData(`last_request_${context}`, {
      payload: { ...payload, timestamp: Date.now() },
      context
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.REQUEST_TIMEOUT);

    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { error: { message: errorText } };
        }

        const errorMessage = errorData.error?.message || errorText || 'Unknown error';
        
        console.error(`❌ ${context} - API Error:`, {
          status: response.status,
          statusText: response.statusText,
          error: errorMessage,
          headers: Object.fromEntries(response.headers.entries()),
          payload: {
            model: payload.model,
            messagesCount: payload.messages?.length,
            maxTokens: payload.max_tokens
          }
        });

        // Enhanced error message based on status
        let enhancedMessage = `OpenAI API request failed: ${response.status} - ${response.statusText}`;
        
        switch (response.status) {
          case 400:
            enhancedMessage += `. Invalid request: ${errorMessage}`;
            break;
          case 401:
            enhancedMessage += '. Please check your API key in settings.';
            break;
          case 403:
            enhancedMessage += '. Access forbidden. Check your API key permissions.';
            break;
          case 429:
            enhancedMessage += '. Rate limit exceeded. Please wait and try again.';
            break;
          case 500:
          case 502:
          case 503:
          case 504:
            enhancedMessage += '. OpenAI server error. Please try again later.';
            break;
          default:
            enhancedMessage += `. ${errorMessage}`;
        }

        const error = new Error(enhancedMessage);
        throw error;
      }

      const data = await response.json();
      
      // Validate response structure
      if (!data) {
        throw new Error('Empty response from OpenAI API');
      }
      
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        throw new Error('Invalid response format: no choices array');
      }
      
      if (!data.choices[0] || !data.choices[0].message) {
        throw new Error('Invalid response format: no message in first choice');
      }

      const content = data.choices[0].message.content;
      
      if (!content && content !== '') {
        throw new Error('No content in OpenAI API response');
      }

      // Log successful response
      console.log(`✅ ${context} - Success:`, {
        responseLength: content.length,
        finishReason: data.choices[0].finish_reason,
        usage: data.usage,
        model: data.model,
        timestamp: new Date().toISOString()
      });

      // Clear recovery data on success
      RecoveryService.clearRecoveryItem(`last_request_${context}`);
      
      return content;

    } catch (error: any) {
      clearTimeout(timeoutId);
      
      // Handle specific error types
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${this.REQUEST_TIMEOUT / 1000} seconds`);
      }
      
      if (error.message?.includes('fetch')) {
        throw new Error('Network error: Please check your internet connection');
      }
      
      console.error(`❌ ${context} - Request failed:`, {
        error: error.message,
        stack: error.stack?.split('\n').slice(0, 3).join('\n'),
        timestamp: new Date().toISOString()
      });
      
      throw error;
    }
  }

  private static isRetryableError(error: Error): boolean {
    const message = error.message.toLowerCase();
    return message.includes('network') || 
           message.includes('timeout') || 
           message.includes('connection') ||
           message.includes('502') ||
           message.includes('503') ||
           message.includes('504') ||
           message.includes('rate limit');
  }

  // Health check method
  static async performHealthCheck(): Promise<{ isHealthy: boolean; latency?: number; error?: string }> {
    const startTime = Date.now();
    
    try {
      const testPayload = {
        model: 'gpt-4.1-2025-04-14',
        messages: [{ role: 'user', content: 'Test connection' }],
        max_tokens: 5
      };
      
      await this.performApiCall(testPayload, 'HEALTH_CHECK');
      const latency = Date.now() - startTime;
      
      return { isHealthy: true, latency };
    } catch (error: any) {
      return { 
        isHealthy: false, 
        error: error.message,
        latency: Date.now() - startTime
      };
    }
  }
}
