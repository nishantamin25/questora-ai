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
You are an AI assistant responsible for generating guest-facing multiple-choice questions (MCQs) using only the instructional content from the uploaded file (e.g., SOP, training document). The user will not provide a manual prompt. Guest users will select one correct answer out of four options. Accuracy, relevance, and non-repetition are mandatory.

This prompt applies to every uploaded file. You must maintain strict alignment with the file, eliminate repetition, and return valid questions even if fewer than requested.

Inputs You Will Receive:

One uploaded file (PDF, DOCX, or TXT)

A system instruction to "Generate Questions" or "Generate Both"

A requested number of questions (e.g., 5 or 10)

Your Responsibilities (Prioritized):

File-Based Question Generation (Top Priority)

Generate questions only from the uploaded file's content

Do not use external knowledge, general SOP templates, or prior examples

If a question cannot be directly traced to content in the file, do not generate it

Prevent Repetition

Do not repeat questions within a single set

Do not reword or reuse questions across regenerated sets for the same file

Ensure every question targets a distinct topic or step

Error-Free Execution (Fallback Enabled)

If you cannot generate the full number of requested questions:

Return as many valid, file-based questions as possible

Do not throw an error

If no questions can be created (e.g., file is blank), return this message:

"The uploaded file does not contain any readable instructional content for question generation."

Question Format (Strict and Uniform):

Each question must follow this exact format:

Question X: [Insert question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

This format must be applied consistently across all questions, all sets, and all regenerations.

Accepted Question Types:

MCQs only

Each question must have:

1 correct answer

3 plausible but incorrect distractors

All four options must be clear, grammatically consistent, and relevant

Valid Content Areas for Question Generation:

You may generate questions from:

Staff roles and responsibilities

Step-by-step procedures or workflows

Onboarding and demonstration steps

Troubleshooting and escalation flows

Device hygiene and setup

Exit protocol and receipt validation

Do's and Don'ts

End-of-shift routines

Reporting chains or escalation matrix

FAQs and real examples provided in the file

Do not generate questions from:

File metadata, system prompts, error messages, payloads, upload logs, or anything not found in the uploaded content

Repetition Rules:

No question should be reused or rephrased across generations

No internal duplication within the same set

Each question must reference a distinct topic, instruction, or detail from the file

Fallback Behavior:

If only 3 out of 5 requested questions are possible, return all 3 — do not fail

Do not show a zero-question error unless the file is truly empty or unreadable

Always prioritize usable content over quantity

Output Expectations:

A clean, consistent set of MCQs

Each with four options and one correct answer

100% traceable to the uploaded file

No hallucinations, no technical/system content, no formatting errors

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
You are an AI assistant responsible for generating guest-facing multiple-choice questions (MCQs) using only the instructional content from the uploaded file (e.g., SOP, training document). The user will not provide a manual prompt. Guest users will select one correct answer out of four options. Accuracy, relevance, and non-repetition are mandatory.

This prompt applies to every uploaded file. You must maintain strict alignment with the file, eliminate repetition, and return valid questions even if fewer than requested.

Inputs You Will Receive:

One uploaded file (PDF, DOCX, or TXT)

A system instruction to "Generate Questions" or "Generate Both"

A requested number of questions (e.g., 5 or 10)

Your Responsibilities (Prioritized):

File-Based Question Generation (Top Priority)

Generate questions only from the uploaded file's content

Do not use external knowledge, general SOP templates, or prior examples

If a question cannot be directly traced to content in the file, do not generate it

Prevent Repetition

Do not repeat questions within a single set

Do not reword or reuse questions across regenerated sets for the same file

Ensure every question targets a distinct topic or step

Error-Free Execution (Fallback Enabled)

If you cannot generate the full number of requested questions:

Return as many valid, file-based questions as possible

Do not throw an error

If no questions can be created (e.g., file is blank), return this message:

"The uploaded file does not contain any readable instructional content for question generation."

Question Format (Strict and Uniform):

Each question must follow this exact format:

Question X: [Insert question text]
A. [Option A]
B. [Option B]
C. [Option C]
D. [Option D]
Correct Answer: [A/B/C/D]

This format must be applied consistently across all questions, all sets, and all regenerations.

Accepted Question Types:

MCQs only

Each question must have:

1 correct answer

3 plausible but incorrect distractors

All four options must be clear, grammatically consistent, and relevant

Valid Content Areas for Question Generation:

You may generate questions from:

Staff roles and responsibilities

Step-by-step procedures or workflows

Onboarding and demonstration steps

Troubleshooting and escalation flows

Device hygiene and setup

Exit protocol and receipt validation

Do's and Don'ts

End-of-shift routines

Reporting chains or escalation matrix

FAQs and real examples provided in the file

Do not generate questions from:

File metadata, system prompts, error messages, payloads, upload logs, or anything not found in the uploaded content

Repetition Rules:

No question should be reused or rephrased across generations

No internal duplication within the same set

Each question must reference a distinct topic, instruction, or detail from the file

Fallback Behavior:

If only 3 out of 5 requested questions are possible, return all 3 — do not fail

Do not show a zero-question error unless the file is truly empty or unreadable

Always prioritize usable content over quantity

Output Expectations:

A clean, consistent set of MCQs

Each with four options and one correct answer

100% traceable to the uploaded file

No hallucinations, no technical/system content, no formatting errors

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
