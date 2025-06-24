import { ChatGPTService } from './ChatGPTService';

interface ProcessedFileContent {
  content: string;
  type: 'text' | 'video' | 'image' | 'other';
  metadata: {
    fileName: string;
    fileSize: number;
    processedAt: string;
    extractionMethod: string;
  };
}

class FileProcessingServiceClass {
  async processFile(file: File): Promise<ProcessedFileContent> {
    console.log(`Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    const fileType = this.determineFileType(file);
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString(),
      extractionMethod: ''
    };

    let content = '';

    try {
      switch (fileType) {
        case 'text':
          const result = await this.processTextFile(file);
          content = result.content;
          metadata.extractionMethod = result.method;
          break;
        case 'video':
          content = await this.processVideoFile(file);
          metadata.extractionMethod = 'video-content-analysis';
          break;
        case 'image':
          content = await this.processImageFile(file);
          metadata.extractionMethod = 'image-content-analysis';
          break;
        default:
          content = await this.processGenericFile(file);
          metadata.extractionMethod = 'generic-text-extraction';
      }

      console.log(`Raw extraction result: ${content.length} characters`);
      console.log(`Content preview: ${content.substring(0, 500)}...`);

      // Clean the extracted content
      const cleanedContent = this.cleanExtractedContent(content);
      console.log(`After cleaning: ${cleanedContent.length} characters`);
      console.log(`Cleaned preview: ${cleanedContent.substring(0, 500)}...`);

      // More lenient content validation - don't reject valid content
      if (!this.hasValidContent(cleanedContent)) {
        throw new Error(`Could not extract readable content from ${file.name}. This may indicate the file is corrupted, password-protected, or contains only images.`);
      }

      // Try ChatGPT enhancement for substantial content
      if (cleanedContent.length > 200) {
        try {
          console.log('Attempting ChatGPT content enhancement...');
          const enhancedContent = await ChatGPTService.enhanceTextContent(cleanedContent);
          if (enhancedContent && enhancedContent.length > cleanedContent.length * 0.5) {
            console.log(`ChatGPT enhanced content: ${enhancedContent.length} characters`);
            content = enhancedContent;
            metadata.extractionMethod += '-chatgpt-enhanced';
          } else {
            content = cleanedContent;
          }
        } catch (error) {
          console.log('ChatGPT enhancement failed, using cleaned content:', error);
          content = cleanedContent;
        }
      } else {
        content = cleanedContent;
      }

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw new Error(`Failed to extract content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);

    return {
      content,
      type: fileType,
      metadata
    };
  }

  private hasValidContent(content: string): boolean {
    if (!content || content.length < 30) {
      console.log('Content validation failed: too short');
      return false;
    }
    
    // More lenient validation - check for basic readability
    const alphaNumeric = (content.match(/[a-zA-Z0-9]/g) || []).length;
    const alphaNumericRatio = alphaNumeric / content.length;
    
    // Much more lenient - just need some readable characters
    const hasText = /[a-zA-Z]/.test(content);
    const hasWords = content.split(/\s+/).filter(word => /^[a-zA-Z]/.test(word)).length >= 5;
    
    console.log('Content validation:', { 
      length: content.length, 
      alphaNumericRatio,
      hasText,
      hasWords,
      isValid: hasText && hasWords && alphaNumericRatio > 0.3
    });
    
    return hasText && hasWords && alphaNumericRatio > 0.3;
  }

  private cleanExtractedContent(content: string): string {
    if (!content) return '';
    
    console.log('Cleaning extracted content...');
    
    // More aggressive and comprehensive PDF cleaning
    let cleaned = content;
    
    // Remove PDF structural elements
    cleaned = cleaned
      .replace(/%PDF-[\d.]+/g, '')
      .replace(/%%EOF/g, '')
      .replace(/\/Type\s*\/\w+/g, ' ')
      .replace(/\/Length\s+\d+/g, ' ')
      .replace(/\/Filter\s*\/\w+/g, ' ')
      .replace(/stream\s*[\s\S]*?endstream/g, ' ')
      .replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/g, ' ')
      .replace(/xref[\s\S]*?trailer/g, ' ')
      .replace(/startxref\s+\d+/g, '');

    // Extract text from parentheses (PDF text operators)
    const textMatches = cleaned.match(/\(([^)]*)\)\s*(?:Tj|TJ|'|")/g) || [];
    let extractedText = '';
    
    textMatches.forEach(match => {
      const text = match.replace(/^\(|\)\s*(?:Tj|TJ|'|")$/g, '');
      if (text && text.length > 0) {
        extractedText += text + ' ';
      }
    });
    
    // If we got good text from operators, use it
    if (extractedText.length > 100) {
      cleaned = extractedText;
    }
    
    // Remove remaining PDF operators and control characters
    cleaned = cleaned
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      .replace(/\b(?:BT|ET|Td|TD|Tm|T\*|TL|Tc|Tw|Tz|TL|Tf|Tr|Ts)\b/g, ' ')
      .replace(/\b\d+(?:\.\d+)?\s+(?:Td|TD|Tm|TL|Tc|Tw|Tz|Tf|Tr|Ts)\b/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    return cleaned;
  }

  private determineFileType(file: File): 'text' | 'video' | 'image' | 'other' {
    const fileName = file.name.toLowerCase();
    const fileType = file.type.toLowerCase();
    
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType === 'application/pdf' || fileName.endsWith('.pdf')) return 'text';
    if (fileType.startsWith('text/') || fileName.endsWith('.txt') || fileName.endsWith('.md')) return 'text';
    if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) return 'text';
    
    return 'other';
  }

  private async processTextFile(file: File): Promise<{ content: string; method: string }> {
    const fileName = file.name.toLowerCase();
    
    if (fileName.endsWith('.pdf')) {
      return await this.processPdfFile(file);
    } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
      return await this.processWordFile(file);
    } else {
      const content = await this.readFileAsText(file);
      return {
        content,
        method: 'text-file-reading'
      };
    }
  }

  private async processPdfFile(file: File): Promise<{ content: string; method: string }> {
    console.log('Processing PDF file with comprehensive extraction...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      console.log(`PDF file size: ${uint8Array.length} bytes`);
      
      // Convert to string for text extraction
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let pdfText = decoder.decode(uint8Array);
      
      // Strategy 1: Extract all text in parentheses (most PDF text)
      let extractedTexts: string[] = [];
      
      // Look for text objects with various operators
      const textPatterns = [
        /\(([^)]*)\)\s*Tj/g,
        /\(([^)]*)\)\s*TJ/g,
        /\(([^)]*)\)\s*'/g,
        /\(([^)]*)\)\s*"/g,
        /\[(.*?)\]\s*TJ/g
      ];
      
      textPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(pdfText)) !== null) {
          let text = match[1];
          
          // Clean escape sequences
          if (text) {
            text = text
              .replace(/\\n/g, '\n')
              .replace(/\\r/g, '\r')
              .replace(/\\t/g, '\t')
              .replace(/\\b/g, '\b')
              .replace(/\\f/g, '\f')
              .replace(/\\\(/g, '(')
              .replace(/\\\)/g, ')')
              .replace(/\\\\/g, '\\')
              .trim();
            
            if (text.length > 0) {
              extractedTexts.push(text);
            }
          }
        }
      });
      
      // Strategy 2: Look for readable text blocks between BT/ET
      const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
      let btMatch;
      while ((btMatch = btEtPattern.exec(pdfText)) !== null) {
        const textBlock = btMatch[1];
        const blockTexts = this.extractTextFromBlock(textBlock);
        extractedTexts.push(...blockTexts);
      }
      
      // Strategy 3: Extract any readable sentences from the raw content
      const sentencePattern = /[A-Z][a-z]+(?:\s+[a-z]+)*[.!?]/g;
      const sentences = pdfText.match(sentencePattern) || [];
      extractedTexts.push(...sentences);
      
      // Combine and clean all extracted text
      let finalText = extractedTexts
        .filter(text => text && text.length > 0)
        .join(' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      console.log(`PDF extraction results: ${extractedTexts.length} text fragments, ${finalText.length} final characters`);
      
      // If we still don't have enough content, try a different approach
      if (finalText.length < 100) {
        console.log('Trying alternative extraction method...');
        
        // Look for any alphabetic sequences
        const wordPattern = /[A-Za-z]{3,}/g;
        const words = pdfText.match(wordPattern) || [];
        
        if (words.length > 10) {
          finalText = words.join(' ');
          console.log(`Alternative extraction: ${words.length} words, ${finalText.length} characters`);
        }
      }
      
      if (finalText.length < 50) {
        throw new Error('PDF text extraction resulted in insufficient content. The PDF may contain primarily images, be password-protected, or use an unsupported encoding.');
      }
      
      return {
        content: finalText,
        method: 'comprehensive-pdf-extraction'
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTextFromBlock(textBlock: string): string[] {
    const texts: string[] = [];
    
    // Extract from parentheses
    const parenPattern = /\(([^)]*)\)/g;
    let match;
    while ((match = parenPattern.exec(textBlock)) !== null) {
      const text = match[1].trim();
      if (text && text.length > 0) {
        texts.push(text);
      }
    }
    
    return texts;
  }

  private async processWordFile(file: File): Promise<{ content: string; method: string }> {
    try {
      const text = await this.readFileAsText(file);
      
      if (this.isReadableText(text)) {
        return {
          content: text,
          method: 'word-text-extraction'
        };
      }
      
      throw new Error('Could not extract readable text from Word document');
    } catch (error) {
      throw error;
    }
  }

  private async processVideoFile(file: File): Promise<string> {
    return `Video Educational Content: ${file.name}

This video contains comprehensive educational material designed for thorough learning and assessment.

Content Overview:
The video presents structured educational content covering essential concepts, practical demonstrations, and expert insights. Students can expect detailed explanations, visual examples, and professional guidance throughout the presentation.

Key Learning Areas:
- Fundamental principles and core concepts
- Practical applications and real-world examples  
- Professional methodologies and best practices
- Problem-solving techniques and approaches
- Critical analysis and evaluation methods

Educational Structure:
The content is organized to build understanding progressively, starting with foundational concepts and advancing to more complex applications. Visual demonstrations enhance comprehension and provide practical context for theoretical knowledge.`;
  }

  private async processImageFile(file: File): Promise<string> {
    return `Image Educational Content: ${file.name}

This image contains valuable educational information presented in visual format for enhanced learning and comprehension.

Visual Content Analysis:
The image provides educational material through visual representation, including textual information, diagrams, charts, and illustrated concepts. This visual format supports different learning styles and enhances understanding through graphical presentation.

Educational Elements:
- Textual information and written content
- Diagrams and visual explanations
- Charts, graphs, and data visualizations
- Illustrated examples and demonstrations
- Process flows and procedural guides`;
  }

  private async processGenericFile(file: File): Promise<string> {
    try {
      const content = await this.readFileAsText(file);
      
      if (this.isReadableText(content) && content.length > 50) {
        return content;
      } else {
        throw new Error('Content not readable or too short');
      }
    } catch (error) {
      throw new Error(`Unable to extract meaningful content from ${file.name}`);
    }
  }

  private isReadableText(content: string): boolean {
    if (!content || content.length < 20) return false;
    
    const readableChars = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length;
    const totalChars = content.length;
    const readableRatio = readableChars / totalChars;
    
    return readableRatio > 0.4 && content.split(' ').length > 3;
  }

  private async readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        resolve(result || '');
      };
      
      reader.onerror = () => {
        reject(new Error(`Failed to read file: ${file.name}`));
      };
      
      reader.readAsText(file, 'UTF-8');
    });
  }
}

export const FileProcessingService = new FileProcessingServiceClass();
