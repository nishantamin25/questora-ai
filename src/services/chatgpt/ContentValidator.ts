export class ContentValidator {
  static validateFileContentQuality(content: string): boolean {
    if (!content || content.length < 300) {
      console.log('❌ Content too short for quality validation');
      return false;
    }

    // Check for meaningful words and sentences
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /^[a-zA-Z]/.test(word)
    );
    
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 15);
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

    // Check for educational content indicators
    const educationalIndicators = content.match(/\b(?:learn|understand|study|knowledge|concept|principle|method|process|analysis|example|practice|skill|development|information|education|training|course|lesson|objective|goal|content|material|guide|instruction|explanation|description|definition|theory|application|implementation|strategy|approach|technique|system|framework|model|research|data|result|conclusion|summary|overview|introduction|chapter|section|topic|subject|important|significant|key|main|primary|essential|fundamental|basic|advanced|professional|academic|industry|standard|best|quality|effective|efficient|successful|problem|solution|question|answer|issue|challenge|opportunity|benefit|advantage|requirement|criteria|guideline|recommendation|consideration|factor|element|aspect|feature|characteristic|property|function|operation|procedure|step|stage|phase|level|degree|structure|organization|management|administration|planning|design|development|improvement|enhancement|innovation|technology|business|service|customer|user|market|value|performance|measurement|evaluation|assessment|monitoring|control|documentation|report|document|file|record|archive|reference|source|resource|tool|equipment|facility|environment|condition|situation|context|background|history|current|present|future|trend|pattern|relationship|connection|interaction|collaboration|coordination|integration|communication|presentation|demonstration|illustration|comparison|contrast|discussion|debate|argument|position|perspective|viewpoint|opinion|interpretation|reasoning)+\b/gi) || [];
    
    const isValid = words.length >= 50 && 
                   sentences.length >= 5 && 
                   readableRatio > 0.75 &&
                   garbageCount < 10 &&
                   educationalIndicators.length >= 10;

    console.log('✅ Enhanced content validation:', { 
      length: content.length, 
      wordCount: words.length,
      sentenceCount: sentences.length,
      readableRatio: readableRatio.toFixed(2),
      garbageCount,
      educationalIndicators: educationalIndicators.length,
      isValid,
      preview: content.substring(0, 200) + '...'
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
    
    // Enhanced validation: Check if question concepts exist in content
    const questionWords = questionText.split(/\s+/)
      .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word))
      .filter(word => !['what', 'which', 'when', 'where', 'does', 'have', 'been', 'will', 'would', 'could', 'should', 'might', 'must', 'shall', 'this', 'that', 'these', 'those', 'from', 'with', 'they', 'them', 'their', 'there', 'here', 'more', 'most', 'some', 'many', 'much', 'very', 'also', 'only', 'just', 'even', 'still', 'both', 'each', 'every', 'such', 'same', 'other', 'another', 'through', 'during', 'before', 'after', 'above', 'below', 'between', 'among', 'within', 'without', 'around', 'about', 'under', 'over', 'into', 'onto', 'upon', 'down', 'back', 'away', 'again', 'once', 'then', 'than', 'like', 'well', 'good', 'best', 'better', 'great', 'large', 'small', 'long', 'short', 'high', 'first', 'last', 'next', 'right', 'left', 'full', 'part', 'whole', 'half', 'true', 'false', 'real', 'main', 'sure', 'clear', 'open', 'close', 'free', 'easy', 'hard', 'new', 'old', 'young', 'early', 'late', 'near', 'far', 'big', 'little', 'few', 'several', 'important', 'different', 'following', 'according'].includes(word));

    // Count how many key terms from the question appear in the content
    let termMatches = 0;
    let totalTerms = 0;
    
    for (const word of questionWords) {
      totalTerms++;
      if (contentLower.includes(word) || 
          contentLower.includes(word.substring(0, -1)) || // Handle plurals
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
            .filter(word => word.length > 3 && /^[a-zA-Z]+$/.test(word));
          
          for (const word of optionWords) {
            if (contentLower.includes(word)) {
              optionMatches++;
              break; // Count each option only once
            }
          }
        }
      }
    }

    // More flexible validation criteria
    const hasMinimumAlignment = matchRatio >= 0.15; // At least 15% of question terms should appear in content
    const hasOptionAlignment = optionMatches >= 1; // At least one option should relate to content
    const isNotTooGeneric = !questionText.match(/^(what is|which of|how do|when did|where is|why does).{0,20}(the|a|an)\s+(concept|principle|method|approach|strategy|framework|system|process|technique|application|implementation|development|management|organization|analysis|evaluation|assessment|measurement|planning|design|structure|function|operation|procedure|improvement|enhancement|innovation|technology|business|service|performance|quality|standard|practice|guideline|recommendation)(\s|$|\?)/);
    
    const isValid = hasMinimumAlignment && hasOptionAlignment && isNotTooGeneric;
    
    console.log(isValid ? '✅ VALIDATED:' : '❌ REJECTED:', {
      question: questionText.substring(0, 60) + '...',
      matchRatio: matchRatio.toFixed(2),
      termMatches,
      totalTerms,
      optionMatches,
      hasMinimumAlignment,
      hasOptionAlignment,
      isNotTooGeneric,
      isValid
    });
    
    return isValid;
  }

  static validateContentIntegrity(originalContent: string, enhancedContent: string): boolean {
    if (!originalContent || !enhancedContent) {
      console.log('❌ Content integrity check: Missing content');
      return false;
    }

    // Check if enhanced content is significantly shorter (possible truncation)
    const lengthRatio = enhancedContent.length / originalContent.length;
    if (lengthRatio < 0.5) {
      console.log('❌ Content integrity check: Enhanced content too short', { lengthRatio });
      return false;
    }

    // Check if enhanced content is excessively long (possible hallucination)
    if (lengthRatio > 3) {
      console.log('❌ Content integrity check: Enhanced content too long', { lengthRatio });
      return false;
    }

    // Extract key terms from original content
    const originalWords = originalContent.toLowerCase()
      .split(/\s+/)
      .filter(word => word.length > 4 && /^[a-zA-Z]+$/.test(word))
      .slice(0, 20); // Check top 20 key terms

    const enhancedLower = enhancedContent.toLowerCase();
    let termMatches = 0;

    for (const word of originalWords) {
      if (enhancedLower.includes(word)) {
        termMatches++;
      }
    }

    const termPreservationRatio = originalWords.length > 0 ? termMatches / originalWords.length : 1;
    const hasMinimumTermPreservation = termPreservationRatio >= 0.4; // At least 40% of key terms preserved

    const isValid = hasMinimumTermPreservation;

    console.log('✅ Content integrity validation:', {
      originalLength: originalContent.length,
      enhancedLength: enhancedContent.length,
      lengthRatio: lengthRatio.toFixed(2),
      termMatches,
      totalTerms: originalWords.length,
      termPreservationRatio: termPreservationRatio.toFixed(2),
      hasMinimumTermPreservation,
      isValid
    });

    return isValid;
  }
}
