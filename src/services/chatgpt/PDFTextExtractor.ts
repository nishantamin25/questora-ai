
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('🔍 PDF TEXT EXTRACTION WITH BASE64:', file.name);
    
    try {
      // Convert file to base64 for structured format
      const base64Data = await this.fileToBase64(file);
      return base64Data
      
      // Try simple text extraction first
      const text = await this.readAsText(file);
      
      if (text && text.length > 10) {
        const cleanedText = this.simpleCleanup(text);
        if (cleanedText.length > 50) {
          console.log('✅ Simple text extraction successful:', cleanedText.length, 'characters');
          return this.formatWithBase64(file.name, 'text', cleanedText, base64Data);
        }
      }
      
      // Fallback: binary extraction
      const binaryText = await this.extractFromBinary(file);
      if (binaryText && binaryText.length > 50) {
        console.log('✅ Binary extraction successful:', binaryText.length, 'characters');
        return this.formatWithBase64(file.name, 'document', binaryText, base64Data);
      }
      
      // If extraction fails, still provide base64 for ChatGPT to process
      console.log('⚠️ Text extraction minimal, providing base64 for ChatGPT processing');
      return this.formatWithBase64(file.name, 'pdf', 'Content will be processed by AI', base64Data);
      
    } catch (error) {
      console.error('❌ PDF extraction failed:', error);
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      
      reader.readAsDataURL(file);
    });
  }
  
  private static formatWithBase64(filename: string, type: string, textContent: string, base64Data: string): string {
    return `=== File: ${filename} ===
Type: ${type}
Size: ${Math.round(base64Data.length * 0.75 / 1024)}KB
Extraction Method: enhanced-with-base64
Content:
${textContent}

base64:${base64Data}

`;
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
        } else {
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
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Remove control characters
      .replace(/\s+/g, ' ') // Multiple spaces to single
      .trim();
  }
}
