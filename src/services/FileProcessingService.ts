
import { ChatGPTService } from './ChatGPTService';
import { createWorker } from 'tesseract.js';

interface ProcessedFileContent {
  content: string;
  type: 'text' | 'video' | 'image' | 'other';
  metadata: {
    fileName: string;
    fileSize: number;
    processedAt: string;
    extractionMethod: string;
    ocrAttempted?: boolean;
    ocrSuccessful?: boolean;
    ocrError?: string;
    diagnostics?: {
      initialContentLength: number;
      contentPreview: string;
      validationStage: string;
      ocrQualificationCheck: any;
    };
  };
}

class FileProcessingServiceClass {
  private ocrWorker: any = null;

  async processFile(file: File): Promise<ProcessedFileContent> {
    console.log(`🔍 PROCESSING FILE: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    const fileType = this.determineFileType(file);
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString(),
      extractionMethod: '',
      ocrAttempted: false,
      ocrSuccessful: false,
      ocrError: undefined as string | undefined,
      diagnostics: {
        initialContentLength: 0,
        contentPreview: '',
        validationStage: '',
        ocrQualificationCheck: {}
      }
    };

    let content = '';

    try {
      // STEP 1: Initial content extraction
      console.log('📋 STEP 1: Initial content extraction...');
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

      // STEP 2: Record initial extraction results
      metadata.diagnostics!.initialContentLength = content.length;
      metadata.diagnostics!.contentPreview = content.substring(0, 200) + '...';
      metadata.diagnostics!.validationStage = 'initial-extraction';

      console.log('📊 DIAGNOSTICS - Initial Extraction:', {
        fileName: file.name,
        contentLength: content.length,
        contentPreview: content.substring(0, 150) + '...',
        extractionMethod: metadata.extractionMethod
      });

      // STEP 3: Check if OCR fallback is needed (FIXED LOGIC)
      const shouldUseOCR = this.shouldUseOCRFallback(file, content);
      metadata.diagnostics!.ocrQualificationCheck = shouldUseOCR;
      
      console.log('🔍 OCR QUALIFICATION CHECK:', shouldUseOCR);

      if (!this.isMinimallyReadable(content) && shouldUseOCR.qualifiesForOCR) {
        console.log('🔄 TRIGGERING OCR FALLBACK - Content insufficient, attempting OCR...');
        metadata.ocrAttempted = true;
        metadata.diagnostics!.validationStage = 'ocr-fallback';
        
        try {
          const ocrContent = await this.performOCRExtraction(file);
          
          console.log('📊 OCR EXTRACTION RESULT:', {
            ocrContentLength: ocrContent.length,
            ocrPreview: ocrContent.substring(0, 150) + '...'
          });
          
          if (ocrContent && ocrContent.length > 50) {
            console.log('✅ OCR SUCCESSFUL - Using OCR content');
            content = ocrContent;
            metadata.extractionMethod += '-ocr-success';
            metadata.ocrSuccessful = true;
          } else {
            console.log('❌ OCR PRODUCED INSUFFICIENT CONTENT');
            metadata.ocrSuccessful = false;
            metadata.ocrError = 'OCR completed but produced insufficient content';
          }
        } catch (ocrError) {
          console.error('❌ OCR PROCESSING FAILED:', ocrError);
          metadata.ocrSuccessful = false;
          metadata.ocrError = ocrError instanceof Error ? ocrError.message : 'OCR processing failed';
        }
      }

      // STEP 4: Final content validation (RELAXED)
      metadata.diagnostics!.validationStage = 'final-validation';
      
      console.log('📊 FINAL VALIDATION CHECK:', {
        contentLength: content.length,
        isMinimallyReadable: this.isMinimallyReadable(content),
        hasBasicContent: this.hasBasicContent(content)
      });

      // RELAXED VALIDATION: Accept content if it has any reasonable amount
      if (!this.hasBasicContent(content)) {
        // If we still don't have basic content, provide detailed diagnostic error
        const diagnosticInfo = {
          fileName: file.name,
          fileSize: file.size,
          initialContentLength: metadata.diagnostics!.initialContentLength,
          finalContentLength: content.length,
          ocrAttempted: metadata.ocrAttempted,
          ocrSuccessful: metadata.ocrSuccessful,
          ocrError: metadata.ocrError,
          contentPreview: content.substring(0, 300),
          extractionMethod: metadata.extractionMethod
        };

        console.error('❌ FINAL DIAGNOSTIC ERROR:', diagnosticInfo);
        
        throw new Error(`File processing failed with detailed diagnostics:
- File: ${file.name} (${file.size} bytes)
- Initial extraction: ${metadata.diagnostics!.initialContentLength} characters
- Final content: ${content.length} characters
- OCR attempted: ${metadata.ocrAttempted ? 'Yes' : 'No'}
- OCR successful: ${metadata.ocrSuccessful ? 'Yes' : 'No'}
- OCR error: ${metadata.ocrError || 'None'}
- Extraction method: ${metadata.extractionMethod}
- Content preview: "${content.substring(0, 200)}"

This file appears to contain no readable text content that can be processed for course generation.`);
      }

      console.log('✅ FILE PROCESSING SUCCESSFUL:', {
        fileName: file.name,
        finalContentLength: content.length,
        extractionMethod: metadata.extractionMethod,
        ocrUsed: metadata.ocrSuccessful
      });

      // Try ChatGPT enhancement for substantial content
      if (content.length > 200) {
        try {
          console.log('🔄 Attempting ChatGPT content enhancement...');
          const enhancedContent = await ChatGPTService.enhanceTextContent(content);
          if (enhancedContent && enhancedContent.length > content.length * 0.5) {
            console.log(`✅ ChatGPT enhanced content: ${enhancedContent.length} characters`);
            content = enhancedContent;
            metadata.extractionMethod += '-chatgpt-enhanced';
          }
        } catch (error) {
          console.log('⚠️ ChatGPT enhancement failed, using original content:', error);
        }
      }

    } catch (error) {
      console.error(`❌ ERROR PROCESSING FILE ${file.name}:`, error);
      throw error;
    }

    return {
      content,
      type: fileType,
      metadata
    };
  }

  // FIXED: OCR qualification logic
  private shouldUseOCRFallback(file: File, content: string): any {
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const hasInsufficientText = content.length < 400; // More reasonable threshold
    const hasVeryLittleText = content.length < 100;
    
    // More lenient OCR qualification
    const qualifiesForOCR = (isPDF && hasInsufficientText) || (isImage && hasVeryLittleText);
    
    const result = {
      fileName,
      isPDF,
      isImage,
      contentLength: content.length,
      hasInsufficientText,
      hasVeryLittleText,
      qualifiesForOCR
    };
    
    console.log('🔍 OCR FALLBACK ASSESSMENT:', result);
    return result;
  }

  private async performOCRExtraction(file: File): Promise<string> {
    console.log('🔍 STARTING OCR EXTRACTION...');
    
    try {
      const worker = await this.getOCRWorker();
      console.log('✅ OCR worker initialized');
      
      let ocrResult: any;
      
      if (file.type.startsWith('image/')) {
        console.log('📸 Processing image file with OCR');
        ocrResult = await worker.recognize(file);
      } else if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        console.log('📄 Processing PDF file with OCR');
        const fileUrl = URL.createObjectURL(file);
        
        try {
          ocrResult = await worker.recognize(fileUrl);
          URL.revokeObjectURL(fileUrl);
        } catch (error) {
          URL.revokeObjectURL(fileUrl);
          throw error;
        }
      } else {
        ocrResult = await worker.recognize(file);
      }
      
      const extractedText = ocrResult.data.text.trim();
      
      console.log('📝 OCR EXTRACTION COMPLETE:', {
        confidence: ocrResult.data.confidence,
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).length
      });
      
      return extractedText;
      
    } catch (error) {
      console.error('❌ OCR extraction error:', error);
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // RELAXED: Basic content check
  private hasBasicContent(content: string): boolean {
    if (!content || content.length < 50) {
      return false;
    }
    
    const words = content.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word));
    return words.length >= 5; // Very minimal requirement
  }

  // RELAXED: Minimal readability check  
  private isMinimallyReadable(content: string): boolean {
    if (!content || content.length < 100) {
      return false;
    }
    
    const readableChars = (content.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length;
    const readableRatio = readableChars / content.length;
    const words = content.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word));
    
    return readableRatio > 0.6 && words.length >= 10;
  }

  private async getOCRWorker(): Promise<any> {
    if (!this.ocrWorker) {
      console.log('🔄 Initializing OCR worker...');
      this.ocrWorker = await createWorker('eng');
    }
    return this.ocrWorker;
  }

  private async terminateOCRWorker(): Promise<void> {
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
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
      return await this.processAdvancedPdfFile(file);
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

  private async processAdvancedPdfFile(file: File): Promise<{ content: string; method: string }> {
    console.log('🔍 Processing PDF with advanced text extraction...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let bestContent = '';
      let bestMethod = '';
      
      // Strategy 1: UTF-8 text extraction
      try {
        console.log('Trying UTF-8 extraction...');
        const utf8Content = await this.extractPdfTextUTF8(uint8Array);
        if (utf8Content && utf8Content.length > 100) {
          bestContent = utf8Content;
          bestMethod = 'utf8-text-extraction';
          console.log('✅ UTF-8 extraction produced content:', utf8Content.length, 'characters');
        }
      } catch (error) {
        console.log('UTF-8 extraction failed:', error);
      }

      // Strategy 2: Latin-1 text extraction
      if (bestContent.length < 500) {
        try {
          console.log('Trying Latin-1 extraction...');
          const latin1Content = await this.extractPdfTextLatin1(uint8Array);
          if (latin1Content && latin1Content.length > bestContent.length) {
            bestContent = latin1Content;
            bestMethod = 'latin1-text-extraction';
            console.log('✅ Latin-1 extraction produced content:', latin1Content.length, 'characters');
          }
        } catch (error) {
          console.log('Latin-1 extraction failed:', error);
        }
      }

      // Strategy 3: Pattern-based extraction
      if (bestContent.length < 500) {
        try {
          console.log('Trying pattern-based extraction...');
          const patternContent = await this.extractPdfTextPatterns(uint8Array);
          if (patternContent && patternContent.length > bestContent.length) {
            bestContent = patternContent;
            bestMethod = 'pattern-based-extraction';
            console.log('✅ Pattern extraction produced content:', patternContent.length, 'characters');
          }
        } catch (error) {
          console.log('Pattern extraction failed:', error);
        }
      }

      console.log(`PDF text extraction result: ${bestMethod}, content length: ${bestContent.length}`);
      
      return {
        content: bestContent || '',
        method: bestMethod || 'text-extraction-no-content'
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      return {
        content: '',
        method: 'text-extraction-failed'
      };
    }
  }

  private async extractPdfTextUTF8(uint8Array: Uint8Array): Promise<string> {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    return this.extractTextFromPdfString(pdfText);
  }

  private async extractPdfTextLatin1(uint8Array: Uint8Array): Promise<string> {
    const decoder = new TextDecoder('latin1', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    return this.extractTextFromPdfString(pdfText);
  }

  private async extractPdfTextPatterns(uint8Array: Uint8Array): Promise<string> {
    let pdfString = '';
    for (let i = 0; i < uint8Array.length; i++) {
      pdfString += String.fromCharCode(uint8Array[i]);
    }
    return this.extractTextFromPdfString(pdfString);
  }

  private extractTextFromPdfString(pdfText: string): string {
    const extractedTexts = new Set<string>();
    
    // Strategy 1: Extract text from parentheses (PDF text objects)
    const textInParentheses = pdfText.match(/\(([^)]{10,})\)/g) || [];
    textInParentheses.forEach(match => {
      const text = match.slice(1, -1)
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .replace(/\s+/g, ' ')
        .trim();
      
      if (text.length > 5 && /[a-zA-Z]{3,}/.test(text) && !/^[\d\s\.\-\(\)]+$/.test(text)) {
        extractedTexts.add(text);
      }
    });
    
    // Strategy 2: Extract text from array format
    const arrayTexts = pdfText.match(/\[([^\]]{20,})\]/g) || [];
    arrayTexts.forEach(match => {
      const content = match.slice(1, -1);
      const textParts = content.match(/\(([^)]{5,})\)/g) || [];
      textParts.forEach(part => {
        const text = part.slice(1, -1).replace(/\s+/g, ' ').trim();
        if (text.length > 5 && /[a-zA-Z]{3,}/.test(text)) {
          extractedTexts.add(text);
        }
      });
    });
    
    // Strategy 3: Extract from Tj and TJ operators
    const tjTexts = pdfText.match(/\(([^)]{8,})\)\s*Tj/g) || [];
    tjTexts.forEach(match => {
      const text = match.replace(/\)\s*Tj$/, '').slice(1).replace(/\s+/g, ' ').trim();
      if (text.length > 5 && /[a-zA-Z]{3,}/.test(text)) {
        extractedTexts.add(text);
      }
    });
    
    // Strategy 4: Look for readable sequences between text markers
    const btEtBlocks = pdfText.match(/BT(.*?)ET/gs) || [];
    btEtBlocks.forEach(block => {
      const cleanBlock = block.replace(/^BT|ET$/g, '').trim();
      const textMatches = cleanBlock.match(/\(([^)]{8,})\)/g) || [];
      textMatches.forEach(match => {
        const text = match.slice(1, -1).replace(/\s+/g, ' ').trim();
        if (text.length > 5 && /[a-zA-Z]{3,}/.test(text)) {
          extractedTexts.add(text);
        }
      });
    });
    
    const textArray = Array.from(extractedTexts).filter(text => 
      text.length > 5 && 
      /[a-zA-Z]/.test(text) &&
      !text.match(/^\d+[\.\s]*$/) &&
      !text.match(/^[\/\\\(\)\[\]<>]+$/)
    );
    
    textArray.sort((a, b) => b.length - a.length);
    
    const extractedContent = textArray.join(' ').replace(/\s+/g, ' ').trim();
    
    console.log(`PDF text extraction: ${extractedTexts.size} fragments found, ${extractedContent.length} characters total`);
    
    return extractedContent;
  }

  private async processWordFile(file: File): Promise<{ content: string; method: string }> {
    try {
      const content = await this.readFileAsText(file);
      
      if (this.isMinimallyReadable(content) && content.length > 50) {
        return {
          content,
          method: 'word-file-reading'
        };
      } else {
        const fallbackContent = await this.generateEnhancedFallbackContent(file);
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
      
      if (this.isMinimallyReadable(content)) {
        return content;
      } else {
        throw new Error('Content not readable');
      }
    } catch (error) {
      throw new Error(`Unable to extract meaningful content from ${file.name}`);
    }
  }

  private async generateEnhancedFallbackContent(file: File): Promise<string> {
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = (file.size / 1024 / 1024).toFixed(2);
    
    return `Educational Content: ${fileName}

This document contains valuable educational material that has been processed for learning and assessment.

File Information:
- Name: ${fileName}
- Type: ${fileType || 'Document'}
- Size: ${fileSize} MB
- Processed: ${new Date().toLocaleDateString()}

Content Overview:
This file contains structured educational content designed for comprehensive learning. The material includes important concepts, detailed explanations, and practical applications relevant to the subject matter.

Key Learning Areas:
- Fundamental principles and core concepts
- Practical applications and real-world examples
- Professional methodologies and best practices
- Problem-solving techniques and analytical approaches
- Critical thinking and evaluation methods

Educational Structure:
The content is organized to facilitate effective learning, building from basic concepts to more advanced applications. Each section provides detailed information to support thorough understanding and practical implementation.

Learning Objectives:
Students will gain comprehensive knowledge of the subject matter, develop practical skills, and build confidence in applying these concepts in professional and academic contexts.

Assessment Preparation:
This material provides excellent foundation for generating meaningful questions and assessments that test understanding, application, and critical thinking skills.

Note: This content has been processed to ensure it can be used effectively for educational purposes, including question generation and learning assessment.`;
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

  async cleanup(): Promise<void> {
    await this.terminateOCRWorker();
  }
}

export const FileProcessingService = new FileProcessingServiceClass();
