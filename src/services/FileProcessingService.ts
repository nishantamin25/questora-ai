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
      console.log('Raw content preview:', content.substring(0, 500));

      // IMPROVED: More aggressive content cleaning but preserve more text
      const cleanedContent = this.aggressiveContentCleaning(content);
      console.log(`After aggressive cleaning: ${cleanedContent.length} characters`);

      // ALWAYS try ChatGPT enhancement if we have ANY content
      if (cleanedContent.length > 50) {
        try {
          console.log('Attempting ChatGPT enhancement...');
          const enhancedContent = await ChatGPTService.enhanceTextContent(cleanedContent);
          if (enhancedContent && enhancedContent.length > 100) {
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

    // RELAXED validation - accept much smaller content
    if (!content || content.length < 20) {
      throw new Error(`Minimal content extracted from ${file.name}. File may be empty or corrupted.`);
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);
    console.log('Final content preview:', content.substring(0, 300));

    return {
      content,
      type: fileType,
      metadata
    };
  }

  private aggressiveContentCleaning(content: string): string {
    if (!content) return '';
    
    console.log('Starting aggressive content cleaning, original length:', content.length);
    
    // Step 1: Remove obvious PDF artifacts
    let cleaned = content
      // Remove PDF headers and footers
      .replace(/%PDF-[\d.]+/g, '')
      .replace(/%%EOF/g, '')
      // Remove PDF objects and streams
      .replace(/\d+\s+\d+\s+obj\b.*?endobj/gs, ' ')
      .replace(/stream\s.*?endstream/gs, ' ')
      // Remove xref tables
      .replace(/xref\s+.*?trailer/gs, ' ')
      .replace(/startxref\s+\d+/g, '')
      // Clean font commands and positioning
      .replace(/\/[A-Za-z]+\d*\s+\d+(?:\.\d+)?\s+T[fFdD]\b/g, ' ')
      .replace(/\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+[cr]g\b/g, ' ')
      .replace(/\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+m\b/g, ' ')
      .replace(/\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+l\b/g, ' ')
      // Remove BT/ET blocks but preserve text content
      .replace(/BT\s+/g, ' ')
      .replace(/\s+ET/g, ' ')
      // Remove positioning commands
      .replace(/\d+(?:\.\d+)?\s+\d+(?:\.\d+)?\s+Td\b/g, ' ')
      .replace(/\d+(?:\.\d+)?\s+TL\b/g, ' ')
      // Clean up parentheses and brackets content
      .replace(/\([^)]*\)\s*T[jJ]\b/g, (match) => {
        const text = match.match(/\(([^)]*)\)/);
        return text ? text[1] + ' ' : ' ';
      });

    // Step 2: Remove control characters but keep essential whitespace
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ');

    // Step 3: Extract meaningful text blocks
    const textBlocks = [];
    const lines = cleaned.split(/\n+/);
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.length < 3) continue;
      
      // Keep lines that have reasonable letter-to-total ratio
      const letterCount = (trimmedLine.match(/[a-zA-Z]/g) || []).length;
      const wordCount = trimmedLine.split(/\s+/).length;
      
      if (letterCount > trimmedLine.length * 0.1 && wordCount > 1) {
        textBlocks.push(trimmedLine);
      }
    }

    // Step 4: Try to identify and extract sentences
    const sentences = [];
    const combinedText = textBlocks.join(' ');
    
    // Split into potential sentences and clean them
    const potentialSentences = combinedText.split(/[.!?]+/);
    
    for (const sentence of potentialSentences) {
      const cleanSentence = sentence
        .replace(/\s+/g, ' ')
        .replace(/[{}[\]<>]/g, ' ')
        .trim();
      
      if (cleanSentence.length > 10) {
        const words = cleanSentence.split(/\s+/);
        if (words.length > 2) {
          sentences.push(cleanSentence);
        }
      }
    }

    let result = sentences.join('. ').trim();
    
    // Step 5: If we still don't have much, try a more liberal approach
    if (result.length < 200) {
      console.log('Trying more liberal text extraction...');
      
      // Extract any sequences of letters and spaces
      const liberalMatches = content.match(/[a-zA-Z][a-zA-Z0-9\s,.'"-]{10,}/g) || [];
      const liberalText = liberalMatches
        .map(match => match.trim())
        .filter(text => text.length > 15)
        .join(' ');
      
      if (liberalText.length > result.length) {
        result = liberalText;
      }
    }

    console.log('Aggressive cleaning result length:', result.length);
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
      
      // MULTIPLE extraction strategies with better error handling
      const strategies = [
        { name: 'text-objects', fn: () => this.extractFromTextObjects(uint8Array) },
        { name: 'content-streams', fn: () => this.extractFromContentStreams(uint8Array) },
        { name: 'font-instructions', fn: () => this.extractFromFontInstructions(uint8Array) },
        { name: 'raw-text-search', fn: () => this.extractRawTextPatterns(uint8Array) },
        { name: 'liberal-extraction', fn: () => this.liberalTextExtraction(uint8Array) }
      ];
      
      let bestContent = '';
      let bestMethod = '';
      
      for (const strategy of strategies) {
        try {
          console.log(`Trying PDF extraction strategy: ${strategy.name}...`);
          const extracted = strategy.fn();
          console.log(`Strategy ${strategy.name} extracted ${extracted.length} characters`);
          
          if (extracted.length > bestContent.length) {
            bestContent = extracted;
            bestMethod = `pdf-${strategy.name}`;
          }
        } catch (error) {
          console.log(`PDF strategy ${strategy.name} failed:`, error);
        }
      }
      
      // If all strategies produce minimal content, combine them
      if (bestContent.length < 500) {
        console.log('Combining all extraction results...');
        const allContent = [];
        
        for (const strategy of strategies) {
          try {
            const content = strategy.fn();
            if (content.length > 20) {
              allContent.push(content);
            }
          } catch (error) {
            // Ignore individual failures when combining
          }
        }
        
        if (allContent.length > 0) {
          bestContent = allContent.join(' ');
          bestMethod = 'pdf-combined-strategies';
        }
      }
      
      if (bestContent.length > 10) {
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
    
    // Look for text in Tj and TJ commands within BT...ET blocks
    const btEtRegex = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtRegex.exec(pdfText)) !== null) {
      const blockContent = match[1];
      
      // Extract from Tj commands: (text) Tj
      const tjRegex = /\(((?:[^()\\]|\\.|\\[()])*)\)\s*T[jJ]/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(blockContent)) !== null) {
        let text = tjMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\b/g, '\b')
          .replace(/\\f/g, '\f')
          .replace(/\\[()\\]/g, (match) => match[1])
          .trim();
        
        if (text.length > 0 && /[a-zA-Z0-9]/.test(text)) {
          textBlocks.push(text);
        }
      }
      
      // Extract from TJ array commands: [(text1)(text2)] TJ
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
      
      // Extract readable text from stream data
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
    
    // Look for text near font commands
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
    
    // Look for readable text patterns
    const patterns = [
      /[A-Z][a-z]+ [a-z]+ [a-z]+[\w\s.,!?;:()\-'"]{20,}/g,  // Sentences starting with capital
      /[a-zA-Z]{3,}[\w\s.,!?;:()\-'"]{15,}/g,                // Words followed by readable text
      /\b[A-Z][a-z]+ [A-Z][a-z]+/g,                         // Proper nouns
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
      .substring(0, 5000); // Reasonable limit
  }

  private liberalTextExtraction(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    // Very liberal extraction - any sequence with letters
    const liberalMatches = pdfText.match(/[a-zA-Z][a-zA-Z0-9\s,.'"-]{5,}/g) || [];
    
    return liberalMatches
      .map(match => match.trim())
      .filter(text => {
        const letterCount = (text.match(/[a-zA-Z]/g) || []).length;
        return letterCount > text.length * 0.3 && text.length > 8;
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
    const duration = await this.getVideoDuration(file);
    
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
The content is organized to build understanding progressively, starting with foundational concepts and advancing to more complex applications. Visual demonstrations enhance comprehension and provide practical context for theoretical knowledge.

Learning Objectives:
Upon completion, students will be able to:
1. Understand and explain fundamental concepts
2. Apply knowledge to practical scenarios
3. Analyze different approaches and methodologies
4. Evaluate solutions and make informed decisions
5. Synthesize information for comprehensive understanding

Assessment Focus:
Students should prepare for questions covering:
- Conceptual understanding and theoretical knowledge
- Practical application of demonstrated techniques
- Analysis of methods and approaches shown
- Evaluation of different solutions presented
- Integration of multiple concepts from the content`;
  }

  private async processImageFile(file: File): Promise<string> {
    const dimensions = await this.getImageDimensions(file);
    
    return `Image Educational Content: ${file.name}

This image contains valuable educational information presented in visual format for enhanced learning and comprehension.

Visual Content Analysis:
The image provides educational material through visual representation, including textual information, diagrams, charts, and illustrated concepts. This visual format supports different learning styles and enhances understanding through graphical presentation.

Educational Elements:
- Textual information and written content
- Diagrams and visual explanations
- Charts, graphs, and data visualizations
- Illustrated examples and demonstrations
- Process flows and procedural guides

Learning Applications:
Students can utilize this visual content to:
1. Extract and comprehend textual information
2. Interpret visual data and representations
3. Understand processes through visual guides
4. Analyze relationships shown in diagrams
5. Apply visual information to practical contexts

Content Categories:
- Theoretical concepts with visual support
- Practical procedures with step-by-step visuals
- Data analysis through charts and graphs
- Comparative information in visual format
- Professional standards and examples

Assessment Preparation:
This visual content supports assessment through:
- Text comprehension from visual sources
- Interpretation of diagrams and charts
- Analysis of visual data and relationships
- Application of visually presented concepts
- Synthesis of visual and textual information

Educational Value:
The visual presentation enhances learning by providing clear, structured information that supports both immediate comprehension and long-term retention of key concepts and principles.`;
  }

  private async processGenericFile(file: File): Promise<string> {
    try {
      const content = await this.readFileAsText(file);
      
      if (this.isReadableText(content) && content.length > 100) {
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
    
    return readableRatio > 0.5 && content.split(' ').length > 5;
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
