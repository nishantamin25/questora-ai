
export class ValidationService {
  // Comprehensive validation for all OpenAI API calls
  static validateCompletePayload(payload: any): { isValid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Basic payload structure validation
    if (!payload) {
      errors.push('Payload is null or undefined');
      return { isValid: false, errors, warnings };
    }

    // Model validation
    if (!payload.model || typeof payload.model !== 'string') {
      errors.push('Model is required and must be a string');
    } else if (!['gpt-4.1-2025-04-14', 'gpt-4o', 'gpt-3.5-turbo'].includes(payload.model)) {
      warnings.push(`Unusual model: ${payload.model}`);
    }

    // Messages validation
    if (!payload.messages || !Array.isArray(payload.messages)) {
      errors.push('Messages array is required');
    } else {
      if (payload.messages.length === 0) {
        errors.push('Messages array cannot be empty');
      }

      payload.messages.forEach((message: any, index: number) => {
        if (!message) {
          errors.push(`Message at index ${index} is null/undefined`);
          return;
        }

        if (!message.role || typeof message.role !== 'string') {
          errors.push(`Message at index ${index} missing or invalid role`);
        } else if (!['system', 'user', 'assistant'].includes(message.role)) {
          errors.push(`Message at index ${index} has invalid role: ${message.role}`);
        }

        if (!message.content) {
          errors.push(`Message at index ${index} missing content`);
        } else if (typeof message.content === 'string') {
          if (message.content.trim().length === 0) {
            errors.push(`Message at index ${index} has empty content`);
          }
          if (message.content.length > 50000) {
            warnings.push(`Message at index ${index} has very long content (${message.content.length} chars)`);
          }
        } else if (Array.isArray(message.content)) {
          // Vision message validation
          message.content.forEach((item: any, itemIndex: number) => {
            if (!item || !item.type) {
              errors.push(`Message ${index}, content item ${itemIndex} missing type`);
            } else if (!['text', 'image_url'].includes(item.type)) {
              errors.push(`Message ${index}, content item ${itemIndex} has invalid type: ${item.type}`);
            }

            if (item.type === 'text' && (!item.text || typeof item.text !== 'string')) {
              errors.push(`Message ${index}, content item ${itemIndex} text type missing text field`);
            }

            if (item.type === 'image_url') {
              if (!item.image_url || !item.image_url.url) {
                errors.push(`Message ${index}, content item ${itemIndex} image_url type missing url`);
              } else if (!item.image_url.url.startsWith('data:image/')) {
                errors.push(`Message ${index}, content item ${itemIndex} image_url must be base64 data URL`);
              }
            }
          });
        } else {
          errors.push(`Message at index ${index} content must be string or array`);
        }
      });
    }

    // Token limits validation
    if (payload.max_tokens !== undefined) {
      if (typeof payload.max_tokens !== 'number' || payload.max_tokens < 1) {
        errors.push('max_tokens must be a positive number');
      } else if (payload.max_tokens > 4000) {
        warnings.push(`max_tokens is very high: ${payload.max_tokens}`);
      }
    }

    // Temperature validation
    if (payload.temperature !== undefined) {
      if (typeof payload.temperature !== 'number' || payload.temperature < 0 || payload.temperature > 2) {
        errors.push('temperature must be a number between 0 and 2');
      }
    }

    // Response format validation
    if (payload.response_format) {
      if (!payload.response_format.type || payload.response_format.type !== 'json_object') {
        errors.push('response_format.type must be "json_object" if specified');
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  // Estimate token count more accurately
  static estimateTokensAccurate(content: string): number {
    if (!content) return 0;
    
    // More accurate token estimation
    const words = content.split(/\s+/).length;
    const characters = content.length;
    
    // Average estimation: 1 token ≈ 4 characters or 0.75 words
    const charBasedTokens = characters / 4;
    const wordBasedTokens = words / 0.75;
    
    // Use the higher estimate for safety
    return Math.ceil(Math.max(charBasedTokens, wordBasedTokens));
  }

  // Check if content will fit within model limits
  static validateTokenLimits(messages: any[], model: string, maxTokens: number): { isValid: boolean; estimatedTokens: number; modelLimit: number; error?: string } {
    const modelLimits = {
      'gpt-4.1-2025-04-14': 120000,
      'gpt-4o': 120000,
      'gpt-3.5-turbo': 15000
    };

    const modelLimit = modelLimits[model as keyof typeof modelLimits] || 15000;
    
    let totalTokens = 0;
    for (const message of messages) {
      if (typeof message.content === 'string') {
        totalTokens += this.estimateTokensAccurate(message.content);
      } else if (Array.isArray(message.content)) {
        for (const item of message.content) {
          if (item.type === 'text' && item.text) {
            totalTokens += this.estimateTokensAccurate(item.text);
          } else if (item.type === 'image_url') {
            totalTokens += 1000; // Conservative image token estimate
          }
        }
      }
      totalTokens += 10; // Message overhead
    }

    const totalWithResponse = totalTokens + maxTokens;
    
    return {
      isValid: totalWithResponse <= modelLimit,
      estimatedTokens: totalTokens,
      modelLimit,
      error: totalWithResponse > modelLimit ? 
        `Total tokens (${totalWithResponse}) exceeds model limit (${modelLimit})` : undefined
    };
  }
}
