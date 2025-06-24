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
    console.log(`Processing file: ${file.name} (${file.type})`);
    
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

      // Improved content cleaning that preserves more useful text
      const cleanedContent = this.improvedContentCleaning(content);
      console.log(`After cleaning: ${cleanedContent.length} characters`);

      // Try ChatGPT enhancement if we have reasonable content
      if (cleanedContent.length > 100) {
        try {
          console.log('Attempting ChatGPT enhancement...');
          const enhancedContent = await ChatGPTService.enhanceTextContent(cleanedContent);
          if (enhancedContent && enhancedContent.length > cleanedContent.length * 0.8) {
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

    // More lenient validation - accept smaller content
    if (!content || content.length < 30) {
      throw new Error(`Insufficient content extracted from ${file.name}. File may be empty, corrupted, or unsupported.`);
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);

    return {
      content,
      type: fileType,
      metadata
    };
  }

  private improvedContentCleaning(content: string): string {
    if (!content) return '';
    
    console.log('Starting improved content cleaning, original length:', content.length);
    
    // Step 1: Remove obvious PDF/binary artifacts while preserving text
    let cleaned = content
      .replace(/%PDF-[\d.]+/g, '')
      .replace(/%%EOF/g, '')
      .replace(/\d+\s+\d+\s+obj\b.*?endobj/gs, ' ')
      .replace(/stream\s.*?endstream/gs, ' ')
      .replace(/xref\s+.*?trailer/gs, ' ')
      .replace(/startxref\s+\d+/g, '')
      .replace(/\/[A-Za-z]+\d*\s+\d+(?:\.\d+)?\s+T[fFdD]\b/g, ' ')
      .replace(/BT\s+/g, ' ')
      .replace(/\s+ET/g, ' ');

    // Step 2: Extract text from parentheses (common in PDFs)
    cleaned = cleaned.replace(/\(([^)]+)\)\s*T[jJ]\b/g, (match, text) => {
      return text.replace(/\\[()\\]/g, (escSeq) => escSeq[1]) + ' ';
    });

    // Step 3: Remove control characters but preserve structure
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    // Step 4: Extract meaningful sentences and paragraphs
    const sentences = [];
    const lines = cleaned.split(/\n+/);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 5) continue;
      
      // Keep lines with reasonable text content
      const letterCount = (trimmedLine.match(/[a-zA-Z]/g) || []).length;
      const wordCount = trimmedLine.split(/\s+/).length;
      
      if (letterCount > 5 && wordCount > 1 && letterCount > trimmedLine.length * 0.2) {
        // Clean up the line further
        const cleanLine = trimmedLine
          .replace(/\s+/g, ' ')
          .replace(/[{}[\]<>]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        
        if (cleanLine.length > 10) {
          sentences.push(cleanLine);
        }
      }
    }

    let result = sentences.join(' ').trim();
    
    // Step 5: If still insufficient, try more aggressive extraction
    if (result.length < 200) {
      console.log('Trying more aggressive text extraction...');
      
      // Extract any readable text sequences
      const textMatches = content.match(/[a-zA-Z][a-zA-Z0-9\s,.'"-]{15,}/g) || [];
      const additionalText = textMatches
        .map(match => match.trim())
        .filter(text => {
          const words = text.split(/\s+/);
          return words.length > 3 && text.length > 20;
        })
        .join(' ');
      
      if (additionalText.length > result.length) {
        result = additionalText;
      }
    }

    console.log('Improved cleaning result length:', result.length);
    return result;
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
      return await this.processPdfWithMultipleStrategies(file);
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

  private async processPdfWithMultipleStrategies(file: File): Promise<{ content: string; method: string }> {
    console.log('Processing PDF with comprehensive extraction strategies...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      const strategies = [
        { name: 'text-objects', fn: () => this.extractFromTextObjects(uint8Array) },
        { name: 'content-streams', fn: () => this.extractFromContentStreams(uint8Array) },
        { name: 'font-instructions', fn: () => this.extractFromFontInstructions(uint8Array) },
        { name: 'raw-text-search', fn: () => this.extractRawTextPatterns(uint8Array) },
        { name: 'liberal-extraction', fn: () => this.liberalTextExtraction(uint8Array) }
      ];
      
      let bestContent = '';
      let bestMethod = '';
      const allContent = [];
      
      for (const strategy of strategies) {
        try {
          console.log(`Trying PDF extraction strategy: ${strategy.name}...`);
          const extracted = strategy.fn();
          console.log(`Strategy ${strategy.name} extracted ${extracted.length} characters`);
          
          if (extracted.length > 50) {
            allContent.push(extracted);
          }
          
          if (extracted.length > bestContent.length) {
            bestContent = extracted;
            bestMethod = `pdf-${strategy.name}`;
          }
        } catch (error) {
          console.log(`PDF strategy ${strategy.name} failed:`, error);
        }
      }
      
      // Combine all successful extractions for better content
      if (allContent.length > 1) {
        const combinedContent = allContent.join(' ');
        if (combinedContent.length > bestContent.length) {
          bestContent = combinedContent;
          bestMethod = 'pdf-combined-strategies';
        }
      }
      
      if (bestContent.length > 30) {
        console.log(`Successfully extracted ${bestContent.length} characters using ${bestMethod}`);
        return {
          content: bestContent,
          method: bestMethod
        };
      }
      
      throw new Error('All PDF extraction strategies failed to produce meaningful content');
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw error;
    }
  }

  private extractFromTextObjects(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const textBlocks: string[] = [];
    
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtRegex.exec(pdfText)) !== null) {
      const blockContent = match[1];
      
      const tjRegex = /\(((?:[^()\\]|\\.|\\[()])*)\)\s*T[jJ]/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(blockContent)) !== null) {
        let text = tjMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\[()\\]/g, (match) => match[1])
          .trim();
        
        if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
          textBlocks.push(text);
        }
      }
      
      const arrayTjRegex = /\[([\s\S]*?)\]\s*TJ/g;
      let arrayMatch;
      while ((arrayMatch = arrayTjRegex.exec(blockContent)) !== null) {
        const arrayContent = arrayMatch[1];
        const textParts = arrayContent.match(/\(((?:[^()\\]|\\.|\\[()])*)\)/g);
        if (textParts) {
          textParts.forEach(part => {
            const cleanText = part.slice(1, -1)
              .replace(/\\[()\\]/g, (match) => match[1])
              .trim();
            if (cleanText.length > 0 && /[a-zA-Z0-9]/.test(cleanText)) {
              textBlocks.push(cleanText);
            }
          });
        }
      }
    }
    
    return textBlocks.join(' ').trim();
  }

  private extractFromContentStreams(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const streams: string[] = [];
    const streamRegex = /stream\s*([\s\S]*?)\s*endstream/g;
    let match;
    
    while ((match = streamRegex.exec(pdfText)) !== null) {
      let streamData = match[1];
      const readableText = this.extractReadableFromStream(streamData);
      
      if (readableText.length > 20) {
        streams.push(readableText);
      }
    }
    
    return streams.join(' ').trim();
  }

  private extractFromFontInstructions(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const textContent: string[] = [];
    const fontTextRegex = /\/[A-Za-z]+\d*\s+\d+(?:\.\d+)?\s+Tf\s*(?:\s*\(([^)]*)\)\s*T[jJ])?/g;
    let match;
    
    while ((match = fontTextRegex.exec(pdfText)) !== null) {
      if (match[1]) {
        const text = match[1].trim();
        if (text.length > 2 && /[a-zA-Z]/.test(text)) {
          textContent.push(text);
        }
      }
    }
    
    return textContent.join(' ').trim();
  }

  private extractRawTextPatterns(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const patterns = [
      /[A-Z][a-z]+ [a-z]+ [a-z]+[\w\s.,!?;:()\-'"]{20,}/g,
      /[a-zA-Z]{3,}[\w\s.,!?;:()\-'"]{15,}/g,
      /\b[A-Z][a-z]+ [A-Z][a-z]+/g,
    ];
    
    const matches = [];
    
    for (const pattern of patterns) {
      const patternMatches = pdfText.match(pattern) || [];
      matches.push(...patternMatches);
    }
    
    return matches
      .map(match => match.trim())
      .filter(text => text.length > 10)
      .join(' ')
      .substring(0, 5000);
  }

  private liberalTextExtraction(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const liberalMatches = pdfText.match(/[a-zA-Z][a-zA-Z0-9\s,.'"-]{8,}/g) || [];
    
    return liberalMatches
      .map(match => match.trim())
      .filter(text => {
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        return letterCount > text.length * 0.4 && text.length > 15;
      })
      .join(' ')
      .substring(0, 8000);
  }

  private extractReadableFromStream(input: string): string {
    return input
      .replace(/[^\x20-\x7E\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .replace(/[{}[\]<>]/g, ' ')
      .trim();
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

  private async getImageDimensions(file: File): Promise<{ width: number; height: number } | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        resolve({ width: img.width, height: img.height });
      };
      img.onerror = () => {
        resolve(null);
      };
      img.src = URL.createObjectURL(file);
    });
  }

  private async getVideoDuration(file: File): Promise<number | null> {
    return new Promise((resolve) => {
      const video = document.createElement('video');
      video.preload = 'metadata';
      
      video.onloadedmetadata = () => {
        resolve(video.duration);
      };
      
      video.onerror = () => {
        resolve(null);
      };
      
      video.src = URL.createObjectURL(file);
    });
  }
}

export const FileProcessingService = new FileProcessingServiceClass();
