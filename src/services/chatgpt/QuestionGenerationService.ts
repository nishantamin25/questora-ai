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

      // Check if file content looks like an error message
      if (fileContent.includes('Error: Could not process file content') || 
          fileContent.includes('PDF processing failed') ||
          fileContent.length < 200) {
        throw new Error('PDF content could not be processed. Please ensure the PDF contains readable text and try uploading again.');
      }

      console.log('📝 Using text-based question generation');
      return await this.generateQuestionsTextOnly(
        prompt,
        numberOfQuestions,
        difficulty,
        fileContent,
        setNumber,
        totalSets,
        language
      );

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

    const systemPrompt = `You are an expert question generator that creates multiple-choice questions from uploaded documents. You MUST generate EXACTLY ${numberOfQuestions} questions in JSON format.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${numberOfQuestions} questions - no more, no less
2. Base ALL questions strictly on the uploaded file content only
3. Never generate fewer questions than requested
4. If the file has limited content, create variations and different angles from available material
5. Return valid JSON format with the exact structure specified

CONTENT ACCURACY AND NON-REPETITION ENFORCEMENT:
All questions must be generated only from the instructional content in the uploaded file.

You must not guess or generate general questions. Each question must directly reference real steps, procedures, roles, rules, or examples described in the file.

Do not generate templated SOP questions unless those specific topics exist in the file.

For every question:
- Verify that it represents a unique concept or instruction from the file
- Do not reuse question stems or logic across questions in the same set
- Do not rephrase or reword previous questions in a way that makes them appear different
- If a topic has already been covered in a question, do not create a second question about it — even with different wording.

Example: If one question asks about scanning procedure, don't ask again about the same action using different phrasing.

If the same file is used in future generations, track previously used concepts and avoid repeating them.

Every new set must contain fresh, non-overlapping questions.

JSON STRUCTURE (MANDATORY):
{
  "questions": [
    {
      "question": "Question text here",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Brief explanation"
    }
  ]
}

CONTENT GUIDELINES:
- Create ${difficulty} difficulty level questions
- Use only information directly from the uploaded document
- Each question must have exactly 4 options
- correct_answer must be 0, 1, 2, or 3 (array index)
- Include brief explanations
- No duplicates or repetitive questions
- Cover different aspects of the document content

IMPORTANT: You must return exactly ${numberOfQuestions} questions. If you think there isn't enough content, create questions about procedures, rules, definitions, steps, requirements, or any factual information in the document. Use different question types: what, how, when, why, which, etc.`;

    const questionText = `Generate exactly ${numberOfQuestions} ${difficulty} difficulty questions from the uploaded file. Return valid JSON with the exact structure specified.`;

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
      max_tokens: numberOfQuestions * 300,
      temperature: 0.2,
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
    
    const systemPrompt = `You are an expert question generator that creates multiple-choice questions from provided text content. You MUST generate EXACTLY ${numberOfQuestions} questions in JSON format.

CRITICAL REQUIREMENTS:
1. Generate EXACTLY ${numberOfQuestions} questions - no more, no less
2. Base ALL questions strictly on the provided content only
3. Never generate fewer questions than requested
4. If content seems limited, extract every possible detail and create variations
5. Return valid JSON format with the exact structure specified

CONTENT ACCURACY REQUIREMENTS:
- All questions must be generated ONLY from the actual content provided
- Each question must reference specific information, procedures, steps, or facts from the text
- Do not create general knowledge questions
- Do not guess or assume information not present in the text
- Every question must be traceable to specific content in the provided text

QUESTION VARIETY REQUIREMENTS:
- Create questions about different sections/topics from the content
- Use various question types: what, how, when, where, why, which
- Focus on key procedures, important facts, specific requirements, and critical details
- Ensure each question tests a unique aspect of the content

JSON STRUCTURE (MANDATORY):
{
  "questions": [
    {
      "question": "Question text here",  
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Brief explanation referencing the specific content"
    }
  ]
}

CONTENT GUIDELINES:
- Create ${difficulty} difficulty level questions
- Use only information from the provided text
- Each question must have exactly 4 options
- correct_answer must be 0, 1, 2, or 3 (array index)
- Include brief explanations that reference the source content
- Extract questions from procedures, definitions, steps, rules, requirements, etc.

IMPORTANT: You must return exactly ${numberOfQuestions} questions. Read the content carefully and create questions that test understanding of the actual material provided.`;

    const userPrompt = `Generate exactly ${numberOfQuestions} ${difficulty} difficulty questions from this content in valid JSON format:

${fileContent}

Remember: Base all questions strictly on the content above. Return exactly ${numberOfQuestions} questions in the specified JSON structure.`;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ];

    const requestBody = {
      model: 'gpt-4.1-2025-04-14',
      messages,
      max_tokens: numberOfQuestions * 300,
      temperature: 0.1,
      response_format: { type: "json_object" }
    };

    console.log('📤 Sending content-based request to ChatGPT...');
    const content = await ApiCallService.makeApiCall(requestBody, 'CONTENT-BASED QUESTION GENERATION');

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

    console.log('🔍 Processing AI response:', {
      responseLength: content.length,
      responsePreview: content.substring(0, 200) + '...'
    });

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(content);
      console.log('✅ JSON parsed successfully:', parsedResponse);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError);
      console.error('Raw response:', content);
      throw new Error('Invalid AI response format - not valid JSON');
    }

    let questions = parsedResponse.questions || [];

    if (!Array.isArray(questions)) {
      console.error('❌ Questions is not an array:', questions);
      throw new Error('Invalid response - expected questions array');
    }

    console.log(`🔍 Found ${questions.length} questions in response`);

    // Enhanced validation and formatting
    const validQuestions = questions
      .filter(q => {
        const isValid = q && 
          q.question && 
          q.options && 
          Array.isArray(q.options) && 
          q.options.length >= 4 &&
          (typeof q.correctAnswer === 'number' || typeof q.correct_answer === 'number');
        
        if (!isValid) {
          console.warn('⚠️ Invalid question filtered out:', q);
        }
        return isValid;
      })
      .map((q, index) => {
        const correctAnswer = typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                            typeof q.correct_answer === 'number' ? q.correct_answer : 0;
        
        return {
          question: q.question,
          options: q.options.slice(0, 4), // Ensure exactly 4 options
          correctAnswer: Math.max(0, Math.min(3, correctAnswer)), // Ensure valid index
          explanation: q.explanation || 'Based on the provided content'
        };
      })
      .slice(0, numberOfQuestions);

    console.log(`✅ Processed ${validQuestions.length} valid questions from ${questions.length} total`);

    // More flexible validation - accept what we got if it's reasonable
    if (validQuestions.length === 0) {
      throw new Error('No valid questions could be extracted from AI response');
    }

    if (validQuestions.length < numberOfQuestions) {
      console.warn(`⚠️ Generated ${validQuestions.length} questions instead of ${numberOfQuestions}`);
      
      // Only throw error if we got significantly fewer questions
      if (validQuestions.length < Math.max(1, Math.floor(numberOfQuestions * 0.6))) {
        throw new Error(`Generated only ${validQuestions.length} questions, but ${numberOfQuestions} were requested. The file content may not support the requested number of questions.`);
      }
    }

    return validQuestions;
  }
}
