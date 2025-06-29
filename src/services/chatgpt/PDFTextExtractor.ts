
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('🔍 EXTRACTING TEXT FROM PDF:', file.name);
    
    try {
      // Method 1: Try to read PDF as text using FileReader with different encodings
      const extractedText = await this.tryMultipleEncodingExtraction(file);
      
      if (extractedText && extractedText.length > 100) {
        console.log('✅ PDF text extraction successful:', extractedText.length, 'characters');
        return this.cleanExtractedText(extractedText);
      }
      
      // Method 2: Try binary approach as fallback
      const binaryText = await this.tryBinaryExtraction(file);
      if (binaryText && binaryText.length > 100) {
        console.log('✅ Binary extraction successful:', binaryText.length, 'characters');
        return this.cleanExtractedText(binaryText);
      }
      
      throw new Error('Unable to extract readable text from PDF - may be image-based, encrypted, or corrupted');
      
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static async tryMultipleEncodingExtraction(file: File): Promise<string> {
    console.log('🔍 Attempting multiple encoding extraction...');
    
    const encodings = ['utf-8', 'latin1', 'ascii', 'utf-16'];
    let bestResult = '';
    
    for (const encoding of encodings) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const decoder = new TextDecoder(encoding, { fatal: false });
        const decoded = decoder.decode(arrayBuffer);
        
        // Look for readable text patterns
        const readableText = this.extractReadableContent(decoded);
        
        if (readableText.length > bestResult.length) {
          bestResult = readableText;
          console.log(`Better result with ${encoding}: ${readableText.length} chars`);
        }
      } catch (error) {
        console.warn(`Encoding ${encoding} failed:`, error);
      }
    }
    
    return bestResult;
  }
  
  private static extractReadableContent(text: string): string {
    let extractedText = '';
    
    // Method 1: Look for text between parentheses (common in PDFs)
    const parenMatches = text.match(/\(([^)]{3,})\)/g);
    if (parenMatches) {
      parenMatches.forEach(match => {
        const content = match.slice(1, -1); // Remove parentheses
        if (this.isReadableText(content)) {
          extractedText += content + ' ';
        }
      });
    }
    
    // Method 2: Look for text after common PDF operators
    const tjMatches = text.match(/\(([^)]+)\)\s*Tj/g);
    if (tjMatches) {
      tjMatches.forEach(match => {
        const content = match.match(/\(([^)]+)\)/)?.[1];
        if (content && this.isReadableText(content)) {
          extractedText += content + ' ';
        }
      });
    }
    
    // Method 3: Look for sequences of readable characters
    const readableSequences = text.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{15,}/g);
    if (readableSequences) {
      readableSequences.forEach(sequence => {
        const cleaned = sequence.replace(/[^\w\s.,!?;:'"()-]/g, ' ').trim();
        if (cleaned.length > 10 && this.isReadableText(cleaned)) {
          extractedText += cleaned + ' ';
        }
      });
    }
    
    // Method 4: Try to find text objects between BT and ET
    const textObjects = text.match(/BT\s+([\s\S]*?)\s+ET/g);
    if (textObjects) {
      textObjects.forEach(obj => {
        const content = obj.replace(/^BT\s*/, '').replace(/\s*ET$/, '');
        const parenText = content.match(/\(([^)]+)\)/g);
        if (parenText) {
          parenText.forEach(p => {
            const inner = p.slice(1, -1);
            if (this.isReadableText(inner)) {
              extractedText += inner + ' ';
            }
          });
        }
      });
    }
    
    return extractedText;
  }
  
  private static isReadableText(text: string): boolean {
    if (!text || text.length < 3) return false;
    
    // Check if text contains mostly readable characters
    const readableChars = text.match(/[A-Za-z0-9\s.,!?;:'"()-]/g);
    if (!readableChars) return false;
    
    const readableRatio = readableChars.length / text.length;
    if (readableRatio < 0.7) return false;
    
    // Check for actual words (not just symbols)
    const words = text.split(/\s+/).filter(word => /^[A-Za-z]{2,}$/.test(word));
    return words.length >= 1; // At least one proper word
  }
  
  private static async tryBinaryExtraction(file: File): Promise<string> {
    console.log('🔍 Attempting binary extraction as fallback...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to string and look for text patterns
      let binaryString = '';
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i];
        // Only include printable ASCII characters
        if (char >= 32 && char <= 126) {
          binaryString += String.fromCharCode(char);
        } else if (char === 10 || char === 13) {
          binaryString += ' '; // Convert line breaks to spaces
        }
      }
      
      // Extract meaningful text sequences
      const meaningfulText = binaryString.match(/[A-Za-z][A-Za-z0-9\s.,!?;:'"()-]{10,}/g);
      if (meaningfulText) {
        return meaningfulText.join(' ');
      }
      
      return '';
    } catch (error) {
      console.warn('Binary extraction failed:', error);
      return '';
    }
  }
  
  private static cleanExtractedText(text: string): string {
    return text
      // Remove PDF artifacts and commands
      .replace(/\/[A-Z][A-Za-z0-9]*\s*/g, ' ') // PDF commands like /Font
      .replace(/\d+\s+\d+\s+obj/g, ' ') // Object references
      .replace(/\d+\s+\d+\s+R/g, ' ') // References
      .replace(/<<[^>]*>>/g, ' ') // Dictionaries
      .replace(/endobj|endstream|stream/g, ' ') // PDF keywords
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Control characters
      // Clean up text formatting
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s+([.,!?;:])/g, '$1') // Fix punctuation spacing
      .trim();
  }
}
