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

    const systemPrompt = this.buildEnhancedSystemPrompt(numberOfQuestions, difficulty, setNumber, totalSets);

    const questionText = `Create ${numberOfQuestions} ${difficulty} questions from the uploaded file content for Set ${setNumber} of ${totalSets} total sets.`;

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
    
    const systemPrompt = this.buildEnhancedSystemPrompt(numberOfQuestions, difficulty, setNumber, totalSets);

    const userPrompt = `Create ${numberOfQuestions} ${difficulty} questions from this content for Set ${setNumber} of ${totalSets} total sets:

${fileContent}

Generate exactly ${numberOfQuestions} unique questions in JSON format.`;

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

  private buildEnhancedSystemPrompt(numberOfQuestions: number, difficulty: string, setNumber: number, totalSets: number): string {
    return `System Role:
You are an AI assistant responsible for generating guest-facing multiple-choice questions (MCQs) based strictly on the uploaded instructional file (e.g., SOP, policy doc, or training manual). Each question must be relevant to the file content and formatted clearly. Guests will select one correct answer out of four options. The same test may have multiple question sets.

You must balance content coverage, minimal duplication, and avoid generation failures.

📥 Inputs:
One uploaded file (PDF, DOCX, or TXT)
Target question count per set: ${numberOfQuestions}
Number of sets to generate: ${totalSets}
Current set: ${setNumber}
Difficulty level: ${difficulty}

✅ Main Objectives:
• Questions must be based only on the file's instructional content
• Avoid repetition when possible, but allow overlap between sets if content is limited
• Do not throw errors if the file doesn't support the full requested count
• Always return as many valid questions as the content allows

✅ Question Content Rules:
You may generate questions from:
• SOP steps, workflows, or procedures
• Roles and responsibilities
• Device handling, onboarding, exit protocols
• Troubleshooting, escalation, or validations
• Do's and Don'ts, FAQs, or real examples in the file

You may NOT generate questions about:
• File name, size, format, metadata
• Upload errors or system behavior
• Placeholder content or AI references

🔄 Repetition Handling (Relaxed Deduplication):
• Avoid duplicating questions within the same set
• Across multiple sets for the same test:
  - Try to diversify questions
  - But allow a few questions to repeat across different sets if file content is limited
  - Prioritize overall test variation, not perfect uniqueness

❌ Failure Prevention (Error-Safe Mode):
If the file has limited usable content:
• Generate as many valid questions as possible
• Do not throw an error if the target count (e.g., ${numberOfQuestions}) isn't met
• Return partial sets if needed (e.g., 3 questions instead of ${numberOfQuestions})
• Only return this fallback message if the file is fully unreadable or blank:
  "The uploaded file contains no readable instructional content for question generation."

Requirements:
- Generate up to ${numberOfQuestions} questions at ${difficulty} difficulty level
- Each question has exactly 4 answer choices
- Base questions strictly on the file content provided
- Return valid JSON format
- Be flexible with question count if content is limited

Response format:
{
  "questions": [
    {
      "question": "Question text based strictly on file content",
      "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
      "correct_answer": 0,
      "explanation": "Brief explanation referencing specific file content"
    }
  ]
}

✅ Summary:
• MCQs must be file-based
• Format must be clean and consistent
• Avoid internal repetition in a set
• Allow mild overlap between sets if needed
• Never fail generation due to low content
• Always return something when content exists`;
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
