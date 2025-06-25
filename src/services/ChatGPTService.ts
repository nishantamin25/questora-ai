
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
    return this.questionGenerator.generateQuestions(
      prompt,
      numberOfQuestions,
      difficulty,
      fileContent,
      setNumber,
      totalSets
    );
  }

  async enhanceTextContent(textContent: string, userPrompt: string = ''): Promise<string> {
    return this.contentEnhancer.enhanceTextContent(textContent, userPrompt);
  }

  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    return this.contentGenerator.generateContent(prompt, fileContent);
  }

  async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    return this.imageAnalyzer.analyzeImage(base64Image, prompt);
  }

  public hasApiKey(): boolean {
    return ApiKeyManager.hasApiKey();
  }

  public setApiKey(apiKey: string): void {
    ApiKeyManager.setApiKey(apiKey);
  }

  public clearApiKey(): void {
    ApiKeyManager.clearApiKey();
  }

  public getApiKey(): string {
    return ApiKeyManager.getApiKey();
  }
}

export const ChatGPTService = new ChatGPTServiceClass();
