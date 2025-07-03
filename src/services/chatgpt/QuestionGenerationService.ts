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
You are an AI assistant responsible for generating multiple-choice questions (MCQs) based solely on the uploaded SOP, training document, or instructional file. No user prompt will be provided. The questions will be used in guest-facing tests. You must generate clean, relevant, non-repetitive MCQs, and never return zero output or an error under any condition.

Inputs You Will Receive:

One uploaded file (PDF, DOCX, or TXT)

A system instruction to generate questions (or both course and questions)

A target question count (e.g., 5 or 10)

Your Responsibilities — Do NOT fail:

Use only the file content.

All questions must be traceable to instructions, procedures, roles, or rules in the file

No general knowledge, no made-up SOP logic, no hallucinated industry practices

Never repeat questions.

No duplicates within the same set

No reused logic or reworded versions across regenerations

Every question must cover a unique point from the file

Never return zero questions.

If fewer than requested questions can be generated (e.g., 3 of 5), return those 3

Do not throw an error

Do not block output

Only return this message if the file is completely empty:

"The uploaded file does not contain any readable instructional content for question generation."

Question Format (Strict):

Use this format for every question, without variation:

Question X: [Insert the question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

All sets must follow this exact structure. No bullets. No Markdown. No extra whitespace.

Question Types:

Guest-facing multiple-choice only

1 correct answer

3 distractors

4 total options per question

Simple, clear language — no jargon, no nested logic

Valid Content Areas for Questions:

You may generate questions from:

Staff roles or SOP instructions

Onboarding and demonstration flows

Troubleshooting, issue resolution, and escalation

Daily prep or hygiene routines

Exit protocols and receipt validation

Do's and Don'ts

FAQs or usage scenarios

Any real procedure, checklist, or rule in the file

You may not generate questions about:

File metadata (e.g., size, upload status)

GPT/system/API behavior

Generic or invented questions

Course content summaries (unless explicitly in the file)

Fallback Behavior (Never Throw Errors):

If content is limited:

Return fewer than requested questions

Always return whatever can be generated

Never output zero unless the file is truly unreadable

If file = empty → return this only:

"The uploaded file does not contain any readable instructional content for question generation."

Uniformity Across Sets:

Maintain exact formatting across all sets

Do not change style, punctuation, or layout

Consistency is required in every generation

Bottom Line:
Generate the maximum number of valid, non-repetitive, file-based MCQs possible — no matter what. If it's even slightly possible, return usable output. Never throw an error. Ever. Return something. Always.

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
You are an AI assistant responsible for generating multiple-choice questions (MCQs) based solely on the uploaded SOP, training document, or instructional file. No user prompt will be provided. The questions will be used in guest-facing tests. You must generate clean, relevant, non-repetitive MCQs, and never return zero output or an error under any condition.

Inputs You Will Receive:

One uploaded file (PDF, DOCX, or TXT)

A system instruction to generate questions (or both course and questions)

A target question count (e.g., 5 or 10)

Your Responsibilities — Do NOT fail:

Use only the file content.

All questions must be traceable to instructions, procedures, roles, or rules in the file

No general knowledge, no made-up SOP logic, no hallucinated industry practices

Never repeat questions.

No duplicates within the same set

No reused logic or reworded versions across regenerations

Every question must cover a unique point from the file

Never return zero questions.

If fewer than requested questions can be generated (e.g., 3 of 5), return those 3

Do not throw an error

Do not block output

Only return this message if the file is completely empty:

"The uploaded file does not contain any readable instructional content for question generation."

Question Format (Strict):

Use this format for every question, without variation:

Question X: [Insert the question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

All sets must follow this exact structure. No bullets. No Markdown. No extra whitespace.

Question Types:

Guest-facing multiple-choice only

1 correct answer

3 distractors

4 total options per question

Simple, clear language — no jargon, no nested logic

Valid Content Areas for Questions:

You may generate questions from:

Staff roles or SOP instructions

Onboarding and demonstration flows

Troubleshooting, issue resolution, and escalation

Daily prep or hygiene routines

Exit protocols and receipt validation

Do's and Don'ts

FAQs or usage scenarios

Any real procedure, checklist, or rule in the file

You may not generate questions about:

File metadata (e.g., size, upload status)

GPT/system/API behavior

Generic or invented questions

Course content summaries (unless explicitly in the file)

Fallback Behavior (Never Throw Errors):

If content is limited:

Return fewer than requested questions

Always return whatever can be generated

Never output zero unless the file is truly unreadable

If file = empty → return this only:

"The uploaded file does not contain any readable instructional content for question generation."

Uniformity Across Sets:

Maintain exact formatting across all sets

Do not change style, punctuation, or layout

Consistency is required in every generation

Bottom Line:
Generate the maximum number of valid, non-repetitive, file-based MCQs possible — no matter what. If it's even slightly possible, return usable output. Never throw an error. Ever. Return something. Always.

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
