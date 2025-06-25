
export class ContentValidator {
  static isRealContent(content: string): boolean {
    if (!content || content.length < 100) {
      console.log('Content rejected: too short');
      return false;
    }
    
    // Check for meaningful words (not just random characters)
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /^[a-zA-Z]/.test(word)
    );
    
    const hasEnoughWords = words.length > 20; // Reduced threshold
    const hasLetters = /[a-zA-Z]/.test(content);
    const readableRatio = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length / content.length;
    
    // Check for garbage content patterns
    const hasControlChars = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/.test(content);
    const hasTooManyNumbers = (content.match(/\d/g) || []).length > content.length * 0.4;
    const hasRepeatingPatterns = /(.)\1{15,}/.test(content); // More lenient
    
    // Check for PDF garbage patterns
    const pdfGarbagePatterns = [
      /PDF-[\d.]+/,
      /%%EOF/,
      /\/Type\s*\/\w+/,
      /\/Length\s+\d+/,
      /\/Filter\s*\/\w+/,
      /stream.*?endstream/,
      /\d+\s+\d+\s+obj/,
      /endobj/,
      /xref/,
      /startxref/,
      /BT.*?ET/,
      /Td|TD|Tm|T\*|TL|Tc|Tw|Tz|Tf|Tr|Ts/
    ];

    let garbageCount = 0;
    for (const pattern of pdfGarbagePatterns) {
      if (pattern.test(content)) {
        garbageCount++;
      }
    }

    // Check for meaningful educational content indicators
    const educationalTerms = (content.match(/\b(?:chapter|section|introduction|conclusion|analysis|method|result|discussion|summary|overview|concept|principle|theory|practice|application|implementation|strategy|approach|technique|process|system|framework|model|design|development|research|study|data|information|knowledge|understanding|learning|education|training|course|lesson|topic|subject|content|material|resource|guide|manual|handbook|document|report|paper|article|book|text|definition|explanation|example|illustration|demonstration|case|scenario|problem|solution|question|answer|issue|challenge|opportunity|benefit|advantage|requirement|standard|criteria|guideline|recommendation|best|practices|methodology|procedure|step|stage|phase|level|degree|scope|range|scale|measure|metric|indicator|factor|element|component|aspect|feature|characteristic|property|quality|performance|effectiveness|efficiency|improvement|optimization|enhancement|innovation|technology|digital|platform|service|business|management|organization|operation|function|capability|capacity|resource|tool|equipment|facility|environment|condition|situation|context|background|history|evolution|development|progress|advancement|achievement|success|accomplishment|goal|objective|purpose|aim|target|mission|vision|value|benefit|impact|effect|influence|change|transformation|growth|expansion|increase|improvement|enhancement|optimization|innovation)+\b/gi) || []).length;
    
    const isValid = hasEnoughWords && 
                   hasLetters && 
                   readableRatio > 0.7 && // More lenient
                   !hasControlChars && 
                   !hasTooManyNumbers && 
                   !hasRepeatingPatterns &&
                   garbageCount < 5 && // More lenient
                   educationalTerms >= 3; // More lenient

    console.log('✅ Enhanced content validation:', { 
      length: content.length, 
      wordCount: words.length,
      hasEnoughWords, 
      hasLetters,
      readableRatio: readableRatio.toFixed(2),
      hasControlChars,
      hasTooManyNumbers,
      hasRepeatingPatterns,
      garbageCount,
      educationalTerms,
      isValid,
      preview: content.substring(0, 150) + '...'
    });
    
    return isValid;
  }
}
