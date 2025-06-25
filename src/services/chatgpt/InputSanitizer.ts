
export class InputSanitizer {
  // Sanitize and validate user prompts
  static sanitizePrompt(prompt: string): string {
    if (!prompt || typeof prompt !== 'string') {
      throw new Error('Prompt must be a non-empty string');
    }

    // Remove control characters and normalize whitespace
    let sanitized = prompt
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();

    if (sanitized.length === 0) {
      throw new Error('Prompt cannot be empty after sanitization');
    }

    if (sanitized.length > 5000) {
      console.warn('⚠️ Prompt truncated due to length');
      sanitized = sanitized.substring(0, 5000) + '...';
    }

    return sanitized;
  }

  // Sanitize file content
  static sanitizeFileContent(content: string): string {
    if (!content || typeof content !== 'string') {
      return '';
    }

    // Remove control characters but preserve newlines and tabs
    let sanitized = content
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars except \n and \t
      .replace(/\r\n/g, '\n') // Normalize line endings
      .replace(/\r/g, '\n'); // Convert remaining \r to \n

    // Remove excessive whitespace
    sanitized = sanitized
      .replace(/\n{4,}/g, '\n\n\n') // Limit consecutive newlines to 3
      .replace(/[ \t]{10,}/g, '        '); // Limit consecutive spaces/tabs

    return sanitized.trim();
  }

  // Validate and sanitize numbers
  static sanitizeNumber(value: any, min: number, max: number, defaultValue: number): number {
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (isNaN(parsed)) {
        console.warn(`⚠️ Invalid number: ${value}, using default: ${defaultValue}`);
        return defaultValue;
      }
      value = parsed;
    }

    if (typeof value !== 'number' || isNaN(value)) {
      console.warn(`⚠️ Invalid number: ${value}, using default: ${defaultValue}`);
      return defaultValue;
    }

    if (value < min) {
      console.warn(`⚠️ Number too small: ${value}, using minimum: ${min}`);
      return min;
    }

    if (value > max) {
      console.warn(`⚠️ Number too large: ${value}, using maximum: ${max}`);
      return max;
    }

    return value;
  }

  // Validate difficulty levels
  static sanitizeDifficulty(difficulty: any): 'easy' | 'medium' | 'hard' {
    if (typeof difficulty === 'string' && ['easy', 'medium', 'hard'].includes(difficulty)) {
      return difficulty as 'easy' | 'medium' | 'hard';
    }
    console.warn(`⚠️ Invalid difficulty: ${difficulty}, using default: medium`);
    return 'medium';
  }

  // Sanitize base64 images
  static sanitizeBase64Image(base64: string): string {
    if (!base64 || typeof base64 !== 'string') {
      throw new Error('Base64 image data is required');
    }

    // Remove data URL prefix if present
    const cleanBase64 = base64.replace(/^data:image\/[a-zA-Z]*;base64,/, '');

    // Validate base64 format
    if (!cleanBase64.match(/^[A-Za-z0-9+/]+=*$/)) {
      throw new Error('Invalid base64 image format');
    }

    if (cleanBase64.length === 0) {
      throw new Error('Empty base64 image data');
    }

    // Check for reasonable size limits (e.g., 10MB in base64)
    if (cleanBase64.length > 14000000) {
      throw new Error('Image too large (maximum 10MB)');
    }

    return cleanBase64;
  }

  // Sanitize test options
  static sanitizeTestOptions(options: any): any {
    if (!options || typeof options !== 'object') {
      throw new Error('Test options must be an object');
    }

    return {
      testName: this.sanitizePrompt(options.testName || 'Generated Test'),
      difficulty: this.sanitizeDifficulty(options.difficulty),
      numberOfQuestions: this.sanitizeNumber(options.numberOfQuestions, 1, 50, 5),
      timeframe: this.sanitizeNumber(options.timeframe, 1, 300, 30),
      includeCourse: Boolean(options.includeCourse),
      includeQuestionnaire: Boolean(options.includeQuestionnaire)
    };
  }

  // Remove potentially dangerous content
  static removeDangerousContent(content: string): string {
    if (!content) return '';

    // Remove script tags and their content
    content = content.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove other potentially dangerous tags
    content = content.replace(/<(iframe|object|embed|link|meta|style)\b[^>]*>/gi, '');
    
    // Remove javascript: and data: URLs
    content = content.replace(/javascript:[^"']*/gi, '');
    content = content.replace(/data:[^"']*/gi, '');

    return content;
  }
}
