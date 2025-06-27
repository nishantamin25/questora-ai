
import { ValidationService } from './ValidationService';

export class PayloadValidator {
  // Conservative token limits to prevent 400 errors
  private static readonly TOKEN_LIMITS = {
    'gpt-4.1-2025-04-14': 120000,
    'gpt-4o': 120000,
    'gpt-3.5-turbo': 15000
  };

  private static readonly WORDS_PER_TOKEN = 0.75;

  static validateAndPreparePayload(
    model: string,
    messages: any[],
    maxTokens: number = 2000
  ): { isValid: boolean; messages: any[]; error?: string; debugInfo?: any } {
    
    console.log('🔍 COMPREHENSIVE PAYLOAD VALIDATION START:', {
      model,
      messagesCount: messages.length,
      maxTokens,
      timestamp: new Date().toISOString()
    });
    
    // Step 1: Ensure messages array is valid
    if (!Array.isArray(messages) || messages.length === 0) {
      console.error('❌ Invalid messages array:', messages);
      return {
        isValid: false,
        messages: [],
        error: 'No valid messages provided',
        debugInfo: { step: 'MESSAGE_VALIDATION', issue: 'EMPTY_OR_INVALID_ARRAY' }
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
        
        // Remove control characters but preserve formatting
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
        error: `Payload validation failed: ${validation.errors.join(', ')}`,
        debugInfo: { 
          step: 'PAYLOAD_VALIDATION', 
          errors: validation.errors,
          warnings: validation.warnings
        }
      };
    }

    if (validation.warnings.length > 0) {
      console.warn('⚠️ Payload warnings:', validation.warnings);
    }

    // Step 4: Token limit validation with intelligent handling
    const tokenValidation = ValidationService.validateTokenLimits(cleanedMessages, model, maxTokens);
    
    const debugInfo = {
      step: 'TOKEN_VALIDATION',
      estimatedTokens: tokenValidation.estimatedTokens,
      modelLimit: tokenValidation.modelLimit,
      maxTokens,
      messagesCount: cleanedMessages.length,
      contentSizes: cleanedMessages.map(m => ({
        role: m.role,
        contentLength: typeof m.content === 'string' ? m.content.length : JSON.stringify(m.content).length
      }))
    };

    if (!tokenValidation.isValid) {
      console.error('❌ Token limit exceeded:', tokenValidation);
      
      // Attempt intelligent truncation
      const truncatedMessages = this.truncateMessagesIntelligently(
        cleanedMessages, 
        tokenValidation.modelLimit - maxTokens - 1000 // Extra buffer
      );
      
      const retryTokenValidation = ValidationService.validateTokenLimits(truncatedMessages, model, maxTokens);
      
      if (!retryTokenValidation.isValid) {
        return {
          isValid: false,
          messages: [],
          error: `Content exceeds model limit even after truncation. Estimated tokens: ${tokenValidation.estimatedTokens}, Model limit: ${tokenValidation.modelLimit}. Please reduce input size significantly.`,
          debugInfo: { ...debugInfo, truncationAttempted: true, finalTokens: retryTokenValidation.estimatedTokens }
        };
      }

      console.log('✅ Content truncated successfully to fit within limits');
      return {
        isValid: true,
        messages: truncatedMessages,
        error: 'Content was truncated to fit model limits',
        debugInfo: { ...debugInfo, truncationApplied: true, finalTokens: retryTokenValidation.estimatedTokens }
      };
    }

    console.log('✅ Payload validation completely successful:', {
      model,
      messagesCount: cleanedMessages.length,
      estimatedTokens: tokenValidation.estimatedTokens,
      modelLimit: tokenValidation.modelLimit,
      maxTokens,
      utilizationPercentage: ((tokenValidation.estimatedTokens + maxTokens) / tokenValidation.modelLimit * 100).toFixed(1) + '%'
    });

    return {
      isValid: true,
      messages: cleanedMessages,
      debugInfo
    };
  }

  private static truncateMessagesIntelligently(messages: any[], targetTokens: number): any[] {
    const truncated = [...messages];
    let currentTokens = ValidationService.estimateTokensAccurate(
      JSON.stringify(truncated.map(m => m.content))
    );
    
    console.log('🔄 Intelligent truncation started:', { currentTokens, targetTokens });
    
    // Strategy 1: Truncate user messages from oldest to newest, preserving system messages
    for (let i = 0; i < truncated.length && currentTokens > targetTokens; i++) {
      if (truncated[i].role === 'user' && typeof truncated[i].content === 'string') {
        const originalLength = truncated[i].content.length;
        const reductionFactor = Math.max(0.6, targetTokens / currentTokens);
        const newLength = Math.floor(originalLength * reductionFactor);
        
        if (newLength > 200) { // Ensure minimum useful content
          truncated[i].content = truncated[i].content.substring(0, newLength) + '\n\n[Content truncated to fit model limits]';
          currentTokens = ValidationService.estimateTokensAccurate(
            JSON.stringify(truncated.map(m => m.content))
          );
          console.log(`🔄 Truncated message ${i}: ${originalLength} -> ${newLength} chars`);
        }
      }
    }
    
    console.log('✅ Intelligent truncation completed:', { finalTokens: currentTokens });
    return truncated;
  }

  static mergePromptAndFileContent(userPrompt: string, fileContent: string = ''): string {
    if (!userPrompt || userPrompt.trim().length === 0) {
      return fileContent || 'No prompt provided';
    }

    if (!fileContent || fileContent.trim().length === 0) {
      return userPrompt.trim();
    }

    // Clean both inputs thoroughly
    const cleanPrompt = userPrompt.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const cleanFileContent = fileContent.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

    // Create a well-structured merge that prioritizes user intent
    return `USER REQUEST: ${cleanPrompt}

DOCUMENT CONTENT FOR REFERENCE:
"""
${cleanFileContent}
"""

INSTRUCTIONS: Use the document content above to fulfill the user's request. Base all generated content strictly on the provided document while following the user's specific requirements.`;
  }

  static validateWordCount(content: string, maxWords: number = 2000): { isValid: boolean; wordCount: number; error?: string; debugInfo?: any } {
    if (!content || typeof content !== 'string') {
      return {
        isValid: false,
        wordCount: 0,
        error: 'Content is empty or invalid',
        debugInfo: { issue: 'EMPTY_CONTENT' }
      };
    }

    const cleanContent = content.trim().replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    const words = cleanContent.split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    const debugInfo = {
      originalLength: content.length,
      cleanedLength: cleanContent.length,
      wordCount,
      maxWords,
      utilizationPercentage: ((wordCount / maxWords) * 100).toFixed(1) + '%'
    };

    if (wordCount > maxWords) {
      return {
        isValid: false,
        wordCount,
        error: `Input exceeds ${maxWords}-word limit (current: ${wordCount} words). Please reduce content size by ${wordCount - maxWords} words.`,
        debugInfo: { ...debugInfo, overageWords: wordCount - maxWords }
      };
    }

    if (wordCount === 0) {
      return {
        isValid: false,
        wordCount: 0,
        error: 'No valid words found in content',
        debugInfo: { ...debugInfo, issue: 'NO_WORDS' }
      };
    }

    console.log('✅ Word count validation passed:', debugInfo);

    return {
      isValid: true,
      wordCount,
      debugInfo
    };
  }

  static generatePayloadDebugReport(model: string, messages: any[], maxTokens: number): any {
    const validation = this.validateAndPreparePayload(model, messages, maxTokens);
    
    return {
      timestamp: new Date().toISOString(),
      model,
      maxTokens,
      validation: {
        isValid: validation.isValid,
        error: validation.error,
        debugInfo: validation.debugInfo
      },
      messageAnalysis: messages.map((msg, index) => ({
        index,
        role: msg.role,
        contentType: typeof msg.content,
        contentLength: typeof msg.content === 'string' ? msg.content.length : JSON.stringify(msg.content).length,
        hasContent: !!msg.content
      })),
      recommendations: validation.isValid ? [] : this.generateRecommendations(validation.error, validation.debugInfo)
    };
  }

  private static generateRecommendations(error: string, debugInfo: any): string[] {
    const recommendations = [];
    
    if (error?.includes('word limit')) {
      recommendations.push('Reduce file content or split into multiple requests');
      recommendations.push('Focus on the most relevant sections of your document');
    }
    
    if (error?.includes('token limit')) {
      recommendations.push('Shorten your prompt or use a smaller file');
      recommendations.push('Consider summarizing your requirements');
    }
    
    if (debugInfo?.step === 'MESSAGE_VALIDATION') {
      recommendations.push('Check that your prompt and file are properly formatted');
      recommendations.push('Ensure uploaded file contains readable text');
    }
    
    return recommendations;
  }
}
