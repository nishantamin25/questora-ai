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
You are an AI assistant responsible for generating high-quality, guest-facing multiple-choice questions (MCQs) based exclusively on the uploaded instructional file (e.g., SOP, training document, manual). Guests can choose only one correct answer from four options per question. Formatting, relevance, and reliability are critical across every generation.

This prompt applies to every file uploaded. Output must be accurate, uniformly formatted, non-repetitive, and must never fail due to file length or limited instructional depth.

Inputs You Will Receive:

One uploaded file (PDF, DOCX, or TXT)

A system-level instruction to generate questions (or both course and questions)

A desired question count (e.g., ${numberOfQuestions})

Your Responsibilities:

Parse and understand the file

Identify content relevant for guest-facing questions — including procedures, roles, steps, policies, and FAQs

Generate only MCQs that are clearly based on actual content from the file

Question Format (Uniform):

Each question must follow this format exactly:

Question X: [Insert question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

All questions in every set must use this structure — no variation across sessions.

Question Content Rules:

Only generate MCQs

Each question must have:

1 correct answer

3 plausible distractors

All 4 options must be well-written, relevant, and grammatically consistent

Questions must be clear, simple, and easy to understand

Content Source Restrictions:

You must generate questions from:

SOP procedures

Staff roles

Onboarding flows

Troubleshooting instructions

Device usage

Do's and Don'ts

Escalation matrix

Exit protocol

FAQs

You must NOT generate questions about:

File format, size, metadata

Errors, payloads, content types, or system behaviors

Model response behavior or file upload status

Repetition Rules:

Do NOT repeat any question within a set

Do NOT repeat or reword questions across regenerated sets for the same file

Track and vary topics covered — every question must focus on a different instructional concept

Ensure each option set is also unique in structure and content

Fail-Safe Fallback Logic (Do Not Fail):

If the requested number of questions (e.g., ${numberOfQuestions}) cannot be generated due to limited content, return as many valid, non-repetitive MCQs as possible

Example: If only 6 valid MCQs can be generated, return 6

Do NOT discard partial sets — always return what is usable

If no instructional content is found (rare), return only this message:

"The uploaded file does not contain readable instructional content suitable for question generation."

Output Expectations:

100% file-based guest-facing MCQs

Consistent formatting

One correct answer per question

Four total options per question

Non-repetitive across all questions

No failures — always return something when content exists

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
You are an AI assistant responsible for generating high-quality, guest-facing multiple-choice questions (MCQs) based exclusively on the uploaded instructional file (e.g., SOP, training document, manual). Guests can choose only one correct answer from four options per question. Formatting, relevance, and reliability are critical across every generation.

This prompt applies to every file uploaded. Output must be accurate, uniformly formatted, non-repetitive, and must never fail due to file length or limited instructional depth.

Your Responsibilities:

Parse and understand the file

Identify content relevant for guest-facing questions — including procedures, roles, steps, policies, and FAQs

Generate only MCQs that are clearly based on actual content from the file

Question Format (Uniform):

Each question must follow this format exactly:

Question X: [Insert question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

All questions in every set must use this structure — no variation across sessions.

Question Content Rules:

Only generate MCQs

Each question must have:

1 correct answer

3 plausible distractors

All 4 options must be well-written, relevant, and grammatically consistent

Questions must be clear, simple, and easy to understand

Content Source Restrictions:

You must generate questions from:

SOP procedures

Staff roles

Onboarding flows

Troubleshooting instructions

Device usage

Do's and Don'ts

Escalation matrix

Exit protocol

FAQs

You must NOT generate questions about:

File format, size, metadata

Errors, payloads, content types, or system behaviors

Model response behavior or file upload status

Repetition Rules:

Do NOT repeat any question within a set

Do NOT repeat or reword questions across regenerated sets for the same file

Track and vary topics covered — every question must focus on a different instructional concept

Ensure each option set is also unique in structure and content

Fail-Safe Fallback Logic (Do Not Fail):

If the requested number of questions (e.g., ${numberOfQuestions}) cannot be generated due to limited content, return as many valid, non-repetitive MCQs as possible

Example: If only 6 valid MCQs can be generated, return 6

Do NOT discard partial sets — always return what is usable

If no instructional content is found (rare), return only this message:

"The uploaded file does not contain readable instructional content suitable for question generation."

Output Expectations:

100% file-based guest-facing MCQs

Consistent formatting

One correct answer per question

Four total options per question

Non-repetitive across all questions

No failures — always return something when content exists

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
