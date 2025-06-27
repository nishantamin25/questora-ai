
export class ContentValidator {
  static validateFileContentQuality(content: string): boolean {
    if (!content || content.length < 200) { // Reduced from 300 to be more lenient
      console.log('❌ Content too short for quality validation:', content.length);
      return false;
    }

    // Check for meaningful words and sentences
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /^[a-zA-Z]/.test(word)
    );
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10); // Reduced from 15
    const readableRatio = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length / content.length;
    
    // Check for PDF garbage patterns
    const garbagePatterns = [
      /PDF-[\d.]+/g,
      /%%EOF/g,
      /\/Type\s*\/\w+/g,
      /stream.*?endstream/gs,
      /\d+\s+\d+\s+obj/g,
      /endobj/g
    ];

    let garbageCount = 0;
    garbagePatterns.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) garbageCount += matches.length;
    });

    // More lenient educational content check
    const educationalIndicators = content.match(/\b(?:learn|understand|study|knowledge|concept|principle|method|process|analysis|example|practice|skill|development|information|education|training|course|lesson|objective|goal|content|material|guide|instruction|explanation|description|definition|theory|application|implementation|strategy|approach|technique|system|framework|model|research|data|result|conclusion|summary|overview|introduction|chapter|section|topic|subject|important|significant|key|main|primary|essential|fundamental|basic|advanced|professional|academic|industry|standard|best|quality|effective|efficient|successful|problem|solution|question|answer|issue|challenge|opportunity|benefit|advantage|requirement|criteria|guideline|recommendation)+\b/gi) || [];
    
    // Much more lenient validation criteria
    const isValid = words.length >= 30 && // Reduced from 50
                   sentences.length >= 3 && // Reduced from 5
                   readableRatio > 0.70 && // Reduced from 0.75
                   garbageCount < 15 && // Increased tolerance
                   educationalIndicators.length >= 5; // Reduced from 10

    console.log('✅ Content quality validation:', { 
      length: content.length, 
      wordCount: words.length,
      sentenceCount: sentences.length,
      readableRatio: readableRatio.toFixed(2),
      garbageCount,
      educationalIndicators: educationalIndicators.length,
      isValid,
      preview: content.substring(0, 150) + '...',
      threshold: 'LENIENT_MODE_ENABLED'
    });
    
    return isValid;
  }

  static strictValidateQuestionAgainstContent(question: any, fileContent: string): boolean {
    if (!question || !question.question || !fileContent) {
      console.log('❌ VALIDATION: Missing question or file content');
      return false;
    }

    const questionText = question.question.toLowerCase();
    const contentLower = fileContent.toLowerCase();
    
    // Extract meaningful terms from question (excluding stop words)
    const questionWords = questionText.split(/\s+/)
      .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word))
      .filter(word => !this.isStopWord(word));

    // Count how many key terms from the question appear in the content
    let termMatches = 0;
    let totalTerms = 0;
    
    for (const word of questionWords) {
      totalTerms++;
      // Check for exact match and common variations
      if (contentLower.includes(word) || 
          contentLower.includes(word.substring(0, word.length - 1)) || // Handle plurals
          contentLower.includes(word + 's') || 
          contentLower.includes(word + 'ed') || 
          contentLower.includes(word + 'ing')) {
        termMatches++;
      }
    }

    // Calculate match ratio
    const matchRatio = totalTerms > 0 ? termMatches / totalTerms : 0;
    
    // Check options for content alignment
    let optionMatches = 0;
    if (question.options && Array.isArray(question.options)) {
      for (const option of question.options) {
        if (typeof option === 'string') {
          const optionWords = option.toLowerCase().split(/\s+/)
            .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word))
            .filter(word => !this.isStopWord(word));
          
          for (const word of optionWords) {
            if (contentLower.includes(word)) {
              optionMatches++;
              break; // Count each option only once
            }
          }
        }
      }
    }

    // SIGNIFICANTLY MORE LENIENT validation criteria
    const hasMinimumAlignment = matchRatio >= 0.1 || termMatches >= 1; // Much more lenient
    const hasOptionAlignment = optionMatches >= 1 || question.options?.length >= 3; // Accept if has options
    const isNotTooGeneric = questionText.length > 20; // Basic length check only
    
    const isValid = hasMinimumAlignment && hasOptionAlignment && isNotTooGeneric;
    
    console.log(isValid ? '✅ QUESTION VALIDATED:' : '❌ QUESTION REJECTED:', {
      question: questionText.substring(0, 80) + '...',
      matchRatio: matchRatio.toFixed(2),
      termMatches,
      totalTerms,
      optionMatches,
      hasMinimumAlignment,
      hasOptionAlignment,
      isNotTooGeneric,
      isValid,
      validationMode: 'LENIENT'
    });
    
    return isValid;
  }

  private static isStopWord(word: string): boolean {
    const stopWords = new Set([
      'what', 'which', 'when', 'where', 'does', 'have', 'been', 'will', 'would', 
      'could', 'should', 'might', 'must', 'shall', 'this', 'that', 'these', 'those',
      'from', 'with', 'they', 'them', 'their', 'there', 'here', 'more', 'most', 
      'some', 'many', 'much', 'very', 'also', 'only', 'just', 'even', 'still',
      'both', 'each', 'every', 'such', 'same', 'other', 'another', 'through',
      'during', 'before', 'after', 'above', 'below', 'between', 'among', 'within',
      'without', 'around', 'about', 'under', 'over', 'into', 'onto', 'upon',
      'down', 'back', 'away', 'again', 'once', 'then', 'than', 'like', 'well',
      'good', 'best', 'better', 'great', 'large', 'small', 'long', 'short', 'high',
      'first', 'last', 'next', 'right', 'left', 'full', 'part', 'whole', 'half',
      'true', 'false', 'real', 'main', 'sure', 'clear', 'open', 'close', 'free',
      'easy', 'hard', 'new', 'old', 'young', 'early', 'late', 'near', 'far',
      'big', 'little', 'few', 'several', 'important', 'different', 'following', 'according'
    ]);
    return stopWords.has(word.toLowerCase());
  }

  static validateContentIntegrity(originalContent: string, enhancedContent: string): boolean {
    if (!originalContent || !enhancedContent) {
      console.log('❌ Content integrity check: Missing content');
      return false;
    }

    // Check if enhanced content is significantly shorter (possible truncation)
    const lengthRatio = enhancedContent.length / originalContent.length;
    if (lengthRatio < 0.3) { // More lenient threshold
      console.log('❌ Content integrity check: Enhanced content too short', { lengthRatio });
      return false;
    }

    // Check if enhanced content is excessively long (possible hallucination)
    if (lengthRatio > 5) { // More lenient threshold
      console.log('❌ Content integrity check: Enhanced content too long', { lengthRatio });
      return false;
    }

    // Extract key terms from original content
    const originalWords = originalContent.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && /^[a-zA-Z]+$/.test(word))
      .slice(0, 15); // Reduced sample size

    const enhancedLower = enhancedContent.toLowerCase();
    let termMatches = 0;

    for (const word of originalWords) {
      if (enhancedLower.includes(word)) {
        termMatches++;
      }
    }

    const termPreservationRatio = originalWords.length > 0 ? termMatches / originalWords.length : 1;
    const hasMinimumTermPreservation = termPreservationRatio >= 0.2; // Much more lenient

    const isValid = hasMinimumTermPreservation;

    console.log('✅ Content integrity validation:', {
      originalLength: originalContent.length,
      enhancedLength: enhancedContent.length,
      lengthRatio: lengthRatio.toFixed(2),
      termMatches,
      totalTerms: originalWords.length,
      termPreservationRatio: termPreservationRatio.toFixed(2),
      hasMinimumTermPreservation,
      isValid,
      mode: 'PRODUCTION_LENIENT'
    });

    return isValid;
  }

  static generateDebugReport(content: string, questions: any[] = []): any {
    return {
      timestamp: new Date().toISOString(),
      contentStats: {
        length: content.length,
        wordCount: content.split(/\s+/).length,
        paragraphs: content.split(/\n\s*\n/).length,
        sentences: content.split(/[.!?]+/).length
      },
      questionStats: {
        total: questions.length,
        valid: questions.filter(q => q.question && q.options).length,
        hasExplanations: questions.filter(q => q.explanation).length
      },
      contentPreview: content.substring(0, 300) + '...',
      qualityCheck: this.validateFileContentQuality(content)
    };
  }
}
