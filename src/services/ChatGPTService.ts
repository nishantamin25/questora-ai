
import { QuestionGenerationService } from './chatgpt/QuestionGenerationService';
import { ContentEnhancementService } from './chatgpt/ContentEnhancementService';
import { ContentGenerationService } from './chatgpt/ContentGenerationService';
import { ImageAnalysisService } from './chatgpt/ImageAnalysisService';
import { ApiKeyManager } from './chatgpt/ApiKeyManager';

class ChatGPTServiceClass {
  private questionGenerator = new QuestionGenerationService();
  private contentEnhancer = new ContentEnhancementService();
  private contentGenerator = new ContentGenerationService();
  private imageAnalyzer = new ImageAnalysisService();

  async generateQuestions(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<any[]> {
    // Enhanced logging for production diagnostics
    console.log('🎯 ChatGPTService.generateQuestions ENTRY:', {
      prompt: prompt.substring(0, 150) + '...',
      numberOfQuestions,
      difficulty,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets,
      hasApiKey: this.hasApiKey(),
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.questionGenerator.generateQuestions(
        prompt,
        numberOfQuestions,
        difficulty,
        fileContent,
        setNumber,
        totalSets
      );

      console.log('✅ ChatGPTService.generateQuestions SUCCESS:', {
        questionsGenerated: result.length,
        questionsRequested: numberOfQuestions,
        exactMatch: result.length === numberOfQuestions,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('❌ ChatGPTService.generateQuestions ERROR:', error);
      throw error; // Re-throw to maintain error chain
    }
  }

  async enhanceTextContent(textContent: string, userPrompt: string = ''): Promise<string> {
    console.log('🔧 ChatGPTService.enhanceTextContent ENTRY:', {
      contentLength: textContent.length,
      hasUserPrompt: !!userPrompt,
      userPromptLength: userPrompt.length,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.contentEnhancer.enhanceTextContent(textContent, userPrompt);
      
      console.log('✅ ChatGPTService.enhanceTextContent SUCCESS:', {
        originalLength: textContent.length,
        enhancedLength: result.length,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('❌ ChatGPTService.enhanceTextContent ERROR:', error);
      throw error;
    }
  }

  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    console.log('📝 ChatGPTService.generateContent ENTRY:', {
      promptLength: prompt.length,
      fileContentLength: fileContent.length,
      hasFileContent: !!fileContent,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.contentGenerator.generateContent(prompt, fileContent);
      
      console.log('✅ ChatGPTService.generateContent SUCCESS:', {
        promptLength: prompt.length,
        resultLength: result.length,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('❌ ChatGPTService.generateContent ERROR:', error);
      throw error;
    }
  }

  async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    console.log('🖼️ ChatGPTService.analyzeImage ENTRY:', {
      imageLength: base64Image.length,
      promptLength: prompt.length,
      timestamp: new Date().toISOString()
    });

    try {
      const result = await this.imageAnalyzer.analyzeImage(base64Image, prompt);
      
      console.log('✅ ChatGPTService.analyzeImage SUCCESS:', {
        resultLength: result.length,
        timestamp: new Date().toISOString()
      });

      return result;
    } catch (error) {
      console.error('❌ ChatGPTService.analyzeImage ERROR:', error);
      throw error;
    }
  }

  public hasApiKey(): boolean {
    const hasKey = ApiKeyManager.hasApiKey();
    console.log('🔑 API Key check:', { hasKey, timestamp: new Date().toISOString() });
    return hasKey;
  }

  public setApiKey(apiKey: string): void {
    console.log('🔑 Setting API key:', { 
      keyLength: apiKey.length, 
      isValidFormat: apiKey.startsWith('sk-'),
      timestamp: new Date().toISOString()
    });
    ApiKeyManager.setApiKey(apiKey);
  }

  public clearApiKey(): void {
    console.log('🔑 Clearing API key:', { timestamp: new Date().toISOString() });
    ApiKeyManager.clearApiKey();
  }

  public getApiKey(): string {
    const key = ApiKeyManager.getApiKey();
    console.log('🔑 Getting API key:', { 
      hasKey: !!key, 
      keyLength: key?.length || 0,
      timestamp: new Date().toISOString()
    });
    return key;
  }

  // Production diagnostics method
  public generateDiagnosticReport(): any {
    return {
      timestamp: new Date().toISOString(),
      apiKey: {
        configured: this.hasApiKey(),
        format: this.hasApiKey() ? 'valid' : 'missing'
      },
      services: {
        questionGenerator: 'ready',
        contentEnhancer: 'ready',
        contentGenerator: 'ready',
        imageAnalyzer: 'ready'
      },
      system: {
        environment: 'production',
        nodeEnv: typeof process !== 'undefined' ? process.env.NODE_ENV : 'browser',
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
      }
    };
  }
}

export const ChatGPTService = new ChatGPTServiceClass();
