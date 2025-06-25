import { ValidationService } from './ValidationService';

export class PayloadValidator {
  // Conservative token limits to prevent 400 errors
  private static readonly TOKEN_LIMITS = {
    'gpt-4.1-2025-04-14': 120000, // Leave buffer for response
    'gpt-4o': 120000,
    'gpt-3.5-turbo': 15000
  };

  private static readonly WORDS_PER_TOKEN = 0.75; // Conservative estimate

  static validateAndPreparePayload(
    model: string,
    messages: any[],
    maxTokens: number = 2000
  ): { isValid: boolean; messages: any[]; error?: string } {
    
    console.log('🔍 Starting comprehensive payload validation...');
    
    // Step 1: Ensure messages array is valid
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error('❌ Invalid messages array:', messages);
      return {
        isValid: false,
        messages: [],
        error: 'No valid messages provided'
      };
    }

    // Step 2: Clean and validate each message structure
    const cleanedMessages = messages.map((msg, index) => {
      if (!msg || typeof msg !== 'object') {
        console.warn(`⚠️ Invalid message at index ${index}:`, msg);
        return { role: 'user', content: 'Invalid message content' };
      }
      
      // Ensure role is valid
      if (!msg.role || !['system', 'user', 'assistant'].includes(msg.role)) {
        console.warn(`⚠️ Invalid role at index ${index}:`, msg.role);
        msg.role = 'user';
      }

      // Handle content based on type
      if (!msg.content) {
        console.warn(`⚠️ Empty content at index ${index}`);
        return { role: msg.role, content: 'Empty content' };
      }

      // String content (most common)
      if (typeof msg.content === 'string') {
        const trimmedContent = msg.content.trim();
        if (trimmedContent.length === 0) {
          console.warn(`⚠️ Empty string content at index ${index}`);
          return { role: msg.role, content: 'Empty content' };
        }
        
        // Remove any control characters that could cause issues
        const cleanContent = trimmedContent.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
        
        return {
          role: msg.role,
          content: cleanContent
        };
      }

      // Array content (vision messages)
      if (Array.isArray(msg.content)) {
        const validContentItems = msg.content.filter(item => {
          if (!item || !item.type) return false;
          
          if (item.type === 'text') {
            return item.text && typeof item.text === 'string' && item.text.trim().length > 0;
          }
          
          if (item.type === 'image_url') {
            return item.image_url && 
                   item.image_url.url && 
                   typeof item.image_url.url === 'string' &&
                   item.image_url.url.startsWith('data:image/');
          }
          
          return false;
        });

        if (validContentItems.length === 0) {
          console.warn(`⚠️ No valid content items at index ${index}`);
          return { role: msg.role, content: 'Invalid content items' };
        }

        return {
          role: msg.role,
          content: validContentItems
        };
      }

      // Fallback for other content types
      console.warn(`⚠️ Unexpected content type at index ${index}:`, typeof msg.content);
      return { role: msg.role, content: String(msg.content) };
    });

    // Step 3: Comprehensive payload validation
    const testPayload = {
      model,
      messages: cleanedMessages,
      max_tokens: maxTokens,
      temperature: 0.7
    };

    const validation = ValidationService.validateCompletePayload(testPayload);
    
    if (!validation.isValid) {
      console.error('❌ Payload validation failed:', validation.errors);
      return {
        isValid: false,
        messages: [],
        error: `Payload validation failed: ${validation.errors.join(', ')}`
      };
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Payload warnings:', validation.warnings);
    }

    // Step 4: Token limit validation
    const tokenValidation = ValidationService.validateTokenLimits(cleanedMessages, model, maxTokens);
    
    if (!tokenValidation.isValid) {
      console.error('❌ Token limit exceeded:', tokenValidation);
      
      // Attempt intelligent truncation
      const truncatedMessages = this.truncateMessagesIntelligently(
        cleanedMessages, 
        tokenValidation.modelLimit - maxTokens
      );
      
      const retryTokenValidation = ValidationService.validateTokenLimits(truncatedMessages, model, maxTokens);
      
      if (!retryTokenValidation.isValid) {
        return {
          isValid: false,
          messages: [],
          error: `Content exceeds model limit. Estimated tokens: ${tokenValidation.estimatedTokens}, Model limit: ${tokenValidation.modelLimit}. Please reduce input size.`
        };
      }

      console.log('✅ Content truncated to fit within limits');
      return {
        isValid: true,
        messages: truncatedMessages,
        error: 'Content was truncated to fit model limits'
      };
    }

    console.log('✅ Payload validation successful:', {
      model,
      messagesCount: cleanedMessages.length,
      estimatedTokens: tokenValidation.estimatedTokens,
      modelLimit: tokenValidation.modelLimit,
      maxTokens
    });

    return {
      isValid: true,
      messages: cleanedMessages
    };
  }

  private static truncateMessagesIntelligently(messages: any[], targetTokens: number): any[] {
    const truncated = [...messages];
    let currentTokens = ValidationService.estimateTokensAccurate(
      JSON.stringify(truncated.map(m => m.content))
    );
    
    console.log('🔄 Truncating messages:', { currentTokens, targetTokens });
    
    // Strategy 1: Truncate user messages from the end, keeping system messages
    for (let i = truncated.length - 1; i >= 0 && currentTokens > targetTokens; i--) {
      if (truncated[i].role === 'user' && typeof truncated[i].content === 'string') {
        const originalLength = truncated[i].content.length;
        const reductionFactor = Math.max(0.7, targetTokens / currentTokens);
        const newLength = Math.floor(originalLength * reductionFactor);
        
        if (newLength > 100) {
          truncated[i].content = truncated[i].content.substring(0, newLength) + '...[truncated for length]';
          currentTokens = ValidationService.estimateTokensAccurate(
            JSON.stringify(truncated.map(m => m.content))
          );
          console.log(`🔄 Truncated message ${i}: ${originalLength} -> ${newLength} chars`);
        }
      }
    }
    
    return truncated;
  }

  static mergePromptAndFileContent(userPrompt: string, fileContent: string = ''): string {
    if (!userPrompt || userPrompt.trim().length === 0) {
      return fileContent || 'No prompt provided';
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return userPrompt.trim();
    }

    // Clean both inputs
    const cleanPrompt = userPrompt.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const cleanFileContent = fileContent.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    return `USER REQUEST: ${cleanPrompt}

DOCUMENT CONTENT:
${cleanFileContent}`;
  }

  static validateWordCount(content: string, maxWords: number = 2000): { isValid: boolean; wordCount: number; error?: string } {
    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        wordCount: 0,
        error: 'Content is empty or invalid'
      };
    }

    const cleanContent = content.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    if (wordCount > maxWords) {
      return {
        isValid: false,
        wordCount,
        error: `Input exceeds ${maxWords}-word limit (current: ${wordCount} words). Please reduce content size.`
      };
    }

    if (wordCount === 0) {
      return {
        isValid: false,
        wordCount: 0,
        error: 'No valid words found in content'
      };
    }

    return {
      isValid: true,
      wordCount
    };
  }
}
