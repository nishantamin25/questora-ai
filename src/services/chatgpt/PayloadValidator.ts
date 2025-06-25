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
    
    // Ensure messages array is valid
    if (!Array.isArray(messages) || messages.length === 0) {
      return {
        isValid: false,
        messages: [],
        error: 'No valid messages provided'
      };
    }

    // Validate each message structure
    const validatedMessages = messages.map(msg => {
      if (!msg || typeof msg !== 'object') {
        return { role: 'user', content: 'Invalid message' };
      }
      
      if (!msg.role || !msg.content) {
        return { role: 'user', content: msg.content || 'Empty message' };
      }

      // Ensure content is string for text messages
      if (typeof msg.content === 'string') {
        return {
          role: msg.role,
          content: msg.content.trim() || 'Empty content'
        };
      }

      // Handle vision messages with proper structure
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.filter(item => 
            item && (item.type === 'text' || item.type === 'image_url')
          )
        };
      }

      return { role: 'user', content: String(msg.content) };
    });

    // Estimate total tokens
    const totalTokens = this.estimateTokens(validatedMessages);
    const modelLimit = this.TOKEN_LIMITS[model as keyof typeof this.TOKEN_LIMITS] || 15000;
    
    console.log('🔍 Payload validation:', {
      model,
      totalTokens,
      modelLimit,
      maxTokens,
      messagesCount: validatedMessages.length
    });

    // Check if within limits
    if (totalTokens + maxTokens > modelLimit) {
      // Attempt to truncate intelligently
      const truncatedMessages = this.truncateMessages(validatedMessages, modelLimit - maxTokens);
      
      if (this.estimateTokens(truncatedMessages) + maxTokens > modelLimit) {
        return {
          isValid: false,
          messages: [],
          error: `Content exceeds model limit. Please reduce your input to under ${Math.floor(modelLimit * this.WORDS_PER_TOKEN)} words.`
        };
      }

      return {
        isValid: true,
        messages: truncatedMessages,
        error: 'Content was truncated to fit model limits'
      };
    }

    return {
      isValid: true,
      messages: validatedMessages
    };
  }

  private static estimateTokens(messages: any[]): number {
    let totalTokens = 0;
    
    for (const message of messages) {
      if (typeof message.content === 'string') {
        totalTokens += Math.ceil(message.content.length / this.WORDS_PER_TOKEN / 4); // ~4 chars per token
      } else if (Array.isArray(message.content)) {
        for (const item of message.content) {
          if (item.type === 'text' && item.text) {
            totalTokens += Math.ceil(item.text.length / this.WORDS_PER_TOKEN / 4);
          } else if (item.type === 'image_url') {
            totalTokens += 1000; // Estimate for image processing
          }
        }
      }
      totalTokens += 10; // Message overhead
    }
    
    return totalTokens;
  }

  private static truncateMessages(messages: any[], maxTokens: number): any[] {
    const truncated = [...messages];
    let currentTokens = this.estimateTokens(truncated);
    
    // Keep system message if present, truncate user messages
    for (let i = truncated.length - 1; i >= 0 && currentTokens > maxTokens; i--) {
      if (truncated[i].role === 'user' && typeof truncated[i].content === 'string') {
        const content = truncated[i].content;
        const targetLength = Math.floor(content.length * 0.8); // Reduce by 20%
        
        if (targetLength > 100) {
          truncated[i].content = content.substring(0, targetLength) + '...[truncated]';
          currentTokens = this.estimateTokens(truncated);
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
      return userPrompt;
    }

    return `Here is the user instruction:

${userPrompt.trim()}

And here is the attached document content:

${fileContent.trim()}`;
  }

  static validateWordCount(content: string, maxWords: number = 2000): { isValid: boolean; wordCount: number; error?: string } {
    const words = content.trim().split(/\s+/).filter(word => word.length > 0);
    const wordCount = words.length;
    
    if (wordCount > maxWords) {
      return {
        isValid: false,
        wordCount,
        error: `Your input exceeds the ${maxWords}-word limit (current: ${wordCount} words). Please shorten it or split into sections.`
      };
    }

    return {
      isValid: true,
      wordCount
    };
  }
}
