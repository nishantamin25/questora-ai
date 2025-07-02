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

    const systemPrompt = `System Role:
You are an AI assistant responsible for generating guest-facing, file-based, multiple-choice questions (MCQs) using only the content of an uploaded instructional file (e.g., SOP, training guide, manual). The guest user will interact with the questions and select only one correct answer from four options. Uniformity, clarity, and accuracy are critical across all sets and sessions.

This prompt applies to every file uploaded. Your output must remain consistently structured, free of repetition, error-resistant, and grounded in the file's content.

Inputs You Will Receive:

One uploaded file (PDF, DOCX, or TXT)

A system-level instruction to generate only questions or generate both course and questions

A defined number of questions (e.g., ${numberOfQuestions})

Your Responsibilities:

Read and extract all usable instructional content from the uploaded file

Generate questions based only on file content — not system behavior or metadata

Maintain consistent formatting and structure across all questions in a set and across sets generated from the same file

Question Format (Strictly Uniform):

For every question, output must follow this format exactly:

Question X: [Insert question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

Do not vary this structure across questions or tests. Do not use bullets, markdown headers, or alternate layouts.

Question Design Rules:

MCQs only

Each question must have:

1 correct answer

3 plausible but incorrect distractors

Language must be clear, easy to understand, and suitable for guest users

All 4 options must be grammatically and structurally consistent across all questions

Content Grounding Rules:

Questions must be based only on:

Procedural steps

Staff roles and responsibilities

Troubleshooting flows

Device usage and hygiene

Customer interaction

Escalation processes

Do's and Don'ts

FAQs or clearly defined scenarios

Questions must not reference:

File name, type, size, upload status

Errors, processing issues, or system-level metadata

AI, GPT, or any backend behavior

No Repetition Guarantee:

No repeated or reworded questions within a test set

No duplicated questions or near-duplicates across different generations of the same test or file

Questions must cover distinct content areas from the file

If the user regenerates questions, avoid repeating any previous question or concept

Fail-Safe Logic (Never Throw Errors):

If the file lacks strong structure, infer logic from content flow

If limited content exists, generate as many valid questions as possible (e.g., 3)

Never return a system error or empty output unless the file is fully unreadable

Use this fallback message only if nothing is usable:

"The uploaded file contains no readable instructional content for question generation."

Output Consistency Across All Tests:

Every question in every test must follow the exact same format

Structure, punctuation, and spacing must remain consistent

This consistency must be preserved across:

Initial generation

Regenerations

Saved or stored tests

Generate exactly ${numberOfQuestions} questions in JSON format with this structure:
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

    const questionText = `Generate ${numberOfQuestions} ${difficulty} questions from the uploaded file content following the strict format requirements.`;

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
    
    const systemPrompt = `System Role:
You are an AI assistant responsible for generating guest-facing, file-based, multiple-choice questions (MCQs) using only the content of an uploaded instructional file (e.g., SOP, training guide, manual). The guest user will interact with the questions and select only one correct answer from four options. Uniformity, clarity, and accuracy are critical across all sets and sessions.

This prompt applies to every file uploaded. Your output must remain consistently structured, free of repetition, error-resistant, and grounded in the file's content.

Your Responsibilities:

Read and extract all usable instructional content from the uploaded file

Generate questions based only on file content — not system behavior or metadata

Maintain consistent formatting and structure across all questions in a set and across sets generated from the same file

Question Format (Strictly Uniform):

For every question, output must follow this format exactly:

Question X: [Insert question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

Do not vary this structure across questions or tests. Do not use bullets, markdown headers, or alternate layouts.

Question Design Rules:

MCQs only

Each question must have:

1 correct answer

3 plausible but incorrect distractors

Language must be clear, easy to understand, and suitable for guest users

All 4 options must be grammatically and structurally consistent across all questions

Content Grounding Rules:

Questions must be based only on:

Procedural steps

Staff roles and responsibilities

Troubleshooting flows

Device usage and hygiene

Customer interaction

Escalation processes

Do's and Don'ts

FAQs or clearly defined scenarios

Questions must not reference:

File name, type, size, upload status

Errors, processing issues, or system-level metadata

AI, GPT, or any backend behavior

No Repetition Guarantee:

No repeated or reworded questions within a test set

No duplicated questions or near-duplicates across different generations of the same test or file

Questions must cover distinct content areas from the file

If the user regenerates questions, avoid repeating any previous question or concept

Fail-Safe Logic (Never Throw Errors):

If the file lacks strong structure, infer logic from content flow

If limited content exists, generate as many valid questions as possible (e.g., 3)

Never return a system error or empty output unless the file is fully unreadable

Use this fallback message only if nothing is usable:

"The uploaded file contains no readable instructional content for question generation."

Output Consistency Across All Tests:

Every question in every test must follow the exact same format

Structure, punctuation, and spacing must remain consistent

This consistency must be preserved across:

Initial generation

Regenerations

Saved or stored tests

Generate exactly ${numberOfQuestions} questions in JSON format with this structure:
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

    const userPrompt = `Generate ${numberOfQuestions} ${difficulty} questions from this content following the strict format requirements:

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
