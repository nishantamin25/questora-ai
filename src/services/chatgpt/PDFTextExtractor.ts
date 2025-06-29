
export class PDFTextExtractor {
  static async extractTextFromPDF(file: File): Promise<string> {
    console.log('🔍 EXTRACTING TEXT FROM PDF:', file.name);
    
    try {
      // Method 1: Try to read as text directly (for text-based PDFs)
      const textContent = await this.tryDirectTextExtraction(file);
      if (textContent && textContent.length > 200) {
        console.log('✅ Direct text extraction successful:', textContent.length, 'characters');
        return this.cleanExtractedText(textContent);
      }
      
      // Method 2: Use PDF parsing library approach
      const parsedContent = await this.tryPDFParsing(file);
      if (parsedContent && parsedContent.length > 200) {
        console.log('✅ PDF parsing successful:', parsedContent.length, 'characters');
        return this.cleanExtractedText(parsedContent);
      }
      
      throw new Error('No readable text content found in PDF');
      
    } catch (error) {
      console.error('❌ PDF text extraction failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  private static async tryDirectTextExtraction(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const result = e.target?.result as string;
        if (result) {
          // Check if we can find readable text patterns
          const textMatch = result.match(/[A-Za-z\s]{50,}/g);
          if (textMatch && textMatch.length > 0) {
            resolve(textMatch.join(' '));
          } else {
            reject(new Error('No readable text found'));
          }
        } else {
          reject(new Error('Failed to read file'));
        }
      };
      reader.onerror = () => reject(new Error('File reading failed'));
      reader.readAsText(file, 'UTF-8');
    });
  }
  
  private static async tryPDFParsing(file: File): Promise<string> {
    // Convert file to array buffer for processing
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);
    
    // Look for text patterns in PDF structure
    const pdfString = new TextDecoder('utf-8', { fatal: false }).decode(uint8Array);
    
    // Extract text between common PDF text markers
    const textPatterns = [
      /BT\s+.*?ET/gs,  // Text objects
      /\(([^)]+)\)/g,   // Text in parentheses
      /\[([^\]]+)\]/g   // Text in brackets
    ];
    
    let extractedText = '';
    
    for (const pattern of textPatterns) {
      const matches = pdfString.match(pattern);
      if (matches) {
        for (const match of matches) {
          // Clean up the matched text
          const cleaned = match
            .replace(/BT|ET|Tf|TJ|Tj/g, '') // Remove PDF operators
            .replace(/[\(\)\[\]]/g, '') // Remove brackets
            .replace(/[0-9]+\s+[0-9]+\s+[0-9]+/g, '') // Remove coordinates
            .replace(/\/[A-Za-z0-9]+/g, '') // Remove font references
            .trim();
          
          if (cleaned.length > 3 && /[A-Za-z]/.test(cleaned)) {
            extractedText += cleaned + ' ';
          }
        }
      }
    }
    
    if (extractedText.length > 100) {
      return extractedText;
    }
    
    throw new Error('Insufficient text extracted from PDF structure');
  }
  
  private static cleanExtractedText(text: string): string {
    return text
      // Remove PDF artifacts
      .replace(/obj\s*<<.*?>>/g, ' ')
      .replace(/endobj|endstream/g, ' ')
      .replace(/\/[A-Z][A-Za-z0-9]*\s*/g, ' ')
      .replace(/<<[^>]*>>/g, ' ')
      .replace(/[\x00-\x1F\x7F]/g, ' ') // Control characters
      // Clean up whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }
}
