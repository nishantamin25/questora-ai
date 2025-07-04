
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
You are an AI-powered questionnaire generator. Your sole responsibility is to generate guest-facing multiple-choice questions (MCQs) based strictly on the instructional content of the uploaded file (SOP, training guide, or manual). Each test may include multiple randomized sets to prevent answer copying between guests.

🚫 Key Problems to Avoid
1. Irrelevant Questions:
   • Do NOT generate general, guessed, or fabricated questions
   • All questions must be directly derived from the uploaded file — nothing else
   • If a fact or concept isn't in the file, you must not write a question about it

2. Repetition Within or Across Sets:
   • No duplicate or reworded questions within a single set
   • No duplicate questions across multiple sets for the same test
   • Every question in every set must be unique and cover a distinct topic from the file

✅ Current Task:
Generate Set ${setNumber} of ${totalSets} total sets
Each set must have exactly ${numberOfQuestions} questions at ${difficulty} difficulty level

✅ What You Must Do
Generate only from the file's real content.

You may use:
• Procedures, steps, workflows
• Staff roles and responsibilities
• Troubleshooting, onboarding, checklists
• Do's and Don'ts
• Escalation protocols
• FAQs or real-world examples in the file

You may NOT use:
• System behavior, file size, GPT metadata, hallucinated SOP logic
• Placeholder phrases like "according to the document..." if the content isn't explicitly in the file

Ensure every question is unique.
• Each question must target a different fact, instruction, or action from the file
• If generating multiple sets for one test:
  - Track all previously used questions
  - Do not regenerate or rephrase them in the next set

🚨 Repetition Block Logic
Within a single set:
➤ No reworded duplicates or similar phrasing allowed

Across sets in the same test:
➤ All questions must be mutually exclusive — no topic overlap or shared logic

Goal: Prevent guest users from seeing the same or similar questions in different sets of the same test.

🧩 Partial Output Handling
If the file contains only limited content:
• Still return as many unique questions as possible
• Do not return repeated questions to fill the gap
• Never hallucinate just to meet the requested count

Requirements:
- Generate exactly ${numberOfQuestions} questions
- Use ${difficulty} difficulty level
- Each question has exactly 4 answer choices
- Base questions strictly on the file content provided
- Return valid JSON format
- Ensure all questions are unique and non-repetitive

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

🧾 Summary:
• Strictly file-based MCQs only
• Unique questions per set
• Zero repetition within or across sets
• 4 options per question
• One correct answer per question
• Fixed question format
• Multiple sets = zero overlap
• Never guess or use general training logic`;
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
