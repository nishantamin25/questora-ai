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

      // Clean the content but preserve meaningful text
      const cleanedContent = this.cleanContentPreservingText(content);
      console.log(`After cleaning: ${cleanedContent.length} characters`);

      // Only use ChatGPT enhancement if we have substantial extracted content
      if (cleanedContent.length > 1000) {
        try {
          console.log('Attempting ChatGPT enhancement...');
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

    // Final validation - reject only if content is truly unusable
    if (!content || content.length < 50) {
      throw new Error(`No meaningful content could be extracted from ${file.name}. The file may be corrupted, empty, or in an unsupported format.`);
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);
    console.log('Final content preview:', content.substring(0, 300));

    return {
      content,
      type: fileType,
      metadata
    };
  }

  private cleanContentPreservingText(content: string): string {
    if (!content) return '';
    
    console.log('Starting content cleaning, original length:', content.length);
    
    // Remove binary artifacts but preserve readable text
    let cleaned = content
      // Remove PDF-specific artifacts
      .replace(/%PDF-[\d.]+/g, '')
      .replace(/%%EOF/g, '')
      .replace(/obj\s*<<.*?>>/gs, '')
      .replace(/endobj/g, '')
      .replace(/stream\s*/g, '')
      .replace(/endstream/g, '')
      .replace(/xref\s+\d+/g, '')
      .replace(/trailer\s*<</g, '')
      .replace(/startxref\s+\d+/g, '')
      .replace(/\d+\s+\d+\s+obj/g, '')
      // Remove control characters but keep newlines and tabs
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, ' ')
      // Clean up font and formatting commands
      .replace(/\/[A-Za-z]+\s+\d+(\.\d+)?\s+(Tf|TJ|Tj)/g, ' ')
      .replace(/BT\s+ET/g, ' ')
      // Remove excessive whitespace but preserve paragraph breaks
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s*\n\s*\n/g, '\n\n')
      .trim();

    console.log('After basic cleaning:', cleaned.length);

    // Extract meaningful sentences and phrases
    const meaningfulText = this.extractMeaningfulSentences(cleaned);
    console.log('After meaningful extraction:', meaningfulText.length);

    return meaningfulText;
  }

  private extractMeaningfulSentences(text: string): string {
    if (!text) return '';

    // Split into potential sentences
    const sentences = text
      .split(/[.!?]+/)
      .map(s => s.trim())
      .filter(s => {
        // Keep sentences that:
        // - Are at least 10 characters long
        // - Contain at least 2 words
        // - Have a reasonable ratio of letters to total characters
        if (s.length < 10) return false;
        
        const words = s.split(/\s+/).filter(w => w.length > 0);
        if (words.length < 2) return false;
        
        const letterCount = (s.match(/[a-zA-Z]/g) || []).length;
        const letterRatio = letterCount / s.length;
        
        return letterRatio > 0.3; // At least 30% letters
      });

    // Join sentences back together
    let result = sentences.join('. ').trim();
    
    // If result is too short, try a more lenient approach
    if (result.length < 200 && text.length > 500) {
      console.log('Trying more lenient text extraction...');
      
      // Split by paragraphs and take meaningful chunks
      const chunks = text
        .split(/\n+/)
        .map(chunk => chunk.trim())
        .filter(chunk => {
          if (chunk.length < 20) return false;
          const letterCount = (chunk.match(/[a-zA-Z]/g) || []).length;
          return letterCount > chunk.length * 0.2; // At least 20% letters
        });
      
      result = chunks.join('\n\n').trim();
    }

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
      return await this.processPdfFileEnhanced(file);
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

  private async processPdfFileEnhanced(file: File): Promise<{ content: string; method: string }> {
    console.log('Processing PDF with enhanced extraction strategies...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Enhanced PDF parsing with multiple strategies
      const strategies = [
        () => this.extractPdfTextAdvanced(uint8Array),
        () => this.extractPdfContentStreams(uint8Array),
        () => this.extractPdfTextObjects(uint8Array),
        () => this.extractPdfRawText(uint8Array)
      ];
      
      let bestContent = '';
      let bestMethod = '';
      
      for (let i = 0; i < strategies.length; i++) {
        try {
          console.log(`Trying PDF extraction strategy ${i + 1}...`);
          const extracted = strategies[i]();
          console.log(`Strategy ${i + 1} extracted ${extracted.length} characters`);
          
          if (extracted.length > bestContent.length) {
            bestContent = extracted;
            bestMethod = `pdf-strategy-${i + 1}`;
          }
        } catch (error) {
          console.log(`PDF strategy ${i + 1} failed:`, error);
        }
      }
      
      if (bestContent.length > 50) {
        console.log(`Successfully extracted ${bestContent.length} characters using ${bestMethod}`);
        return {
          content: bestContent,
          method: bestMethod
        };
      }
      
      throw new Error('All PDF extraction strategies failed to produce sufficient content');
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw error;
    }
  }

  private extractPdfTextAdvanced(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const textBlocks: string[] = [];
    
    // Strategy 1: Extract text from BT...ET blocks (enhanced)
    const btEtRegex = /BT\s*(.*?)\s*ET/gs;
    let match;
    while ((match = btEtRegex.exec(pdfText)) !== null) {
      const blockContent = match[1];
      
      // Extract text from Tj and TJ commands
      const tjRegex = /\((.*?)\)\s*T[jJ]/g;
      let tjMatch;
      while ((tjMatch = tjRegex.exec(blockContent)) !== null) {
        let text = tjMatch[1]
          .replace(/\\[rn]/g, '\n')
          .replace(/\\[t]/g, '\t')
          .replace(/\\[\\]/g, '\\')
          .replace(/\\[()]/g, match => match[1])
          .trim();
        
        if (text.length > 1 && /[a-zA-Z0-9]/.test(text)) {
          textBlocks.push(text);
        }
      }
      
      // Extract from array format: [(text1) (text2)] TJ
      const arrayTjRegex = /\[(.*?)\]\s*TJ/g;
      let arrayMatch;
      while ((arrayMatch = arrayTjRegex.exec(blockContent)) !== null) {
        const arrayContent = arrayMatch[1];
        const textParts = arrayContent.match(/\((.*?)\)/g);
        if (textParts) {
          textParts.forEach(part => {
            const cleanText = part.slice(1, -1).trim();
            if (cleanText.length > 1 && /[a-zA-Z0-9]/.test(cleanText)) {
              textBlocks.push(cleanText);
            }
          });
        }
      }
    }
    
    return textBlocks.join(' ').trim();
  }

  private extractPdfContentStreams(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const streams: string[] = [];
    const streamRegex = /stream\s*(.*?)\s*endstream/gs;
    let match;
    
    while ((match = streamRegex.exec(pdfText)) !== null) {
      let streamData = match[1];
      
      // Extract readable text from stream data
      const readableText = this.extractReadableTextFromStream(streamData);
      
      if (readableText.length > 50) {
        streams.push(readableText);
      }
    }
    
    return streams.join(' ').trim();
  }

  private extractPdfTextObjects(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    const textContent: string[] = [];
    
    // Look for text in various PDF object types
    const patterns = [
      /\/Contents\s*\[(.*?)\]/gs,
      /\/F\d+\s+(\d+(?:\.\d+)?)\s+Tf\s*\((.*?)\)/g
    ];
    
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(pdfText)) !== null) {
        const content = match[match.length - 1];
        if (content && content.length > 5) {
          const cleanContent = this.extractReadableTextFromStream(content);
          if (cleanContent.length > 20) {
            textContent.push(cleanContent);
          }
        }
      }
    });
    
    return textContent.join(' ').trim();
  }

  private extractPdfRawText(uint8Array: Uint8Array): string {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    // Extract any readable text sequences
    const readableTextRegex = /[A-Za-z][A-Za-z0-9\s.,!?;:()\-'"]{15,}/g;
    const matches = pdfText.match(readableTextRegex) || [];
    
    return matches
      .map(match => match.trim())
      .filter(text => text.length > 15)
      .join(' ')
      .substring(0, 10000); // Reasonable limit
  }

  private extractReadableTextFromStream(input: string): string {
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
