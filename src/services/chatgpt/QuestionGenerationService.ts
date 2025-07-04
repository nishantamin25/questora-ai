import { LanguageService } from '../LanguageService';
import { ApiKeyManager } from './ApiKeyManager';
import { ContentValidator } from './ContentValidator';
import { PayloadValidator } from './PayloadValidator';
import { ApiCallService } from './ApiCallService';
import { InputSanitizer } from './InputSanitizer';
import { RecoveryService } from './RecoveryService';
import { ErrorHandler } from './ErrorHandler';
import { QuestionnaireStorage } from '../questionnaire/QuestionnaireStorage';

export class QuestionGenerationService {
  async generateQuestions(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<any[]> {
    const language = LanguageService.getCurrentLanguage();

    console.log('🔍 GENERATING QUESTIONS WITH FILE SUPPORT:', {
      prompt: prompt.substring(0, 100) + '...',
      requestedQuestions: numberOfQuestions,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets,
      difficulty,
      language
    });

    try {
      if (!ApiKeyManager.hasApiKey()) {
        throw new Error('OpenAI API key not configured. Please set your API key in settings.');
      }

      // Check if we have file content that looks like it contains base64 data
      const hasFileData = fileContent.includes('=== File:') && fileContent.includes('base64');
      
      if (hasFileData) {
        console.log('📄 Detected file data in content, using structured format');
        return await this.generateQuestionsWithFileData(
          prompt,
          numberOfQuestions,
          difficulty,
          fileContent,
          setNumber,
          totalSets,
          language
        );
      } else {
        console.log('📝 Using text-only format');
        return await this.generateQuestionsTextOnly(
          prompt,
          numberOfQuestions,
          difficulty,
          fileContent,
          setNumber,
          totalSets,
          language
        );
      }

    } catch (error) {
      console.error('❌ Question generation failed:', error);
      throw error;
    }
  }

  private async generateQuestionsWithFileData(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string,
    setNumber: number,
    totalSets: number,
    language: string
  ): Promise<any[]> {
    console.log('🚀 GENERATING QUESTIONS WITH FILE DATA...');
    
    // Extract file information from processed content
    const fileInfo = this.extractFileInfo(fileContent);
    
    if (!fileInfo) {
      throw new Error('Could not extract file information from content');
    }

    console.log('📄 Using file:', fileInfo.filename, 'Type:', fileInfo.type);

    const systemPrompt = `You are an AI assistant that generates comprehension and training questions based on detailed retail SOP documents.

Your task is to generate clear, practical questions that help retail store staff understand, remember, and apply the processes described in the Scan and Go SOP. The questions should cover:
- System architecture and overview
- Device setup and daily checks
- Customer onboarding process
- Exception and issue handling
- Security protocols
- End-of-shift reporting
- FAQs and real-world scenarios

Requirements:
- Generate exactly ${numberOfQuestions} questions
- Use ${difficulty} difficulty level
- Each question has 4 answer choices
- Base questions on the file content provided
- Format each question as a numbered list
- Avoid yes/no questions
- Prefer scenario-based or action-oriented questions that test understanding of procedures and responsibilities
- Return valid JSON format

Response format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": 0,
      "explanation": "Brief explanation"
    }
  ]
}`;

    const questionText = `Create ${numberOfQuestions} ${difficulty} comprehension and training questions from the uploaded retail SOP document content. Focus on practical scenarios that test staff understanding of procedures and responsibilities.`;

    // Use the correct structured format for file uploads
    const messages = [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: [
          {
            type: 'input_file',
            filename: fileInfo.filename,
            file_data: fileInfo.base64Data
          },
          {
            type: 'input_text',
            text: questionText
          }
        ]
      }
    ];

    const requestBody = {
      model: 'gpt-4.1-2025-04-14',
      messages,
      max_tokens: numberOfQuestions * 200,
      temperature: 0.3,
      response_format: { type: "json_object" }
    };

    console.log('📤 Sending structured file request to ChatGPT...');
    const content = await ApiCallService.makeApiCall(requestBody, 'FILE-BASED QUESTION GENERATION');

    return this.processQuestionResponse(content, numberOfQuestions);
  }

  private async generateQuestionsTextOnly(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string,
    setNumber: number,
    totalSets: number,
    language: string
  ): Promise<any[]> {
    console.log('🚀 GENERATING QUESTIONS WITH TEXT CONTENT...');
    
    const systemPrompt = `You are an AI assistant that generates comprehension and training questions based on detailed retail SOP documents.

Your task is to generate clear, practical questions that help retail store staff understand, remember, and apply the processes described in the Scan and Go SOP. The questions should cover:
- System architecture and overview
- Device setup and daily checks
- Customer onboarding process
- Exception and issue handling
- Security protocols
- End-of-shift reporting
- FAQs and real-world scenarios

Requirements:
- Generate exactly ${numberOfQuestions} questions
- Use ${difficulty} difficulty level
- Each question has 4 answer choices
- Base questions on the provided content
- Format each question as a numbered list
- Avoid yes/no questions
- Prefer scenario-based or action-oriented questions that test understanding of procedures and responsibilities
- Return valid JSON format

Response format:
{
  "questions": [
    {
      "question": "Question text",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": 0,
      "explanation": "Brief explanation"
    }
  ]
}`;

    const userPrompt = `Create ${numberOfQuestions} ${difficulty} comprehension and training questions from this retail SOP content. Focus on practical scenarios that test staff understanding of procedures and responsibilities:

${fileContent}

Generate exactly ${numberOfQuestions} questions in JSON format.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const requestBody = {
      model: 'gpt-4.1-2025-04-14',
      messages,
      max_tokens: numberOfQuestions * 200,
      temperature: 0.3,
      response_format: { type: "json_object" }
    };

    console.log('📤 Sending text-only request to ChatGPT...');
    const content = await ApiCallService.makeApiCall(requestBody, 'TEXT-BASED QUESTION GENERATION');

    return this.processQuestionResponse(content, numberOfQuestions);
  }

  private extractFileInfo(fileContent: string): { filename: string; type: string; base64Data: string } | null {
    try {
      // Look for file information in the processed content
      const fileMatch = fileContent.match(/=== File: (.+?) ===/);
      const typeMatch = fileContent.match(/Type: (.+?)[\n\r]/);
      const base64Match = fileContent.match(/base64:([A-Za-z0-9+/=\s]+)/);
      
      if (!fileMatch || !base64Match) {
        console.warn('Could not extract file info from content');
        return null;
      }

      const filename = fileMatch[1].trim();
      const type = typeMatch ? typeMatch[1].trim() : 'document';
      const base64Data = base64Match[1].replace(/\s/g, ''); // Remove whitespace

      return {
        filename,
        type,
        base64Data
      };
    } catch (error) {
      console.error('Error extracting file info:', error);
      return null;
    }
  }

  private processQuestionResponse(content: string, numberOfQuestions: number): any[] {
    if (!content) {
      throw new Error('No response from AI');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError);
      throw new Error('Invalid AI response format');
    }

    let questions = parsedResponse.questions || [];

    if (!Array.isArray(questions)) {
      throw new Error('Invalid response - expected questions array');
    }

    // Simple validation and formatting
    const validQuestions = questions
      .filter(q => q && q.question && q.options && Array.isArray(q.options))
      .map(q => ({
        question: q.question,
        options: q.options.slice(0, 4),
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                       typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        explanation: q.explanation || 'Based on the provided content'
      }))
      .slice(0, numberOfQuestions);

    console.log(`✅ Processed ${validQuestions.length} valid questions from response`);
    return validQuestions;
  }
}
