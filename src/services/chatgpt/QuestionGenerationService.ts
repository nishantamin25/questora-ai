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

      // ENHANCED: More lenient content validation for improved PDF extraction
      const contentValidation = this.validateContentQuality(fileContent);
      if (!contentValidation.isValid) {
        console.error('❌ CONTENT QUALITY VALIDATION FAILED:', contentValidation.reason);
        throw new Error(`Content quality validation failed: ${contentValidation.reason}. The uploaded file appears to contain corrupted or unreadable data. Please upload a file with clear, readable text content.`);
      }

      // ENHANCED: Process and validate content according to system prompt requirements
      const processedContent = this.processUploadedContent(fileContent, prompt);
      
      console.log('✅ CONTENT PROCESSING COMPLETE:', {
        originalLength: fileContent.length,
        processedLength: processedContent.content.length,
        contentType: processedContent.type,
        keyThemes: processedContent.keyThemes.slice(0, 3),
        isEducationallyViable: this.assessEducationalViability(processedContent.content)
      });

      // UPDATED: Even more reasonable content requirement (reduced from 100 to 50)
      if (!processedContent.content || processedContent.content.length < 50 || !this.assessEducationalViability(processedContent.content)) {
        console.error('❌ BLOCKED: Insufficient educational content for question generation');
        throw new Error(`Question generation requires readable educational content (minimum 50 characters with educational value). Current content: ${processedContent.content?.length || 0} characters. The content appears to be corrupted, binary data, or lacks educational substance. Please upload a file with clear educational text.`);
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

  // UPDATED: More lenient content quality validation
  private validateContentQuality(fileContent: string): { isValid: boolean; reason: string } {
    if (!fileContent || fileContent.length < 20) {
      return { isValid: false, reason: 'Content is empty or too short' };
    }

    // Check for binary/corrupted data patterns that got through file processing
    const corruptionIndicators = [
      /obj\s*<<.*?>>/g, // PDF object patterns
      /endobj|endstream/g, // PDF structure markers
      /^\*[0-9]+&/gm, // Binary markers
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, // Control characters
    ];

    let corruptedCharCount = 0;
    let totalMatches = 0;

    for (const pattern of corruptionIndicators) {
      const matches = fileContent.match(pattern);
      if (matches) {
        totalMatches += matches.length;
        corruptedCharCount += matches.join('').length;
      }
    }

    const corruptionRatio = corruptedCharCount / fileContent.length;
    
    // UPDATED: Even more lenient - if more than 70% of content appears corrupted (was 50%)
    if (corruptionRatio > 0.7) {
      return { 
        isValid: false, 
        reason: `Content appears heavily corrupted (${(corruptionRatio * 100).toFixed(1)}% corruption detected). This looks like binary data or PDF artifacts rather than readable text.` 
      };
    }

    // UPDATED: More lenient pattern matching (increased threshold from 100 to 200)
    if (totalMatches > 200) {
      return { 
        isValid: false, 
        reason: `Content contains too many technical/binary patterns (${totalMatches} patterns found). This appears to be raw file data rather than educational text.` 
      };
    }

    return { isValid: true, reason: 'Content quality is acceptable' };
  }

  // UPDATED: Even more lenient educational viability assessment
  private assessEducationalViability(content: string): boolean {
    if (!content || content.length < 30) {
      return false;
    }

    // Count readable words (at least 2 characters, only letters)
    const readableWords = content.split(/\s+/).filter(word => 
      /^[A-Za-z]{2,}$/.test(word)
    );

    const readableWordRatio = readableWords.length / content.split(/\s+/).length;
    
    // UPDATED: Even more lenient - at least 20% of words should be readable (was 30%)
    if (readableWordRatio < 0.2) {
      console.log(`Low readable word ratio: ${(readableWordRatio * 100).toFixed(1)}%`);
      return false;
    }

    // Check for sentence-like structures
    const sentences = content.split(/[.!?]+/).filter(s => 
      s.trim().length > 3 && /[A-Za-z]/.test(s)
    );

    // UPDATED: Accept any content that has readable words, even without proper sentences
    return readableWords.length >= 3; // At least 3 readable words
  }

  private processUploadedContent(fileContent: string, userPrompt: string): {
    content: string;
    type: string;
    keyThemes: string[];
    structure: any;
    metadata: any;
  } {
    console.log('🔍 PROCESSING CONTENT per System Prompt Requirements...');
    
    // Clean the content first - remove obvious corruption artifacts
    const cleanedContent = this.cleanCorruptedContent(fileContent);
    
    // Identify file type and structure based on content patterns
    const contentType = this.identifyContentType(cleanedContent);
    
    // Extract key themes and concepts
    const keyThemes = this.extractKeyThemes(cleanedContent);
    
    // Analyze document structure
    const structure = this.analyzeDocumentStructure(cleanedContent);
    
    // Create metadata for better question generation
    const metadata = {
      wordCount: cleanedContent.split(/\s+/).length,
      hasHeadings: /^#|\*\*|_{2,}/.test(cleanedContent),
      hasNumericData: /\d+/.test(cleanedContent),
      hasTables: /\|.*\|/.test(cleanedContent) || /\t.*\t/.test(cleanedContent),
      complexity: this.assessContentComplexity(cleanedContent)
    };

    return {
      content: cleanedContent,
      type: contentType,
      keyThemes,
      structure,
      metadata
    };
  }

  private cleanCorruptedContent(content: string): string {
    // Remove obvious PDF artifacts and binary patterns
    let cleaned = content
      .replace(/obj\s*<<.*?>>/g, ' ') // PDF objects
      .replace(/endobj|endstream/g, ' ') // PDF markers
      .replace(/^\*[0-9]+&.*$/gm, ' ') // Binary lines
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Control characters
      .replace(/\/[A-Z][A-Za-z0-9]*\s+/g, ' ') // PDF commands like /Font /Type
      .replace(/<<[^>]*>>/g, ' ') // PDF dictionaries
      .replace(/\s+/g, ' ') // Multiple spaces
      .trim();

    // If cleaned content is too short, return original (might be legitimate technical content)
    if (cleaned.length < content.length * 0.1) {
      return content;
    }

    return cleaned;
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
    // Focus on extracting readable words only
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => 
        word.length > 4 && 
        /^[a-z]+$/.test(word) && // Only alphabetic words
        !this.isStopWord(word)
      );
    
    const wordCount: { [key: string]: number } = {};
    words.forEach(word => {
      wordCount[word] = (wordCount[word] || 0) + 1;
    });
    
    return Object.entries(wordCount)
      .filter(([, count]) => count >= 2) // Must appear at least twice
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private isStopWord(word: string): boolean {
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 
      'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'who', 'boy', 
      'did', 'come', 'make', 'than', 'time', 'very', 'what', 'with', 'have', 
      'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'will', 
      'said', 'each', 'which', 'their', 'would', 'there', 'think', 'where', 
      'being', 'every', 'great', 'might', 'shall', 'still', 'those', 'under', 
      'while', 'could', 'should', 'through', 'during', 'before', 'after', 
      'above', 'below', 'between', 'among', 'within'
    ]);
    
    return stopWords.has(word);
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
    
    // Look for section headers - only clean, readable ones
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.length > 5 && trimmed.length < 100) {
        if (/^#+\s[A-Za-z]/.test(trimmed) || // Markdown headers
            /^\d+\.\s[A-Za-z]/.test(trimmed) || // Numbered sections
            /^[A-Z][A-Za-z\s]{5,50}:$/.test(trimmed)) { // Title case headers with colon
          structure.sections.push(trimmed);
        }
      }
    });
    
    // Check for introduction/conclusion in clean text only
    const cleanStart = content.substring(0, 500).toLowerCase();
    const cleanEnd = content.substring(content.length - 500).toLowerCase();
    
    structure.hasIntroduction = /\b(introduction|overview|summary)\b/.test(cleanStart);
    structure.hasConclusion = /\b(conclusion|summary|final)\b/.test(cleanEnd);
    
    return structure;
  }

  private assessContentComplexity(content: string): 'basic' | 'intermediate' | 'advanced' {
    // Only assess complexity on readable content
    const readableContent = content.replace(/[^\w\s.,!?;:]/g, ' ').replace(/\s+/g, ' ');
    
    const technicalTerms = /\b(algorithm|methodology|analysis|framework|implementation|optimization)\b/gi;
    const academicTerms = /\b(research|hypothesis|conclusion|evidence|study|findings)\b/gi;
    
    const technicalCount = (readableContent.match(technicalTerms) || []).length;
    const academicCount = (readableContent.match(academicTerms) || []).length;
    
    const sentences = readableContent.split(/[.!?]/).filter(s => s.trim().length > 10);
    const avgWordsPerSentence = sentences.length > 0 ? 
      sentences.reduce((sum, s) => sum + s.split(' ').length, 0) / sentences.length : 0;
    
    if (technicalCount > 5 || academicCount > 5 || avgWordsPerSentence > 20) {
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
    
    // ENHANCED: Create comprehensive system prompt with content validation
    const comprehensiveSystemPrompt = `**System Role:**
You are an AI questionnaire generation assistant designed to create accurate, high-quality, and contextually relevant questions from user-uploaded educational content. You MUST generate questions based STRICTLY on the provided document content.

**CRITICAL CONTENT VALIDATION:**
The content has been pre-validated and cleaned to ensure educational quality:
- Content Type: ${processedContent.type}
- Word Count: ${processedContent.metadata.wordCount}
- Key Educational Themes: ${processedContent.keyThemes.join(', ')}
- Complexity Level: ${processedContent.metadata.complexity}
- Document Structure: ${processedContent.structure.sections.length} clear sections identified

**STRICT REQUIREMENTS:**
1. Generate EXACTLY ${numberOfQuestions} multiple-choice questions - this is non-negotiable
2. Base ALL questions strictly on the provided document content - do NOT add external knowledge
3. Each question must reference specific information from the document
4. Use ${difficulty} difficulty level appropriate for the content complexity
5. Create 4 plausible answer choices for each question
6. Ensure the correct answer is clearly identifiable from the document content
7. All questions must be unique and cover different aspects of the content

**Question Quality Standards:**
- Questions must be clear, specific, and unambiguous
- Incorrect options must be plausible but clearly wrong based on the document
- Avoid questions that require external knowledge not in the document
- Focus on key concepts, important details, and relationships presented in the content
- Ensure questions test comprehension, not just memorization

**Response Format (MUST BE VALID JSON):**
{
  "questions": [
    {
      "question": "Clear question based directly on document content",
      "options": ["Correct answer from document", "Plausible wrong answer", "Another wrong answer", "Final wrong answer"],
      "correct_answer": 0,
      "explanation": "Brief explanation citing specific document content"
    }
  ]
}

**CRITICAL:** You must generate exactly ${numberOfQuestions} questions. No more, no fewer.`;

    // Create the user prompt with the cleaned and validated content
    const enhancedUserPrompt = `USER REQUEST: "${prompt}"

VALIDATED DOCUMENT CONTENT:
"""
${processedContent.content}
"""

KEY EDUCATIONAL THEMES: ${processedContent.keyThemes.slice(0, 8).join(', ')}

DOCUMENT STRUCTURE:
${processedContent.structure.sections.length > 0 ? processedContent.structure.sections.slice(0, 5).join('\n') : 'Content organized in paragraphs without clear section headers'}

GENERATION REQUIREMENTS:
- Questions Required: EXACTLY ${numberOfQuestions}
- Difficulty: ${difficulty}
- Language: ${language}
- Content Type: ${processedContent.type}
- Set Number: ${setNumber} of ${totalSets}

Generate exactly ${numberOfQuestions} questions based strictly on the provided document content.`;

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
      contentWordCount: processedContent.metadata.wordCount,
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

    // ENHANCED: Validation with content relevance checking
    const validatedQuestions = questions
      .filter(q => {
        if (!q || !q.question || !q.options || !Array.isArray(q.options)) {
          console.warn('⚠️ Skipping question with missing required fields:', q);
          return false;
        }
        
        // Check if question relates to processed content themes
        const questionText = q.question.toLowerCase();
        const hasThemeReference = processedContent.keyThemes.some(theme => 
          questionText.includes(theme.toLowerCase())
        );
        
        // Also check if question contains words from the content
        const contentWords = processedContent.content.toLowerCase().split(/\s+/);
        const questionWords = questionText.split(/\s+/);
        const wordOverlap = questionWords.filter(word => 
          word.length > 3 && contentWords.includes(word)
        ).length;
        
        if (!hasThemeReference && wordOverlap < 2) {
          console.warn('⚠️ Question may not be based on document content:', q.question?.substring(0, 50));
          return false;
        }
        
        return true;
      })
      .map(q => ({
        question: q.question,
        options: q.options.slice(0, 4),
        correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                       typeof q.correct_answer === 'number' ? q.correct_answer : 0,
        explanation: q.explanation || `Based on the document content analysis focusing on: ${processedContent.keyThemes.slice(0, 3).join(', ')}.`
      }));

    // Save question hashes for future deduplication
    const topic = this.extractTopic(prompt);
    validatedQuestions.forEach(q => {
      QuestionnaireStorage.saveQuestionHash(q.question, topic);
    });

    console.log(`✅ ENHANCED VALIDATION COMPLETE: ${validatedQuestions.length} questions validated against document content`);

    // CRITICAL: Ensure exact count or fail
    if (validatedQuestions.length !== numberOfQuestions) {
      const shortfall = numberOfQuestions - validatedQuestions.length;
      console.error(`❌ QUESTION COUNT MISMATCH: Generated ${validatedQuestions.length}, required ${numberOfQuestions}, shortfall: ${shortfall}`);
      
      if (validatedQuestions.length < numberOfQuestions * 0.8) {
        throw new Error(`Only generated ${validatedQuestions.length} valid questions out of ${numberOfQuestions} requested. The questions may not be sufficiently based on the document content or the content may not support ${numberOfQuestions} distinct questions. Try reducing the number of questions or providing more comprehensive content.`);
      }
    }

    const finalQuestions = validatedQuestions.slice(0, numberOfQuestions);
    
    console.log(`✅ ENHANCED GENERATION COMPLETE: Delivering exactly ${finalQuestions.length} questions based on document content`);
    
    return finalQuestions;
  }

  private extractTopic(prompt: string): string {
    // Extract topic for deduplication grouping
    const words = prompt.toLowerCase().split(/\s+/);
    const topicWords = words.filter(word => 
      word.length > 3 && !this.isStopWord(word)
    );
    
    return topicWords.slice(0, 3).join('-') || 'general';
  }
}
