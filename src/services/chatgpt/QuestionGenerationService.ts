
import { LanguageService } from '../LanguageService';
import { ApiKeyManager } from './ApiKeyManager';
import { ContentValidator } from './ContentValidator';
import { PayloadValidator } from './PayloadValidator';
import { ApiCallService } from './ApiCallService';
import { InputSanitizer } from './InputSanitizer';
import { RecoveryService } from './RecoveryService';
import { ErrorHandler } from './ErrorHandler';

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

    console.log('🔍 QUESTION GENERATION START:', {
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
      // CRITICAL: Validate API key first
      if (!ApiKeyManager.hasApiKey()) {
        throw new Error('OpenAI API key not configured. Please set your API key in settings.');
      }

      // Sanitize and validate inputs
      const sanitizedPrompt = InputSanitizer.sanitizePrompt(prompt);
      const sanitizedFileContent = InputSanitizer.sanitizeFileContent(fileContent);
      const sanitizedNumberOfQuestions = InputSanitizer.sanitizeNumber(numberOfQuestions, 1, 50, 5);
      const sanitizedDifficulty = InputSanitizer.sanitizeDifficulty(difficulty);

      // ABSOLUTE REQUIREMENT: Block without substantial file content
      if (!sanitizedFileContent || sanitizedFileContent.length < 300) {
        console.error('❌ BLOCKED: Insufficient file content for question generation');
        throw new Error(`Question generation requires substantial file content (minimum 300 characters). Current content: ${sanitizedFileContent?.length || 0} characters. Upload a file with readable text to generate accurate questions.`);
      }

      // STRICT: Validate content quality
      if (!ContentValidator.validateFileContentQuality(sanitizedFileContent)) {
        console.error('❌ BLOCKED: File content quality validation failed');
        throw new Error('The file content is not suitable for question generation. Content appears corrupted, incomplete, or lacks educational substance.');
      }

      console.log('✅ VALIDATED: File content approved for strict generation');

      // MERGE: Combine prompt and file content properly
      const mergedContent = PayloadValidator.mergePromptAndFileContent(sanitizedPrompt, sanitizedFileContent);
      
      // VALIDATE: Check word count before processing
      const wordValidation = PayloadValidator.validateWordCount(mergedContent, 2000);
      if (!wordValidation.isValid) {
        throw new Error(wordValidation.error!);
      }

      console.log('✅ WORD COUNT VALIDATED:', wordValidation.wordCount, 'words');

      // Generate questions with recovery
      const questions = await RecoveryService.executeWithRecovery(
        () => this.performQuestionGeneration(
          sanitizedPrompt,
          sanitizedNumberOfQuestions,
          sanitizedDifficulty,
          sanitizedFileContent,
          setNumber,
          totalSets,
          language
        ),
        'QUESTION_GENERATION',
        () => Promise.resolve(RecoveryService.generateFallbackQuestions(
          sanitizedNumberOfQuestions,
          sanitizedPrompt
        ))
      );

      console.log(`✅ SUCCESS: Generated exactly ${questions.length} validated questions`);
      return questions;

    } catch (error) {
      console.error('❌ Question generation failed:', error);
      const errorDetails = ErrorHandler.handleError(error, 'QUESTION_GENERATION');
      throw new Error(errorDetails.userMessage);
    }
  }

  private async performQuestionGeneration(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string,
    setNumber: number,
    totalSets: number,
    language: string
  ): Promise<any[]> {
    // IMPROVED: More effective prompt that generates better aligned questions
    let strictPrompt = `You are an expert question generator. Create EXACTLY ${numberOfQuestions} multiple-choice questions based strictly on the content provided.

USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

GENERATION REQUIREMENTS:
1. Generate EXACTLY ${numberOfQuestions} questions - no more, no less
2. Base ALL questions on information explicitly present in the document above
3. Each question must test understanding of specific concepts, facts, or processes from the document
4. Use varied question types: factual recall, conceptual understanding, application, analysis
5. Create realistic distractors that are plausible but clearly incorrect
6. Difficulty level: ${difficulty}
7. Honor the user's intent: "${prompt}" while staying within document boundaries

${totalSets > 1 ? `Generate unique questions for set ${setNumber} of ${totalSets}.` : ''}

RESPONSE FORMAT (JSON ONLY):
{
  "questions": [
    {
      "question": "Specific question based on document content",
      "options": ["Correct answer from document", "Plausible incorrect option", "Another plausible incorrect option", "Final plausible incorrect option"],
      "correct_answer": 0,
      "explanation": "Brief explanation referencing specific document information"
    }
  ]
}

Generate EXACTLY ${numberOfQuestions} questions now.`;

    if (language !== 'en') {
      strictPrompt += ` Generate in ${language} language.`;
    }

    // PREPARE: Create properly structured messages
    const messages = [
      {
        role: 'system',
        content: 'You are an expert educational question generator. You create questions that are directly based on provided content, never fabricate information, and always generate the exact number requested. You focus on testing comprehension, application, and analysis of the source material. You MUST respond with valid JSON only.'
      },
      {
        role: 'user',
        content: strictPrompt
      }
    ];

    const maxTokens = Math.max(2000, numberOfQuestions * 400);
    const model = 'gpt-4.1-2025-04-14';

    // VALIDATE: Ensure payload is properly structured
    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ PAYLOAD VALIDATION FAILED:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    if (payloadValidation.error) {
      console.warn('⚠️ PAYLOAD WARNING:', payloadValidation.error);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.1, // Low temperature for consistency, slight creativity for variety
      response_format: { type: "json_object" }
    };

    console.log('📤 Sending IMPROVED question generation request...');

    const content = await ApiCallService.makeApiCall(requestBody, 'QUESTION GENERATION');

    if (!content) {
      console.error('❌ No content from OpenAI');
      throw new Error('Failed to generate questions - no AI response');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError);
      throw new Error('AI response format invalid - unable to parse JSON response');
    }

    let questions = parsedResponse.questions || [];

    if (!Array.isArray(questions)) {
      console.error('❌ Invalid response format');
      throw new Error('AI response format invalid - expected questions array');
    }

    // IMPROVED: More lenient validation that still maintains quality
    const validatedQuestions = questions
      .filter(q => q && q.question && q.options && Array.isArray(q.options))
      .filter(q => ContentValidator.strictValidateQuestionAgainstContent(q, fileContent))
      .map(q => ({
        question: q.question,
        options: q.options.slice(0, 4), // Ensure exactly 4 options
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                       typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        explanation: q.explanation || 'Based on document content.'
      }));

    console.log(`✅ VALIDATION RESULT: ${validatedQuestions.length} out of ${questions.length} questions passed validation`);

    // IMPROVED: Only require 80% success rate to account for validation strictness
    const minAcceptableQuestions = Math.max(1, Math.floor(numberOfQuestions * 0.8));
    
    if (validatedQuestions.length < minAcceptableQuestions) {
      console.error(`❌ INSUFFICIENT VALIDATED QUESTIONS: Generated ${validatedQuestions.length}, minimum required ${minAcceptableQuestions}`);
      throw new Error(`Could only generate ${validatedQuestions.length} valid questions from document content. Need at least ${minAcceptableQuestions}. The document may not contain sufficient content for the requested number of questions.`);
    }

    // If we have more than requested, return exact count
    // If we have fewer but above minimum, return what we have
    const finalQuestions = validatedQuestions.slice(0, numberOfQuestions);
    
    console.log(`✅ FINAL RESULT: Returning ${finalQuestions.length} questions (requested: ${numberOfQuestions})`);
    
    return finalQuestions;
  }
}
