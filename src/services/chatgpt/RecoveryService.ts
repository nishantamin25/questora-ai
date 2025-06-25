
import { ErrorHandler, ErrorDetails } from './ErrorHandler';

export class RecoveryService {
  private static readonly MAX_RETRY_ATTEMPTS = 3;
  private static readonly FALLBACK_STORAGE_KEY = 'system_recovery_data';

  // Execute operation with automatic retry and recovery
  static async executeWithRecovery<T>(
    operation: () => Promise<T>,
    context: string,
    fallbackFn?: () => Promise<T>
  ): Promise<T> {
    let lastError: ErrorDetails | null = null;
    
    for (let attempt = 1; attempt <= this.MAX_RETRY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔄 Attempting operation: ${context} (attempt ${attempt}/${this.MAX_RETRY_ATTEMPTS})`);
        const result = await operation();
        
        if (attempt > 1) {
          console.log(`✅ Operation recovered successfully: ${context}`);
        }
        
        return result;
      } catch (error) {
        lastError = ErrorHandler.handleError(error, context);
        console.error(`❌ Attempt ${attempt} failed for ${context}:`, lastError);
        
        // Don't retry if error is not recoverable
        if (!ErrorHandler.shouldRetry(lastError)) {
          console.log(`🚫 Error not retryable, stopping attempts: ${lastError.code}`);
          break;
        }
        
        // Don't retry on last attempt
        if (attempt < this.MAX_RETRY_ATTEMPTS) {
          const delay = ErrorHandler.getRetryDelay(lastError);
          console.log(`⏳ Waiting ${delay}ms before retry...`);
          await this.delay(delay);
        }
      }
    }

    // Try fallback if available
    if (fallbackFn && lastError && ErrorHandler.isRecoverableError(lastError)) {
      try {
        console.log(`🔄 Attempting fallback for: ${context}`);
        const fallbackResult = await fallbackFn();
        console.log(`✅ Fallback successful for: ${context}`);
        return fallbackResult;
      } catch (fallbackError) {
        console.error(`❌ Fallback failed for ${context}:`, fallbackError);
      }
    }

    // If we get here, all attempts failed
    throw new Error(lastError?.userMessage || `Operation failed after ${this.MAX_RETRY_ATTEMPTS} attempts: ${context}`);
  }

  // Save recovery data for later restoration
  static saveRecoveryData(key: string, data: any): void {
    try {
      const recoveryData = this.getRecoveryData();
      recoveryData[key] = {
        data,
        timestamp: Date.now(),
        context: key
      };
      localStorage.setItem(this.FALLBACK_STORAGE_KEY, JSON.stringify(recoveryData));
      console.log(`💾 Recovery data saved: ${key}`);
    } catch (error) {
      console.error('❌ Failed to save recovery data:', error);
    }
  }

  // Retrieve recovery data
  static getRecoveryData(): any {
    try {
      const stored = localStorage.getItem(this.FALLBACK_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Failed to retrieve recovery data:', error);
      return {};
    }
  }

  // Get specific recovery data
  static getRecoveryItem(key: string): any {
    const recoveryData = this.getRecoveryData();
    const item = recoveryData[key];
    
    if (!item) return null;
    
    // Check if data is too old (older than 1 hour)
    const oneHour = 60 * 60 * 1000;
    if (Date.now() - item.timestamp > oneHour) {
      console.log(`⏰ Recovery data expired for: ${key}`);
      this.clearRecoveryItem(key);
      return null;
    }
    
    return item.data;
  }

  // Clear specific recovery item
  static clearRecoveryItem(key: string): void {
    try {
      const recoveryData = this.getRecoveryData();
      delete recoveryData[key];
      localStorage.setItem(this.FALLBACK_STORAGE_KEY, JSON.stringify(recoveryData));
      console.log(`🗑️ Recovery data cleared: ${key}`);
    } catch (error) {
      console.error('❌ Failed to clear recovery data:', error);
    }
  }

  // Clear all recovery data
  static clearAllRecoveryData(): void {
    try {
      localStorage.removeItem(this.FALLBACK_STORAGE_KEY);
      console.log('🗑️ All recovery data cleared');
    } catch (error) {
      console.error('❌ Failed to clear all recovery data:', error);
    }
  }

  // Generate fallback content when AI generation fails
  static generateFallbackQuestions(numberOfQuestions: number, prompt: string): any[] {
    console.log('🔄 Generating fallback questions...');
    
    const fallbackQuestions = [];
    for (let i = 1; i <= numberOfQuestions; i++) {
      fallbackQuestions.push({
        id: `fallback_${i}_${Date.now()}`,
        question: `Question ${i}: Based on the content provided for "${prompt}", what is an important concept to understand?`,
        options: [
          'This requires review of the source material',
          'Please refer to the uploaded content',
          'See the provided documentation',
          'Consult the source files for details'
        ],
        correctAnswer: 0,
        explanation: 'This question was generated as a fallback when the AI service was unavailable. Please review the source material for accurate information.'
      });
    }
    
    return fallbackQuestions;
  }

  // Generate fallback course content
  static generateFallbackCourse(prompt: string, fileContent: string): any {
    console.log('🔄 Generating fallback course...');
    
    const words = fileContent.split(/\s+/).filter(w => w.length > 0);
    const contentLength = Math.min(words.length, 300);
    const truncatedContent = words.slice(0, contentLength).join(' ');
    
    return {
      id: `fallback_course_${Date.now()}`,
      name: `Course: ${prompt}`,
      description: `This course was generated as a fallback when the AI service was unavailable. It contains the raw content from your uploaded files.`,
      materials: [
        {
          id: 'fallback_section_1',
          title: 'Content Overview',
          content: truncatedContent + (words.length > contentLength ? '\n\n[Content truncated for display]' : ''),
          type: 'text',
          order: 1
        }
      ],
      estimatedTime: Math.max(15, Math.ceil(words.length / 200)),
      createdAt: new Date().toISOString(),
      difficulty: 'medium'
    };
  }

  private static delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health check for critical services
  static async performHealthCheck(): Promise<{ isHealthy: boolean; issues: string[] }> {
    const issues: string[] = [];
    
    // Check localStorage availability
    try {
      localStorage.setItem('health_check', 'test');
      localStorage.removeItem('health_check');
    } catch (error) {
      issues.push('localStorage not available');
    }
    
    // Check API key presence
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      issues.push('OpenAI API key not configured');
    }
    
    // Check for excessive recovery data
    const recoveryData = this.getRecoveryData();
    const recoveryKeys = Object.keys(recoveryData);
    if (recoveryKeys.length > 50) {
      issues.push('Excessive recovery data stored');
      // Auto-cleanup old data
      this.cleanupOldRecoveryData();
    }
    
    return {
      isHealthy: issues.length === 0,
      issues
    };
  }

  private static cleanupOldRecoveryData(): void {
    try {
      const recoveryData = this.getRecoveryData();
      const oneHour = 60 * 60 * 1000;
      const now = Date.now();
      
      let cleanedCount = 0;
      for (const [key, item] of Object.entries(recoveryData)) {
        if (typeof item === 'object' && item && 'timestamp' in item) {
          if (now - (item as any).timestamp > oneHour) {
            delete recoveryData[key];
            cleanedCount++;
          }
        }
      }
      
      if (cleanedCount > 0) {
        localStorage.setItem(this.FALLBACK_STORAGE_KEY, JSON.stringify(recoveryData));
        console.log(`🧹 Cleaned up ${cleanedCount} old recovery items`);
      }
    } catch (error) {
      console.error('❌ Failed to cleanup recovery data:', error);
    }
  }
}
