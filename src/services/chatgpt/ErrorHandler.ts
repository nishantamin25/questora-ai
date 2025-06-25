
export interface ErrorDetails {
  code: string;
  message: string;
  context?: string;
  recoverable: boolean;
  userMessage: string;
}

export class ErrorHandler {
  private static readonly ERROR_CODES = {
    // API Related
    API_KEY_MISSING: 'API_KEY_MISSING',
    API_KEY_INVALID: 'API_KEY_INVALID',
    API_RATE_LIMIT: 'API_RATE_LIMIT',
    API_QUOTA_EXCEEDED: 'API_QUOTA_EXCEEDED',
    API_NETWORK_ERROR: 'API_NETWORK_ERROR',
    API_TIMEOUT: 'API_TIMEOUT',
    API_PARSE_ERROR: 'API_PARSE_ERROR',
    
    // Content Related
    CONTENT_TOO_LARGE: 'CONTENT_TOO_LARGE',
    CONTENT_INVALID: 'CONTENT_INVALID',
    CONTENT_EMPTY: 'CONTENT_EMPTY',
    CONTENT_CORRUPTED: 'CONTENT_CORRUPTED',
    
    // Validation Related
    VALIDATION_FAILED: 'VALIDATION_FAILED',
    PAYLOAD_INVALID: 'PAYLOAD_INVALID',
    TOKEN_LIMIT_EXCEEDED: 'TOKEN_LIMIT_EXCEEDED',
    
    // Storage Related
    STORAGE_FULL: 'STORAGE_FULL',
    STORAGE_ERROR: 'STORAGE_ERROR',
    
    // Generation Related
    GENERATION_FAILED: 'GENERATION_FAILED',
    INSUFFICIENT_CONTENT: 'INSUFFICIENT_CONTENT',
    QUESTION_COUNT_MISMATCH: 'QUESTION_COUNT_MISMATCH'
  };

  static handleError(error: any, context: string = 'Unknown'): ErrorDetails {
    console.error(`🚨 ERROR HANDLER [${context}]:`, error);

    // Network and API errors
    if (error.message?.includes('fetch')) {
      return this.createErrorDetails(
        this.ERROR_CODES.API_NETWORK_ERROR,
        'Network connection failed',
        context,
        true,
        'Network connection issue. Please check your internet connection and try again.'
      );
    }

    if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
      return this.createErrorDetails(
        this.ERROR_CODES.API_KEY_INVALID,
        'Invalid or expired API key',
        context,
        false,
        'API key is invalid or expired. Please check your OpenAI API key in settings.'
      );
    }

    if (error.message?.includes('429') || error.message?.includes('rate limit')) {
      return this.createErrorDetails(
        this.ERROR_CODES.API_RATE_LIMIT,
        'API rate limit exceeded',
        context,
        true,
        'API rate limit exceeded. Please wait a moment and try again.'
      );
    }

    if (error.message?.includes('quota') || error.message?.includes('billing')) {
      return this.createErrorDetails(
        this.ERROR_CODES.API_QUOTA_EXCEEDED,
        'API quota exceeded',
        context,
        false,
        'OpenAI API quota exceeded. Please check your OpenAI account billing.'
      );
    }

    // Content validation errors
    if (error.message?.includes('word limit') || error.message?.includes('token limit')) {
      return this.createErrorDetails(
        this.ERROR_CODES.TOKEN_LIMIT_EXCEEDED,
        'Content exceeds size limits',
        context,
        true,
        'Content is too large. Please reduce the file size or text length and try again.'
      );
    }

    if (error.message?.includes('insufficient content') || error.message?.includes('minimum')) {
      return this.createErrorDetails(
        this.ERROR_CODES.INSUFFICIENT_CONTENT,
        'Insufficient content for generation',
        context,
        false,
        'Not enough content to generate the requested items. Please upload files with more substantial content.'
      );
    }

    // JSON parsing errors
    if (error instanceof SyntaxError || error.message?.includes('JSON')) {
      return this.createErrorDetails(
        this.ERROR_CODES.API_PARSE_ERROR,
        'Failed to parse API response',
        context,
        true,
        'Received invalid response from AI service. Please try again.'
      );
    }

    // Storage errors
    if (error.message?.includes('localStorage') || error.message?.includes('quota')) {
      return this.createErrorDetails(
        this.ERROR_CODES.STORAGE_ERROR,
        'Browser storage error',
        context,
        true,
        'Browser storage is full or blocked. Please clear browser data or try in a different browser.'
      );
    }

    // Generic error handling
    return this.createErrorDetails(
      this.ERROR_CODES.GENERATION_FAILED,
      error.message || 'Unknown error occurred',
      context,
      true,
      `An unexpected error occurred: ${error.message || 'Please try again or contact support if the issue persists.'}`
    );
  }

  private static createErrorDetails(
    code: string,
    message: string,
    context: string,
    recoverable: boolean,
    userMessage: string
  ): ErrorDetails {
    return {
      code,
      message,
      context,
      recoverable,
      userMessage
    };
  }

  static isRecoverableError(error: ErrorDetails): boolean {
    return error.recoverable;
  }

  static shouldRetry(error: ErrorDetails): boolean {
    const retryableCodes = [
      this.ERROR_CODES.API_NETWORK_ERROR,
      this.ERROR_CODES.API_TIMEOUT,
      this.ERROR_CODES.API_RATE_LIMIT
    ];
    return retryableCodes.includes(error.code);
  }

  static getRetryDelay(error: ErrorDetails): number {
    switch (error.code) {
      case this.ERROR_CODES.API_RATE_LIMIT:
        return 5000; // 5 seconds for rate limits
      case this.ERROR_CODES.API_NETWORK_ERROR:
        return 2000; // 2 seconds for network issues
      default:
        return 1000; // 1 second default
    }
  }
}
