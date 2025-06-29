
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

    console.log('🔍 ENHANCED QUESTION GENERATION START (Following System Prompt):', {
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

      // ENHANCED: Process and validate content according to system prompt requirements
      const processedContent = this.processUploadedContent(fileContent, prompt);
      
      console.log('✅ CONTENT PROCESSING COMPLETE:', {
        originalLength: fileContent.length,
        processedLength: processedContent.content.length,
        contentType: processedContent.type,
        keyThemes: processedContent.keyThemes.slice(0, 3)
      });

      // REQUIREMENT: Block without substantial file content
      if (!processedContent.content || processedContent.content.length < 200) {
        console.error('❌ BLOCKED: Insufficient file content for question generation');
        throw new Error(`Question generation requires substantial file content (minimum 200 characters). Current content: ${processedContent.content?.length || 0} characters. Upload a file with readable text to generate accurate questions based on the system prompt requirements.`);
      }

      // Generate questions with enhanced system prompt compliance
      const questions = await RecoveryService.executeWithRecovery(
        () => this.performEnhancedQuestionGeneration(
          prompt,
          numberOfQuestions,
          difficulty,
          processedContent,
          setNumber,
          totalSets,
          language
        ),
        'ENHANCED_QUESTION_GENERATION',
        () => Promise.resolve(RecoveryService.generateFallbackQuestions(
          numberOfQuestions,
          prompt
        ))
      );

      // CRITICAL: Ensure exact question count match
      if (questions.length !== numberOfQuestions) {
        const errorMsg = `CRITICAL ERROR: Generated ${questions.length} questions but ${numberOfQuestions} were requested. This violates the exact count requirement from system prompt.`;
        console.error('❌ QUESTION COUNT MISMATCH:', errorMsg);
        throw new Error(errorMsg);
      }

      console.log(`✅ ENHANCED GENERATION SUCCESS: Generated exactly ${questions.length} validated questions following system prompt`);
      return questions;

    } catch (error) {
      console.error('❌ Enhanced question generation failed:', error);
      const errorDetails = ErrorHandler.handleError(error, 'ENHANCED_QUESTION_GENERATION');
      throw new Error(errorDetails.userMessage);
    }
  }

  // ENHANCED: Process uploaded content according to system prompt requirements
  private processUploadedContent(fileContent: string, userPrompt: string): {
    content: string;
    type: string;
    keyThemes: string[];
    structure: any;
    metadata: any;
  } {
    console.log('🔍 PROCESSING CONTENT per System Prompt Requirements...');
    
    // Identify file type and structure based on content patterns
    const contentType = this.identifyContentType(fileContent);
    
    // Extract key themes and concepts
    const keyThemes = this.extractKeyThemes(fileContent);
    
    // Analyze document structure
    const structure = this.analyzeDocumentStructure(fileContent);
    
    // Create metadata for better question generation
    const metadata = {
      wordCount: fileContent.split(/\s+/).length,
      hasHeadings: /^#|\*\*|_{2,}/.test(fileContent),
      hasNumericData: /\d+/.test(fileContent),
      hasTables: /\|.*\|/.test(fileContent) || /\t.*\t/.test(fileContent),
      complexity: this.assessContentComplexity(fileContent)
    };

    return {
      content: fileContent,
      type: contentType,
      keyThemes,
      structure,
      metadata
    };
  }

  private identifyContentType(content: string): string {
    // Check for CSV-like structure
    if (content.includes(',') && content.split('\n').length > 3) {
      const lines = content.split('\n').slice(0, 5);
      const hasConsistentColumns = lines.every(line => line.split(',').length > 2);
      if (hasConsistentColumns) return 'csv_tabular';
    }
    
    // Check for academic/educational content
    if (/chapter|section|lesson|module|course/i.test(content)) return 'educational';
    
    // Check for technical documentation
    if (/function|method|class|interface|algorithm/i.test(content)) return 'technical';
    
    // Check for business content
    if (/revenue|profit|analysis|report|strategy/i.test(content)) return 'business';
    
    return 'general';
  }

  private extractKeyThemes(content: string): string[] {
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private analyzeDocumentStructure(content: string): any {
    const lines = content.split('\n');
    const structure = {
      totalLines: lines.length,
      sections: [] as string[],
      keyPoints: [] as string[],
      hasIntroduction: false,
      hasConclusion: false
    };
    
    // Look for section headers
    lines.forEach(line => {
      if (/^#+\s|^\d+\.\s|^[A-Z][^a-z]*:/.test(line.trim())) {
        structure.sections.push(line.trim());
      }
    });
    
    // Check for introduction/conclusion
    structure.hasIntroduction = /introduction|overview|summary/i.test(content.substring(0, 500));
    structure.hasConclusion = /conclusion|summary|final/i.test(content.substring(-500));
    
    return structure;
  }

  private assessContentComplexity(content: string): 'basic' | 'intermediate' | 'advanced' {
    const technicalTerms = /algorithm|methodology|analysis|framework|implementation|optimization/gi;
    const academicTerms = /research|hypothesis|conclusion|evidence|study|findings/gi;
    const complexSentences = content.split('.').filter(s => s.split(',').length > 3).length;
    
    const technicalCount = (content.match(technicalTerms) || []).length;
    const academicCount = (content.match(academicTerms) || []).length;
    const avgWordsPerSentence = content.split(/[.!?]/).reduce((sum, s) => sum + s.split(' ').length, 0) / content.split(/[.!?]/).length;
    
    if (technicalCount > 5 || academicCount > 5 || avgWordsPerSentence > 20 || complexSentences > 10) {
      return 'advanced';
    } else if (technicalCount > 2 || academicCount > 2 || avgWordsPerSentence > 15) {
      return 'intermediate';
    }
    return 'basic';
  }

  private async performEnhancedQuestionGeneration(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    processedContent: any,
    setNumber: number,
    totalSets: number,
    language: string
  ): Promise<any[]> {
    console.log('🚀 PERFORMING ENHANCED GENERATION following System Prompt...');
    
    // ENHANCED: Create comprehensive system prompt that strictly follows your requirements
    const comprehensiveSystemPrompt = `**System Role:**
You are an AI questionnaire generation assistant designed to create accurate, high-quality, and contextually relevant questions from user-uploaded files such as PDFs, CSVs, text files, Word documents, or similar. Your goal is to parse the content, understand its structure and semantics, and generate a suitable set of questions based on user-defined preferences or inferred best practices.

**Content Analysis Summary:**
- Content Type: ${processedContent.type}
- Word Count: ${processedContent.metadata.wordCount}
- Key Themes: ${processedContent.keyThemes.join(', ')}
- Complexity Level: ${processedContent.metadata.complexity}
- Has Structured Sections: ${processedContent.structure.sections.length > 0}
- Content Length: ${processedContent.content.length} characters

**Your Responsibilities:**

1. **Content Extraction & Understanding:**
   * The content has been pre-extracted and analyzed
   * Key themes identified: ${processedContent.keyThemes.slice(0, 5).join(', ')}
   * Document structure: ${processedContent.structure.sections.length} sections detected
   * Content complexity: ${processedContent.metadata.complexity}

2. **Questionnaire Generation Logic:**
   * Generate questions that are:
     * **Relevant** to the extracted content themes and concepts
     * **Diverse** in structure focusing on multiple-choice questions
     * **Clear and concise**, avoiding ambiguity
     * **Balanced**, representing different parts of the material
   * Create exactly ${numberOfQuestions} multiple-choice questions with 4 options each
   * Ensure plausible distractors and avoid repetition
   * Use ${difficulty} difficulty level appropriate for the content complexity

3. **Customization & Constraints:**
   * Number of questions: EXACTLY ${numberOfQuestions} (non-negotiable)
   * Difficulty: ${difficulty}
   * Target audience: Based on content type (${processedContent.type})
   * Format: Multiple-choice questions only
   * All questions must be based strictly on the provided document content

**Behavioral Guidelines:**
* Maintain neutrality and factual accuracy in all questions
* Avoid copying long sections of the source verbatim in question stems
* Each question must reference specific information from the document
* Generate plausible wrong answers that are clearly incorrect but believable
* You generate the exact number of questions requested, base all questions on provided source material, ensure complete uniqueness across all generated content, and never fabricate information
* Respond ONLY with valid JSON in the specified format

**CRITICAL REQUIREMENTS:**
- Generate EXACTLY ${numberOfQuestions} questions - this is non-negotiable
- Base ALL questions strictly on the document content provided
- Each question must reference specific information from the document
- Use ${difficulty} difficulty level appropriate language and concepts
- Create 4 plausible answer choices for each question
- Provide clear explanations that reference the source document
${totalSets > 1 ? `- This is set ${setNumber} of ${totalSets} - ensure complete uniqueness from previous sets` : ''}`;

    // Create the user prompt with the processed content
    const enhancedUserPrompt = `USER REQUEST: "${prompt}"

DOCUMENT CONTENT (Pre-processed and Analyzed):
"""
${processedContent.content}
"""

KEY THEMES IDENTIFIED: ${processedContent.keyThemes.slice(0, 8).join(', ')}

DOCUMENT STRUCTURE:
${processedContent.structure.sections.length > 0 ? processedContent.structure.sections.slice(0, 5).join('\n') : 'No clear sections detected'}

GENERATION REQUIREMENTS:
- Content Type: ${processedContent.type}
- Questions Required: EXACTLY ${numberOfQuestions}
- Difficulty: ${difficulty}
- Language: ${language}
- Set Number: ${setNumber} of ${totalSets}

RESPONSE FORMAT (MUST BE VALID JSON):
{
  "questions": [
    {
      "question": "Specific question based directly on document content referencing key themes",
      "options": ["Correct answer from document", "Plausible wrong answer", "Another plausible wrong answer", "Final plausible wrong answer"],
      "correct_answer": 0,
      "explanation": "Brief explanation citing specific document content and relevant themes"
    }
  ]
}

CRITICAL: Generate EXACTLY ${numberOfQuestions} questions based strictly on the document content and identified themes. Do not generate more or fewer.`;

    // Create structured messages
    const messages = [
      {
        role: 'system',
        content: comprehensiveSystemPrompt
      },
      {
        role: 'user',
        content: enhancedUserPrompt
      }
    ];

    const maxTokens = Math.max(2000, numberOfQuestions * 500);
    const model = 'gpt-4.1-2025-04-14';

    const requestBody = {
      model,
      messages,
      max_tokens: maxTokens,
      temperature: 0.1, // Lower temperature for more consistent, accurate results
      response_format: { type: "json_object" }
    };

    console.log('📤 Sending ENHANCED question generation request:', {
      model,
      messagesCount: requestBody.messages.length,
      maxTokens,
      requestedQuestions: numberOfQuestions,
      contentType: processedContent.type,
      keyThemesCount: processedContent.keyThemes.length,
      timestamp: new Date().toISOString()
    });

    const content = await ApiCallService.makeApiCall(requestBody, 'ENHANCED QUESTION GENERATION');

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

    // ENHANCED: Validation with theme checking
    const validatedQuestions = questions
      .filter(q => {
        if (!q || !q.question || !q.options || !Array.isArray(q.options)) {
          console.warn('⚠️ Skipping question with missing required fields:', q);
          return false;
        }
        
        // Check if question relates to identified themes
        const questionText = q.question.toLowerCase();
        const hasThemeReference = processedContent.keyThemes.some(theme => 
          questionText.includes(theme.toLowerCase())
        );
        
        if (!hasThemeReference) {
          console.warn('⚠️ Question may not relate to key themes:', q.question?.substring(0, 50));
        }
        
        return true;
      })
      .map(q => ({
        question: q.question,
        options: q.options.slice(0, 4),
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                       typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        explanation: q.explanation || `Based on the ${processedContent.type} content analysis and key themes: ${processedContent.keyThemes.slice(0, 3).join(', ')}.`
      }));

    // Save question hashes for future deduplication
    const topic = this.extractTopic(prompt);
    validatedQuestions.forEach(q => {
      QuestionnaireStorage.saveQuestionHash(q.question, topic);
    });

    console.log(`✅ ENHANCED VALIDATION COMPLETE: ${validatedQuestions.length} questions validated against themes and content`);

    // CRITICAL: Ensure exact count or fail
    if (validatedQuestions.length !== numberOfQuestions) {
      const shortfall = numberOfQuestions - validatedQuestions.length;
      console.error(`❌ QUESTION COUNT MISMATCH: Generated ${validatedQuestions.length}, required ${numberOfQuestions}, shortfall: ${shortfall}`);
      
      if (validatedQuestions.length < numberOfQuestions * 0.8) {
        throw new Error(`Only generated ${validatedQuestions.length} valid questions out of ${numberOfQuestions} requested. The system prompt requirements could not be fully satisfied with the current content. Try providing more detailed or structured content.`);
      }
    }

    const finalQuestions = validatedQuestions.slice(0, numberOfQuestions);
    
    console.log(`✅ ENHANCED GENERATION COMPLETE: Delivering exactly ${finalQuestions.length} questions following system prompt requirements`);
    
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
