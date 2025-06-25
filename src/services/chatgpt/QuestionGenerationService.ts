
import { LanguageService } from '../LanguageService';
import { ApiKeyManager } from './ApiKeyManager';
import { ContentValidator } from './ContentValidator';
import { PayloadValidator } from './PayloadValidator';

export class QuestionGenerationService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async generateQuestions(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<any[]> {
    const apiKey = ApiKeyManager.getApiKey();
    const language = LanguageService.getCurrentLanguage();

    console.log('🔍 STRICT GENERATION: Questions from file content only:', {
      prompt,
      requestedQuestions: numberOfQuestions,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets
    });

    // ABSOLUTE REQUIREMENT: Block without substantial file content
    if (!fileContent || fileContent.length < 300) {
      console.error('❌ BLOCKED: Insufficient file content for question generation');
      throw new Error(`Question generation requires substantial file content (minimum 300 characters). Current content: ${fileContent?.length || 0} characters. Upload a file with readable text to generate accurate questions.`);
    }

    // STRICT: Validate content quality
    if (!ContentValidator.validateFileContentQuality(fileContent)) {
      console.error('❌ BLOCKED: File content quality validation failed');
      throw new Error('The file content is not suitable for question generation. Content appears corrupted, incomplete, or lacks educational substance.');
    }

    console.log('✅ VALIDATED: File content approved for strict generation');

    // MERGE: Combine prompt and file content properly
    const mergedContent = PayloadValidator.mergePromptAndFileContent(prompt, fileContent);
    
    // VALIDATE: Check word count before processing
    const wordValidation = PayloadValidator.validateWordCount(mergedContent, 2000);
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ WORD COUNT VALIDATED:', wordValidation.wordCount, 'words');

    // CRITICAL: Zero-hallucination prompt with exact question count enforcement
    let strictPrompt = `USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

STRICT GENERATION RULES:
1. Generate EXACTLY ${numberOfQuestions} questions - no more, no less
2. Use ONLY information explicitly present in the document content above
3. NEVER add educational terminology like "assessment preparation", "learning structure", "educational goals", "academic confidence", "best practices", "industry standards" unless they appear in the source
4. NEVER fabricate content, frameworks, methodologies, or concepts not in the document
5. Each question must be answerable using ONLY the specific information provided
6. Honor the user's intent: "${prompt}" while staying within document boundaries

${totalSets > 1 ? `Generate unique questions for set ${setNumber} of ${totalSets}.` : ''}

RESPONSE FORMAT:
{
  "questions": [
    {
      "question": "Question based on actual document content",
      "options": ["Option from doc", "Option from doc", "Option from doc", "Option from doc"],
      "correct_answer": 0,
      "explanation": "Explanation referencing specific document information"
    }
  ]
}

Generate EXACTLY ${numberOfQuestions} questions now.`;

    if (language !== 'en') {
      strictPrompt += ` Generate in ${language}.`;
    }

    // PREPARE: Create properly structured messages
    const messages = [
      {
        role: 'system',
        content: 'You are a strict content-based question generator. You NEVER fabricate, hallucinate, or add content not present in the source. You generate EXACTLY the requested number of questions. You combine user intent with source material without adding educational fluff or generic terminology.'
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
      temperature: 0.0, // Zero creativity to prevent hallucination
      response_format: { type: "json_object" }
    };

    console.log('🔍 FINAL PAYLOAD VALIDATION:', {
      model: requestBody.model,
      messagesCount: requestBody.messages.length,
      maxTokens: requestBody.max_tokens,
      hasSystemMessage: requestBody.messages.some(m => m.role === 'system'),
      hasUserMessage: requestBody.messages.some(m => m.role === 'user'),
      allMessagesHaveContent: requestBody.messages.every(m => m.content && m.content.length > 0)
    });

    try {
      console.log('📤 Sending VALIDATED anti-hallucination request...');

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API Error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorData
        });
        throw new Error(`OpenAI API request failed: ${response.status} - ${response.statusText}. ${errorData}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('❌ No content from OpenAI');
        throw new Error('Failed to generate questions - no AI response');
      }

      const parsedResponse = JSON.parse(content);
      let questions = parsedResponse.questions || [];

      if (!Array.isArray(questions)) {
        console.error('❌ Invalid response format');
        throw new Error('AI response format invalid');
      }

      // STRICT: Validate each question against content and remove fabricated ones
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

      // CRITICAL: Enforce exact question count
      if (validatedQuestions.length < numberOfQuestions) {
        console.error(`❌ QUESTION COUNT MISMATCH: Generated ${validatedQuestions.length}, requested ${numberOfQuestions}`);
        throw new Error(`Could only generate ${validatedQuestions.length} valid questions from document content. Requested ${numberOfQuestions}. The document may not contain sufficient content for the requested number of questions.`);
      }

      const finalQuestions = validatedQuestions.slice(0, numberOfQuestions);
      
      console.log(`✅ SUCCESS: Generated exactly ${finalQuestions.length} validated questions`);
      return finalQuestions;

    } catch (error) {
      console.error('❌ Question generation failed:', error);
      throw error;
    }
  }
}
