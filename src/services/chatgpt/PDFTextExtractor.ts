
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('🔍 SIMPLE PDF TEXT EXTRACTION:', file.name);
    
    try {
      // Try simple text extraction first
      const text = await this.readAsText(file);
      
      if (text && text.length > 50) {
        const cleanedText = this.simpleCleanup(text);
        if (cleanedText.length > 100) {
          console.log('✅ Simple text extraction successful:', cleanedText.length, 'characters');
          return cleanedText;
        }
      }
      
      // Fallback: binary extraction
      const binaryText = await this.extractFromBinary(file);
      if (binaryText && binaryText.length > 100) {
        console.log('✅ Binary extraction successful:', binaryText.length, 'characters');
        return binaryText;
      }
      
      throw new Error('Could not extract sufficient text from PDF');
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static async readAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result || '');
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read file as text'));
      };
      
      reader.readAsText(file, 'utf-8');
    });
  }
  
  private static async extractFromBinary(file: File): Promise<string> {
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let text = '';
      for (let i = 0; i < uint8Array.length; i++) {
        const char = uint8Array[i];
        if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
          text += String.fromCharCode(char);
        } else if (char === 9) { // Tab character
          text += ' ';
        }
      }
      
      return this.simpleCleanup(text);
    } catch (error) {
      console.error('Binary extraction failed:', error);
      return '';
    }
  }
  
  private static simpleCleanup(text: string): string {
    return text
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ') // Remove control characters except \n, \r, \t
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .replace(/\s*\n\s*/g, '\n') // Clean up line breaks
      .trim();
  }
}
