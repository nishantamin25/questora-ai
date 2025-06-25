
export class ContentValidator {
  // ENHANCED: Stricter content quality validation
  static validateFileContentQuality(fileContent: string): boolean {
    if (!fileContent || fileContent.length < 300) return false;

    // Check for meaningful content indicators
    const contentIndicators = [
      /\b(?:chapter|section|introduction|conclusion|summary|overview|definition|concept|principle|process|method|approach|technique|procedure|system|analysis|result|finding|example|case|data|information|research|study)\b/gi
    ];

    let indicatorCount = 0;
    contentIndicators.forEach(pattern => {
      const matches = fileContent.match(pattern);
      if (matches) indicatorCount += matches.length;
    });

    const words = fileContent.split(/\s+/).filter(word => word.length > 2);
    const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 20);

    const isValid = indicatorCount >= 5 && words.length >= 100 && sentences.length >= 5;
    
    console.log('📊 Content validation:', {
      length: fileContent.length,
      words: words.length,
      sentences: sentences.length,
      indicators: indicatorCount,
      isValid
    });

    return isValid;
  }

  // ENHANCED: Ultra-strict question validation
  static strictValidateQuestionAgainstContent(question: any, fileContent: string): boolean {
    const questionText = question.question?.toLowerCase() || '';
    const fileContentLower = fileContent.toLowerCase();

    // CRITICAL: Block fabricated educational terms
    const bannedFabricatedTerms = [
      'assessment preparation', 'assessment readiness', 'educational structure', 
      'learning structure', 'educational goals', 'learning objectives', 'academic confidence',
      'confidence-building', 'professional methodologies', 'best practices', 
      'industry standards', 'professional development', 'strategic approaches',
      'theoretical frameworks', 'advanced techniques', 'comprehensive analysis',
      'systematic evaluation', 'key learning areas', 'skill development',
      'competency building', 'knowledge assessment', 'performance evaluation',
      'progression from basic to advanced', 'purpose of learning', 'educational outcomes'
    ];

    // Reject if contains banned terms not in source
    for (const term of bannedFabricatedTerms) {
      if (questionText.includes(term) && !fileContentLower.includes(term)) {
        console.warn(`❌ REJECTED: Fabricated term "${term}":`, question.question?.substring(0, 80));
        return false;
      }
    }

    // STRICT: Question must have strong alignment with source content
    const questionWords = questionText.split(/\s+/).filter(word => word.length > 4);
    let sourceAlignmentCount = 0;
    
    for (const word of questionWords.slice(0, 15)) {
      if (fileContentLower.includes(word)) {
        sourceAlignmentCount++;
      }
    }

    const alignmentRatio = sourceAlignmentCount / Math.max(questionWords.length, 1);
    const hasStrongAlignment = alignmentRatio >= 0.4; // At least 40% word overlap

    if (!hasStrongAlignment) {
      console.warn('❌ REJECTED: Insufficient source alignment:', question.question?.substring(0, 80));
      return false;
    }

    console.log('✅ VALIDATED:', question.question?.substring(0, 80));
    return true;
  }

  static validateContentIntegrity(original: string, enhanced: string): boolean {
    if (enhanced.length > original.length * 1.5) {
      console.warn('Enhanced content significantly longer than original - potential fabrication');
      return false;
    }

    const bannedTerms = [
      'assessment preparation', 'educational structure', 'learning structure',
      'educational goals', 'academic confidence', 'confidence-building',
      'professional methodologies', 'best practices', 'industry standards',
      'strategic approaches', 'theoretical frameworks', 'comprehensive analysis',
      'systematic evaluation', 'skill development', 'competency building'
    ];

    const originalLower = original.toLowerCase();
    const enhancedLower = enhanced.toLowerCase();

    for (const term of bannedTerms) {
      if (enhancedLower.includes(term) && !originalLower.includes(term)) {
        console.warn(`Enhanced content contains fabricated term: ${term}`);
        return false;
      }
    }

    return true;
  }
}
