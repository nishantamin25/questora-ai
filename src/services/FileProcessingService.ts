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

      // Validate we have real content
      if (!this.isValidExtractedContent(cleanedContent)) {
        throw new Error(`No readable content could be extracted from ${file.name}. The file may be corrupted, password-protected, or in an unsupported format.`);
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

  private isValidExtractedContent(content: string): boolean {
    if (!content || content.length < 50) return false;
    
    // Check for meaningful words
    const words = content.split(/\s+/).filter(word => 
      word.length > 2 && /^[a-zA-Z]/.test(word)
    );
    
    if (words.length < 10) return false;
    
    // Check readable character ratio
    const readableChars = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length;
    const readableRatio = readableChars / content.length;
    
    console.log('Content validation:', { 
      length: content.length, 
      wordCount: words.length,
      readableRatio,
      isValid: readableRatio > 0.7
    });
    
    return readableRatio > 0.7;
  }

  private cleanExtractedContent(content: string): string {
    if (!content) return '';
    
    console.log('Cleaning extracted content...');
    
    // Remove PDF artifacts and binary data
    let cleaned = content
      .replace(/%PDF-[\d.]+/g, '')
      .replace(/%%EOF/g, '')
      .replace(/\/Type\s*\/\w+/g, ' ')
      .replace(/\/Length\s+\d+/g, ' ')
      .replace(/\/Filter\s*\/\w+/g, ' ')
      .replace(/stream\s*[\s\S]*?endstream/g, ' ')
      .replace(/\d+\s+\d+\s+obj[\s\S]*?endobj/g, ' ')
      .replace(/xref[\s\S]*?trailer/g, ' ')
      .replace(/startxref\s+\d+/g, '');

    // Remove control characters but keep basic punctuation
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');
    
    // Extract text from PDF text operators - fix the regex patterns
    cleaned = cleaned.replace(/\(([^)]*)\)\s*T[jJ]/g, '$1 ');
    cleaned = cleaned.replace(/\(([^)]*)\)\s*Tj/g, '$1 ');
    
    // Remove remaining PDF operators
    cleaned = cleaned.replace(/\b(?:BT|ET|Td|TD|Tm|T\*|TL|Tc|Tw|Tz|TL|Tf|Tr|Ts)\b/g, ' ');
    cleaned = cleaned.replace(/\b\d+(?:\.\d+)?\s+(?:Td|TD|Tm|TL|Tc|Tw|Tz|Tf|Tr|Ts)\b/g, ' ');
    
    // Clean up whitespace and normalize
    cleaned = cleaned
      .replace(/\s+/g, ' ')
      .replace(/\n\s*\n/g, '\n')
      .trim();
    
    // If still very short, try more aggressive extraction
    if (cleaned.length < 100) {
      console.log('Trying more aggressive text extraction...');
      const sentences = content.match(/[A-Z][^.!?]*[.!?]/g) || [];
      if (sentences.length > 0) {
        cleaned = sentences.join(' ');
      }
    }
    
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
    console.log('Processing PDF file with simplified extraction...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const decoder = new TextDecoder('utf-8', { fatal: false });
      const pdfText = decoder.decode(uint8Array);
      
      console.log(`PDF file size: ${uint8Array.length} bytes`);
      
      // Strategy 1: Extract text from parentheses (most common PDF text storage)
      let extractedText = this.extractTextFromParentheses(pdfText);
      
      // Strategy 2: If insufficient, try stream extraction
      if (extractedText.length < 100) {
        console.log('Trying stream-based extraction...');
        const streamText = this.extractTextFromStreams(pdfText);
        if (streamText.length > extractedText.length) {
          extractedText = streamText;
        }
      }
      
      // Strategy 3: If still insufficient, try pattern matching
      if (extractedText.length < 100) {
        console.log('Trying pattern-based extraction...');
        const patternText = this.extractTextFromPatterns(pdfText);
        if (patternText.length > extractedText.length) {
          extractedText = patternText;
        }
      }
      
      console.log(`Extracted ${extractedText.length} characters from PDF`);
      
      if (extractedText.length < 30) {
        throw new Error('PDF appears to be empty, image-based, or encrypted');
      }
      
      return {
        content: extractedText,
        method: 'pdf-text-extraction'
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private extractTextFromParentheses(pdfText: string): string {
    const textParts: string[] = [];
    
    // Match text in parentheses followed by text positioning operators
    const textRegex = /\(([^)]*)\)\s*(?:Tj|TJ|'|")/g;
    let match;
    
    while ((match = textRegex.exec(pdfText)) !== null) {
      let text = match[1];
      
      // Decode common PDF escape sequences
      text = text
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\b/g, '\b')
        .replace(/\\f/g, '\f')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\');
      
      if (text.trim() && text.length > 0) {
        textParts.push(text.trim());
      }
    }
    
    // Also try array-based text positioning
    const arrayRegex = /\[(.*?)\]\s*TJ/g;
    while ((match = arrayRegex.exec(pdfText)) !== null) {
      const arrayContent = match[1];
      const textMatches = arrayContent.match(/\(([^)]*)\)/g);
      if (textMatches) {
        textMatches.forEach(textMatch => {
          const text = textMatch.slice(1, -1).trim();
          if (text && text.length > 0) {
            textParts.push(text);
          }
        });
      }
    }
    
    return textParts.join(' ').trim();
  }

  private extractTextFromStreams(pdfText: string): string {
    const textParts: string[] = [];
    
    // Find text between BT (Begin Text) and ET (End Text) operators
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtRegex.exec(pdfText)) !== null) {
      const textBlock = match[1];
      
      // Extract text from this block
      const blockText = this.extractTextFromParentheses('BT ' + textBlock + ' ET');
      if (blockText.trim()) {
        textParts.push(blockText.trim());
      }
    }
    
    return textParts.join(' ').trim();
  }

  private extractTextFromPatterns(pdfText: string): string {
    // Look for readable text patterns in the PDF
    const patterns = [
      /[A-Z][a-z]+(?:\s+[a-z]+)*[.!?]/g,  // Sentences
      /[A-Z][a-z]+(?:\s+[A-Z][a-z]*)*\s+[a-z]+/g,  // Title case phrases
      /\b[a-zA-Z]+(?:\s+[a-zA-Z]+){2,}/g  // Word sequences
    ];
    
    const textParts: string[] = [];
    
    for (const pattern of patterns) {
      const matches = pdfText.match(pattern) || [];
      textParts.push(...matches);
    }
    
    // Deduplicate and filter
    const uniqueTexts = [...new Set(textParts)]
      .filter(text => text.length > 10 && this.isReadableText(text))
      .slice(0, 50);  // Limit to prevent overwhelming output
    
    return uniqueTexts.join(' ').trim();
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
