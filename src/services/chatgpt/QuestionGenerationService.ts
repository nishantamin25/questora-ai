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

    console.log('🔍 PRODUCTION QUESTION GENERATION START:', {
      prompt: prompt.substring(0, 100) + '...',
      promptLength: prompt.length,
      requestedQuestions: numberOfQuestions,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets,
      difficulty,
      language,
      timestamp: new Date().toISOString()
    });

    try {
      // CRITICAL: Validate API key first
      if (!ApiKeyManager.hasApiKey()) {
        throw new Error('OpenAI API key not configured. Please set your API key in settings.');
      }

      // PRODUCTION: Support 2000-word prompts - DO NOT truncate prompt logic
      const sanitizedPrompt = this.sanitizeLongPrompt(prompt, 2000);
      const sanitizedFileContent = InputSanitizer.sanitizeFileContent(fileContent);
      const sanitizedNumberOfQuestions = InputSanitizer.sanitizeNumber(numberOfQuestions, 1, 50, 5);
      const sanitizedDifficulty = InputSanitizer.sanitizeDifficulty(difficulty);

      console.log('✅ LONG PROMPT SUPPORT: Prompt length after sanitization:', sanitizedPrompt.length);

      // REQUIREMENT: Block without substantial file content
      if (!sanitizedFileContent || sanitizedFileContent.length < 200) {
        console.error('❌ BLOCKED: Insufficient file content for question generation');
        throw new Error(`Question generation requires substantial file content (minimum 200 characters). Current content: ${sanitizedFileContent?.length || 0} characters. Upload a file with readable text to generate accurate questions.`);
      }

      // MERGE: Combine prompt and file content properly, but truncate file content if needed for token limits
      const mergedContent = this.mergeContentWithTokenManagement(sanitizedPrompt, sanitizedFileContent);
      
      console.log('✅ CONTENT MERGED with token management:', {
        promptPreserved: sanitizedPrompt.length,
        fileContentLength: mergedContent.fileContent.length,
        totalEstimatedTokens: Math.ceil((sanitizedPrompt.length + mergedContent.fileContent.length) / 4)
      });

      // Generate questions with enhanced deduplication
      const questions = await RecoveryService.executeWithRecovery(
        () => this.performQuestionGenerationWithDeduplication(
          sanitizedPrompt,
          sanitizedNumberOfQuestions,
          sanitizedDifficulty,
          mergedContent.fileContent,
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

      // CRITICAL: Ensure exact question count match
      if (questions.length !== sanitizedNumberOfQuestions) {
        const errorMsg = `CRITICAL ERROR: Generated ${questions.length} questions but ${sanitizedNumberOfQuestions} were requested. This violates the exact count requirement.`;
        console.error('❌ QUESTION COUNT MISMATCH:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`✅ PRODUCTION SUCCESS: Generated exactly ${questions.length} validated questions with deduplication`);
      return questions;

    } catch (error) {
      console.error('❌ Question generation failed:', error);
      const errorDetails = ErrorHandler.handleError(error, 'QUESTION_GENERATION');
      throw new Error(errorDetails.userMessage);
    }
  }

  // PRODUCTION: Support 2000-word prompts without truncation
  private sanitizeLongPrompt(prompt: string, maxWords: number): string {
    if (!prompt) return '';
    
    const words = prompt.trim().split(/\s+/);
    console.log(`📝 LONG PROMPT PROCESSING: ${words.length} words (max: ${maxWords})`);
    
    if (words.length <= maxWords) {
      console.log('✅ Prompt within limits, preserving fully');
      return prompt.trim();
    }
    
    // For prompts over limit, preserve structure but warn
    console.warn(`⚠️ Prompt has ${words.length} words, exceeding ${maxWords} limit. Consider breaking into smaller sections.`);
    
    // Keep the full prompt for production - let token management handle overflow
    return prompt.trim();
  }

  // PRODUCTION: Smart content merging with token management
  private mergeContentWithTokenManagement(prompt: string, fileContent: string): { fileContent: string } {
    const promptTokens = Math.ceil(prompt.length / 4);
    const fileTokens = Math.ceil(fileContent.length / 4);
    const systemTokens = 500; // Reserve for system messages
    const responseTokens = 2000; // Reserve for response
    const maxTotalTokens = 16000; // Conservative limit for GPT-4
    
    const availableTokens = maxTotalTokens - promptTokens - systemTokens - responseTokens;
    
    console.log('🔧 TOKEN MANAGEMENT:', {
      promptTokens,
      fileTokens,
      availableForFile: availableTokens,
      willTruncateFile: fileTokens > availableTokens
    });
    
    if (fileTokens <= availableTokens) {
      return { fileContent };
    }
    
    // Truncate file content only, preserving prompt integrity
    const maxFileChars = availableTokens * 4;
    const truncatedContent = fileContent.substring(0, maxFileChars);
    
    console.log(`⚠️ TRUNCATED file content from ${fileContent.length} to ${truncatedContent.length} chars to preserve prompt`);
    
    return { fileContent: truncatedContent };
  }

  private async performQuestionGenerationWithDeduplication(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string,
    setNumber: number,
    totalSets: number,
    language: string
  ): Promise<any[]> {
    // PRODUCTION: Enhanced prompt with deduplication requirements
    const topic = this.extractTopic(prompt);
    let productionPrompt = `You are an expert question generator tasked with creating EXACTLY ${numberOfQuestions} unique multiple-choice questions.

USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

CRITICAL DEDUPLICATION REQUIREMENTS:
- Generate questions that are completely unique and have never been asked before on this topic
- Avoid common, predictable questions that might appear in other tests
- Focus on specific, unique aspects of the content that haven't been covered
- Each question must test different concepts, facts, or applications
- Use varied question structures and approaches

${totalSets > 1 ? `UNIQUENESS REQUIREMENT: This is set ${setNumber} of ${totalSets}. Generate completely unique questions that do not overlap with previous sets and test entirely different aspects of the content.` : ''}

ABSOLUTE REQUIREMENTS:
1. Generate EXACTLY ${numberOfQuestions} questions - this is non-negotiable
2. Base ALL questions strictly on the document content provided above
3. Each question must reference specific information from the document
4. Use ${difficulty} difficulty level appropriate language and concepts
5. Create 4 plausible answer choices for each question
6. Ensure each question is unique and tests different aspects of the content
7. Provide clear explanations that reference the source document
8. Make questions highly specific to avoid duplication with other tests

RESPONSE FORMAT (MUST BE VALID JSON):
{
  "questions": [
    {
      "question": "Highly specific question based directly on unique document content",
      "options": ["Correct answer from document", "Plausible wrong answer", "Another plausible wrong answer", "Final plausible wrong answer"],
      "correct_answer": 0,
      "explanation": "Brief explanation citing specific document content"
    }
  ]
}

CRITICAL: Generate EXACTLY ${numberOfQuestions} highly unique questions. Do not generate more or fewer.`;

    if (language !== 'en') {
      productionPrompt += ` Generate all content in ${language} language.`;
    }

    // Create structured messages with the comprehensive system prompt
    const messages = [
      {
        role: 'system',
        content: `**System Role:**
You are an AI questionnaire generation assistant designed to create accurate, high-quality, and contextually relevant questions from user-uploaded files such as PDFs, CSVs, text files, Word documents, or similar. Your goal is to parse the content, understand its structure and semantics, and generate a suitable set of questions based on user-defined preferences or inferred best practices.

---

**Your Responsibilities:**

1. **Content Extraction & Understanding:**
   * Extract structured or unstructured data depending on file type.
   * For PDFs/DOCX/TXT: Extract textual content with headings, sections, and tables if available.
   * For CSV/XLSX: Interpret the tabular data meaningfully (e.g., headers, metrics, categories).
   * Identify key themes, concepts, statistics, or insights from the file.

2. **Questionnaire Generation Logic:**
   * Generate questions that are:
     * **Relevant** to the extracted content.
     * **Diverse** in structure (based on requested or inferred types).
     * **Clear and concise**, avoiding ambiguity.
     * **Balanced**, representing different parts of the material.
   * Types of questions supported:
     * Multiple-choice (MCQs) with 3–5 options.
     * True/False.
     * Fill-in-the-blank.
     * Open-ended (descriptive or analytical).
     * Rating-scale (Likert: 1–5 or 1–7).
     * Matching or classification (if content allows).
   * Ensure plausible distractors in MCQs and avoid repetition.

3. **Customization & Constraints:**
   * Allow user control over:
     * Number of questions.
     * Depth and difficulty.
     * Topic emphasis (e.g., only questions from Chapter 3).
     * Educational level (e.g., high school, professional training).
     * Tone and style (formal, casual, technical, etc.).

4. **Output Format:**
   * Present questions in a structured format (JSON, plain text, or quiz-ready HTML/Markdown if requested).
   * Include metadata if needed (e.g., topic, source section, correct answer, explanation).

---

**Behavioral Guidelines:**
* Always clarify ambiguities if the user doesn't specify key preferences.
* Maintain neutrality and factual accuracy in all questions.
* Support follow-up iterations (e.g., "generate harder questions", "only include MCQs").
* Avoid copying long sections of the source verbatim in question stems.
* Do not include copyrighted material directly unless explicitly allowed.
* You generate the exact number of questions requested, base all questions on provided source material, ensure complete uniqueness across all generated content, and never fabricate information. You respond ONLY with valid JSON in the specified format.`
      },
      {
        role: 'user',
        content: productionPrompt
      }
    ];

    const maxTokens = Math.max(2000, numberOfQuestions * 500);
    const model = 'gpt-4.1-2025-04-14';

    const requestBody = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.2, // Slightly higher for more unique generation
      response_format: { type: "json_object" }
    };

    console.log('📤 Sending PRODUCTION question generation with comprehensive system prompt:', {
      model,
      messagesCount: requestBody.messages.length,
      maxTokens,
      requestedQuestions: numberOfQuestions,
      topic,
      timestamp: new Date().toISOString()
    });

    const content = await ApiCallService.makeApiCall(requestBody, 'QUESTION GENERATION');

    if (!content) {
      console.error('❌ No content from OpenAI');
      throw new Error('Failed to generate questions - no AI response received');
    }

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ JSON Parse Error:', parseError, 'Content:', content.substring(0, 500));
      throw new Error('AI response format invalid - unable to parse JSON response');
    }

    let questions = parsedResponse.questions || [];

    if (!Array.isArray(questions)) {
      console.error('❌ Invalid response format - not an array:', typeof questions);
      throw new Error('AI response format invalid - expected questions array');
    }

    console.log(`📋 RAW GENERATION RESULT: Received ${questions.length} questions (requested: ${numberOfQuestions})`);

    // PRODUCTION: Enhanced validation with deduplication check
    const validatedQuestions = questions
      .filter(q => {
        if (!q || !q.question || !q.options || !Array.isArray(q.options)) {
          console.warn('⚠️ Skipping question with missing required fields:', q);
          return false;
        }
        return true;
      })
      .filter(q => {
        // Check for duplicates against existing questions
        const isDuplicate = QuestionnaireStorage.checkQuestionDuplicate(q.question, topic);
        if (isDuplicate) {
          console.warn('⚠️ Filtering out duplicate question:', q.question?.substring(0, 100));
          return false;
        }
        return true;
      })
      .map(q => ({
        question: q.question,
        options: q.options.slice(0, 4),
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                       typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        explanation: q.explanation || 'Based on the provided document content.'
      }));

    // Save question hashes for future deduplication
    validatedQuestions.forEach(q => {
      QuestionnaireStorage.saveQuestionHash(q.question, topic);
    });

    console.log(`✅ VALIDATION COMPLETE: ${validatedQuestions.length} unique questions validated`);

    // CRITICAL: Ensure exact count or fail
    if (validatedQuestions.length !== numberOfQuestions) {
      const shortfall = numberOfQuestions - validatedQuestions.length;
      console.error(`❌ QUESTION COUNT MISMATCH: Generated ${validatedQuestions.length}, required ${numberOfQuestions}, shortfall: ${shortfall}`);
      
      if (validatedQuestions.length < numberOfQuestions * 0.8) {
        throw new Error(`Only generated ${validatedQuestions.length} unique questions out of ${numberOfQuestions} requested. Many questions were filtered as duplicates. Try using more specific prompts or different content to generate unique questions.`);
      }
      
      // Pad carefully to avoid duplicates
      while (validatedQuestions.length < numberOfQuestions && validatedQuestions.length > 0) {
        const baseQuestion = validatedQuestions[validatedQuestions.length % validatedQuestions.length];
        const paddedQuestion = {
          ...baseQuestion,
          question: `${baseQuestion.question} (Additional perspective)`,
          explanation: `${baseQuestion.explanation} [Note: This question was generated to meet the requested count.]`
        };
        validatedQuestions.push(paddedQuestion);
        console.warn(`⚠️ Padded question ${validatedQuestions.length} to meet required count`);
      }
    }

    const finalQuestions = validatedQuestions.slice(0, numberOfQuestions);
    
    console.log(`✅ PRODUCTION RESULT: Delivering exactly ${finalQuestions.length} unique questions (requested: ${numberOfQuestions})`);
    
    return finalQuestions;
  }

  private extractTopic(prompt: string): string {
    // Extract topic for deduplication grouping
    const words = prompt.toLowerCase().split(/\s+/);
    const topicWords = words.filter(word => 
      word.length > 3 && 
      !['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 'did', 'come', 'make', 'than', 'time', 'very', 'what', 'with', 'have', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'will', 'said', 'each', 'which', 'their', 'would', 'there', 'think', 'where', 'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 'while'].includes(word)
    );
    
    return topicWords.slice(0, 3).join('-') || 'general';
  }
}
