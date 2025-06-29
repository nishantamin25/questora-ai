
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('🔍 EXTRACTING TEXT FROM PDF:', file.name);
    
    try {
      // Method 1: Try comprehensive PDF text extraction
      const comprehensiveContent = await this.tryComprehensivePDFExtraction(file);
      if (comprehensiveContent && comprehensiveContent.length > 500) {
        console.log('✅ Comprehensive PDF extraction successful:', comprehensiveContent.length, 'characters');
        return this.cleanExtractedText(comprehensiveContent);
      }
      
      // Method 2: Try binary search for text streams
      const binaryContent = await this.tryBinaryTextExtraction(file);
      if (binaryContent && binaryContent.length > 500) {
        console.log('✅ Binary text extraction successful:', binaryContent.length, 'characters');
        return this.cleanExtractedText(binaryContent);
      }
      
      // Method 3: Raw text search in PDF structure
      const rawContent = await this.tryRawTextSearch(file);
      if (rawContent && rawContent.length > 200) {
        console.log('✅ Raw text search successful:', rawContent.length, 'characters');
        return this.cleanExtractedText(rawContent);
      }
      
      throw new Error('Unable to extract readable text from PDF - may be image-based or encrypted');
      
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static async tryComprehensivePDFExtraction(file: File): Promise<string> {
    console.log('🔍 Attempting comprehensive PDF extraction...');
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    const pdfString = new TextDecoder('latin1').decode(uint8Array);
    
    let extractedText = '';
    
    // Look for text streams in PDF
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/gi;
    const matches = pdfString.match(streamRegex);
    
    if (matches) {
      console.log(`Found ${matches.length} PDF streams`);
      
      for (const match of matches) {
        const streamContent = match.replace(/^stream\s*/, '').replace(/\s*endstream$/, '');
        
        // Try to decode the stream content
        const decodedContent = this.decodeStreamContent(streamContent);
        if (decodedContent && decodedContent.length > 20) {
          extractedText += decodedContent + ' ';
        }
      }
    }
    
    // Also look for direct text objects
    const textObjectRegex = /BT\s+([\s\S]*?)\s+ET/gi;
    const textMatches = pdfString.match(textObjectRegex);
    
    if (textMatches) {
      console.log(`Found ${textMatches.length} text objects`);
      
      for (const textMatch of textMatches) {
        const textContent = this.extractFromTextObject(textMatch);
        if (textContent && textContent.length > 5) {
          extractedText += textContent + ' ';
        }
      }
    }
    
    console.log(`Comprehensive extraction result: ${extractedText.length} characters`);
    return extractedText;
  }
  
  private static decodeStreamContent(streamContent: string): string {
    let decoded = '';
    
    try {
      // Remove PDF operators and commands
      let cleaned = streamContent
        .replace(/\/[A-Za-z][A-Za-z0-9]*/g, '') // Remove PDF names like /Font /Type
        .replace(/\d+\.?\d*\s+/g, ' ') // Remove numbers (coordinates, etc.)
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/\[[^\]]*\]/g, ' '); // Remove arrays
      
      // Look for text in parentheses (common PDF text format)
      const parenTextRegex = /\(([^)]*)\)/g;
      let match;
      while ((match = parenTextRegex.exec(cleaned)) !== null) {
        const text = match[1];
        if (text && text.length > 2 && /[a-zA-Z]/.test(text)) {
          decoded += text + ' ';
        }
      }
      
      // Also look for text after Tj or TJ operators
      const tjRegex = /([^()]+)(?:Tj|TJ)/g;
      while ((match = tjRegex.exec(cleaned)) !== null) {
        const text = match[1].trim();
        if (text && text.length > 2 && /[a-zA-Z]/.test(text)) {
          decoded += text + ' ';
        }
      }
      
    } catch (error) {
      console.warn('Error decoding stream content:', error);
    }
    
    return decoded;
  }
  
  private static extractFromTextObject(textObject: string): string {
    let extracted = '';
    
    // Remove BT and ET markers
    const content = textObject.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
    
    // Look for text in parentheses
    const parenRegex = /\(([^)]+)\)/g;
    let match;
    while ((match = parenRegex.exec(content)) !== null) {
      const text = match[1];
      if (text && /[a-zA-Z]/.test(text)) {
        extracted += text + ' ';
      }
    }
    
    // Look for text in square brackets
    const bracketRegex = /\[([^\]]+)\]/g;
    while ((match = bracketRegex.exec(content)) !== null) {
      const text = match[1];
      if (text && /[a-zA-Z]/.test(text)) {
        extracted += text + ' ';
      }
    }
    
    return extracted;
  }
  
  private static async tryBinaryTextExtraction(file: File): Promise<string> {
    console.log('🔍 Attempting binary text extraction...');
    
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Try different encodings
    const encodings = ['utf-8', 'latin1', 'ascii'];
    let bestResult = '';
    
    for (const encoding of encodings) {
      try {
        const decoded = new TextDecoder(encoding, { fatal: false }).decode(uint8Array);
        
        // Extract readable text sequences
        const readableText = this.extractReadableSequences(decoded);
        
        if (readableText.length > bestResult.length) {
          bestResult = readableText;
        }
      } catch (error) {
        console.warn(`Failed to decode with ${encoding}:`, error);
      }
    }
    
    console.log(`Binary extraction result: ${bestResult.length} characters`);
    return bestResult;
  }
  
  private static extractReadableSequences(text: string): string {
    let extracted = '';
    
    // Find sequences of readable text (words with spaces)
    const readableRegex = /[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{10,}/g;
    const matches = text.match(readableRegex);
    
    if (matches) {
      for (const match of matches) {
        // Clean up the match
        const cleaned = match
          .replace(/[^\w\s.,!?;:'"()-]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleaned.length > 10 && this.isLikelyText(cleaned)) {
          extracted += cleaned + ' ';
        }
      }
    }
    
    return extracted;
  }
  
  private static isLikelyText(text: string): boolean {
    const words = text.split(/\s+/);
    const validWords = words.filter(word => 
      word.length >= 2 && 
      /^[A-Za-z][A-Za-z0-9]*$/.test(word)
    );
    
    // At least 60% of words should be valid English-like words
    return validWords.length / words.length >= 0.6;
  }
  
  private static async tryRawTextSearch(file: File): Promise<string> {
    console.log('🔍 Attempting raw text search...');
    
    const text = await this.readFileAsText(file);
    
    // Look for any readable text patterns in the raw content
    const textPatterns = [
      /[A-Z][a-z]+(?:\s+[A-Za-z]+){4,}/g, // Sentences starting with capital
      /(?:[A-Za-z]+\s+){5,}[A-Za-z]+/g,   // Sequences of 5+ words
      /[a-z]+(?:\s+[a-z]+){3,}/g          // Sequences of lowercase words
    ];
    
    let extracted = '';
    
    for (const pattern of textPatterns) {
      const matches = text.match(pattern);
      if (matches) {
        for (const match of matches) {
          const cleaned = match.replace(/[^\w\s.,!?;:'"()-]/g, ' ').replace(/\s+/g, ' ').trim();
          if (cleaned.length > 15 && this.isLikelyText(cleaned)) {
            extracted += cleaned + ' ';
          }
        }
      }
    }
    
    console.log(`Raw text search result: ${extracted.length} characters`);
    return extracted;
  }
  
  private static async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        resolve(e.target?.result as string || '');
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsText(file, 'UTF-8');
    });
  }
  
  private static cleanExtractedText(text: string): string {
    return text
      // Remove PDF artifacts
      .replace(/obj\s*<<.*?>>/g, ' ')
      .replace(/endobj|endstream|stream/g, ' ')
      .replace(/\/[A-Z][A-Za-z0-9]*\s*/g, ' ')
      .replace(/<<[^>]*>>/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Control characters
      .replace(/\d+\s+\d+\s+obj/g, ' ') // Object references
      .replace(/\d+\s+\d+\s+R/g, ' ')   // References
      // Clean up whitespace and punctuation
      .replace(/\s+/g, ' ')
      .replace(/\s+([.,!?;:])/g, '$1')
      .trim();
  }
}
