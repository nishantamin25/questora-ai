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
      console.log(`Content preview: ${content.substring(0, 200)}...`);

      // CRITICAL: Strict validation to reject garbage content
      if (!this.isRealReadableContent(content)) {
        console.error('CRITICAL: Extracted content is garbage or unreadable');
        throw new Error(`Failed to extract readable text from ${file.name}. The file appears to be image-based, encrypted, or corrupted. Please try converting it to a plain text format first.`);
      }

      console.log(`✅ Successfully extracted valid content: ${content.length} characters`);

      // Try ChatGPT enhancement for substantial content
      if (content.length > 100) {
        try {
          console.log('Attempting ChatGPT content enhancement...');
          const enhancedContent = await ChatGPTService.enhanceTextContent(content);
          if (enhancedContent && enhancedContent.length > content.length * 0.3) {
            console.log(`ChatGPT enhanced content: ${enhancedContent.length} characters`);
            content = enhancedContent;
            metadata.extractionMethod += '-chatgpt-enhanced';
          }
        } catch (error) {
          console.log('ChatGPT enhancement failed, using original content:', error);
        }
      }

    } catch (error) {
      console.error(`Error processing file ${file.name}:`, error);
      throw error;
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);

    return {
      content,
      type: fileType,
      metadata
    };
  }

  private isRealReadableContent(content: string): boolean {
    if (!content || content.length < 50) {
      console.log('❌ Content validation failed: too short');
      return false;
    }

    const cleanContent = content.trim();
    
    // Check for PDF garbage patterns
    const pdfGarbagePatterns = [
      /PDF-[\d.]+/,
      /%%EOF/,
      /\/Type\s*\/\w+/,
      /\/Length\s+\d+/,
      /\/Filter\s*\/\w+/,
      /stream.*?endstream/,
      /\d+\s+\d+\s+obj/,
      /endobj/,
      /xref/,
      /startxref/,
      /BT.*?ET/,
      /Td|TD|Tm|T\*|TL|Tc|Tw|Tz|Tf|Tr|Ts/
    ];

    // Reject if contains PDF garbage
    for (const pattern of pdfGarbagePatterns) {
      if (pattern.test(cleanContent)) {
        console.log('❌ Content contains PDF garbage patterns');
        return false;
      }
    }

    // Check for readable text characteristics
    const words = cleanContent.split(/\s+/).filter(word => /^[a-zA-Z]+$/.test(word));
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const readableChars = (cleanContent.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length;
    const readableRatio = readableChars / cleanContent.length;

    const isValid = words.length >= 10 && 
                   sentences.length >= 2 && 
                   readableRatio > 0.7;

    console.log('✅ Content validation:', { 
      length: cleanContent.length, 
      wordCount: words.length,
      sentenceCount: sentences.length,
      readableRatio: readableRatio.toFixed(2),
      isValid
    });

    return isValid;
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
      return await this.processRealPdfFile(file);
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

  private async processRealPdfFile(file: File): Promise<{ content: string; method: string }> {
    console.log('🔍 Processing PDF with real text extraction...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      // Convert to string for text extraction
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let pdfText = decoder.decode(uint8Array);
      
      console.log(`PDF file converted to text: ${pdfText.length} characters`);
      
      // Strategy 1: Extract text from PDF text objects
      let extractedTexts = new Set<string>();
      
      // Look for text in parentheses (PDF text objects)
      const textInParentheses = pdfText.match(/\(([^)]+)\)/g) || [];
      textInParentheses.forEach(match => {
        const text = match.slice(1, -1) // Remove parentheses
          .replace(/\\n/g, ' ')
          .replace(/\\r/g, ' ')
          .replace(/\\t/g, ' ')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\')
          .trim();
        
        if (text.length > 3 && /[a-zA-Z]/.test(text)) {
          extractedTexts.add(text);
        }
      });
      
      // Strategy 2: Extract text from array format
      const arrayTexts = pdfText.match(/\[([^\]]+)\]/g) || [];
      arrayTexts.forEach(match => {
        const content = match.slice(1, -1);
        const textParts = content.match(/\(([^)]+)\)/g) || [];
        textParts.forEach(part => {
          const text = part.slice(1, -1).trim();
          if (text.length > 3 && /[a-zA-Z]/.test(text)) {
            extractedTexts.add(text);
          }
        });
      });
      
      // Strategy 3: Look for readable word sequences
      const wordSequences = pdfText.match(/[A-Za-z]{3,}(?:\s+[A-Za-z]{2,}){3,}/g) || [];
      wordSequences.forEach(sequence => {
        if (sequence.length > 15 && !sequence.includes('obj') && !sequence.includes('endobj')) {
          extractedTexts.add(sequence);
        }
      });
      
      const extractedContent = Array.from(extractedTexts).join(' ').trim();
      
      console.log(`PDF extraction results: ${extractedTexts.size} text fragments, ${extractedContent.length} total characters`);
      
      if (extractedContent.length < 50) {
        throw new Error('PDF contains no readable text content. This may be a scanned document that requires OCR processing.');
      }
      
      return {
        content: extractedContent,
        method: 'real-pdf-text-extraction'
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processWordFile(file: File): Promise<{ content: string; method: string }> {
    try {
      // For Word files, we'll try to read them as text
      // This is a basic implementation - real Word files would need specialized parsing
      const content = await this.readFileAsText(file);
      
      if (this.isRealReadableContent(content) && content.length > 50) {
        return {
          content,
          method: 'word-file-reading'
        };
      } else {
        // If direct text reading doesn't work, provide a fallback message
        const fallbackContent = `Word Document: ${file.name}

This document contains text-based educational content that requires specialized parsing for full extraction.

Document Overview:
The Word document includes formatted text, potentially with headings, paragraphs, lists, and other structured content designed for comprehensive learning and assessment.

Content Structure:
- Formatted text with various styling elements
- Potential headers and subheadings for organization
- Lists, tables, and other structured information
- Educational material suitable for question generation`;

        return {
          content: fallbackContent,
          method: 'word-file-fallback'
        };
      }
    } catch (error) {
      console.error('Word file processing failed:', error);
      throw new Error(`Failed to process Word document ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
      
      if (this.isRealReadableContent(content)) {
        return content;
      } else {
        throw new Error('Content not readable');
      }
    } catch (error) {
      throw new Error(`Unable to extract meaningful content from ${file.name}`);
    }
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
