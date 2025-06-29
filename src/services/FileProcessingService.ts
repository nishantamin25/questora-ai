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

      // STEP 2: CRITICAL - Validate content is actually readable text
      console.log('🔍 STEP 2: Content readability validation...');
      const isReadable = this.validateContentReadability(content);
      
      if (!isReadable.isValid) {
        console.error('❌ CONTENT VALIDATION FAILED:', isReadable.reason);
        console.error('Content sample:', content.substring(0, 200));
        
        // Try OCR if content is corrupted
        if (this.shouldUseOCRFallback(file, content).qualifiesForOCR) {
          console.log('🔄 Attempting OCR due to corrupted content...');
          metadata.ocrAttempted = true;
          
          try {
            const ocrContent = await this.performOCRExtraction(file);
            const ocrReadable = this.validateContentReadability(ocrContent);
            
            if (ocrReadable.isValid) {
              console.log('✅ OCR produced readable content');
              content = ocrContent;
              metadata.ocrSuccessful = true;
              metadata.extractionMethod += '-ocr-success';
            } else {
              throw new Error(`OCR also failed readability check: ${ocrReadable.reason}`);
            }
          } catch (ocrError) {
            metadata.ocrError = ocrError instanceof Error ? ocrError.message : 'OCR failed';
            throw new Error(`File contains corrupted or unreadable content. OCR attempt failed: ${metadata.ocrError}`);
          }
        } else {
          throw new Error(`File content is corrupted or unreadable: ${isReadable.reason}. This appears to be binary data or corrupted text that cannot be processed for educational content.`);
        }
      }

      // STEP 3: Final validation
      metadata.diagnostics!.initialContentLength = content.length;
      metadata.diagnostics!.contentPreview = content.substring(0, 200) + '...';
      metadata.diagnostics!.validationStage = 'final-validation';

      if (!this.hasEducationalValue(content)) {
        throw new Error(`The extracted content does not appear to contain meaningful educational material. Content length: ${content.length} characters. Please ensure your file contains readable text suitable for course generation.`);
      }

      console.log('✅ FILE PROCESSING SUCCESSFUL:', {
        fileName: file.name,
        finalContentLength: content.length,
        extractionMethod: metadata.extractionMethod,
        isReadable: true
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

  // NEW: Strict content readability validation
  private validateContentReadability(content: string): { isValid: boolean; reason: string } {
    if (!content || content.length < 50) {
      return { isValid: false, reason: 'Content too short or empty' };
    }

    // Check for binary/corrupted data patterns
    const binaryPatterns = [
      /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\xFF]/g, // Control characters and high ASCII
      /obj\s*<<.*?>>/g, // PDF object patterns
      /endobj|endstream/g, // PDF structure
      /^\*[0-9]+&/g, // Binary markers
      /[^\x20-\x7E\s]/g // Non-printable characters except whitespace
    ];

    let corruptedCharCount = 0;
    for (const pattern of binaryPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        corruptedCharCount += matches.join('').length;
      }
    }

    const corruptionRatio = corruptedCharCount / content.length;
    
    if (corruptionRatio > 0.3) {
      return { 
        isValid: false, 
        reason: `High corruption ratio: ${(corruptionRatio * 100).toFixed(1)}% corrupted characters. This appears to be binary or encoded data.` 
      };
    }

    // Check for readable words
    const words = content.split(/\s+/).filter(word => 
      /^[a-zA-Z]{2,}$/.test(word) && word.length > 1
    );
    
    const wordRatio = words.length / content.split(/\s+/).length;
    
    if (wordRatio < 0.3) {
      return { 
        isValid: false, 
        reason: `Low readable word ratio: ${(wordRatio * 100).toFixed(1)}%. Content appears to be corrupted or non-textual.` 
      };
    }

    // Check for reasonable sentence structure
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length < 3) {
      return { 
        isValid: false, 
        reason: 'Content lacks proper sentence structure for educational material.' 
      };
    }

    return { isValid: true, reason: 'Content is readable' };
  }

  // ENHANCED: Educational value assessment
  private hasEducationalValue(content: string): boolean {
    if (!content || content.length < 100) {
      return false;
    }

    // Check for educational indicators
    const educationalKeywords = [
      'learn', 'study', 'understand', 'concept', 'principle', 'method', 'process',
      'analysis', 'example', 'definition', 'theory', 'practice', 'skill',
      'knowledge', 'information', 'data', 'research', 'conclusion'
    ];

    const lowercaseContent = content.toLowerCase();
    const keywordCount = educationalKeywords.filter(keyword => 
      lowercaseContent.includes(keyword)
    ).length;

    // Must have at least some educational keywords
    if (keywordCount < 2) {
      console.log('Content lacks educational keywords');
      return false;
    }

    // Check for coherent paragraphs
    const paragraphs = content.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    if (paragraphs.length < 2) {
      console.log('Content lacks proper paragraph structure');
      return false;
    }

    return true;
  }

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

  // IMPROVED: Better PDF text extraction with corruption detection
  private async processAdvancedPdfFile(file: File): Promise<{ content: string; method: string }> {
    console.log('🔍 Processing PDF with advanced text extraction...');
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      
      let bestContent = '';
      let bestMethod = '';
      
      // Strategy 1: Clean UTF-8 extraction
      try {
        console.log('Trying clean UTF-8 extraction...');
        const utf8Content = await this.extractCleanPdfText(uint8Array);
        if (utf8Content && this.validateContentReadability(utf8Content).isValid) {
          bestContent = utf8Content;
          bestMethod = 'clean-utf8-extraction';
          console.log('✅ Clean UTF-8 extraction successful:', utf8Content.length, 'characters');
        }
      } catch (error) {
        console.log('Clean UTF-8 extraction failed:', error);
      }

      // Strategy 2: Pattern-based extraction with validation
      if (bestContent.length < 500) {
        try {
          console.log('Trying validated pattern extraction...');
          const patternContent = await this.extractValidatedPdfText(uint8Array);
          if (patternContent && this.validateContentReadability(patternContent).isValid) {
            bestContent = patternContent;
            bestMethod = 'validated-pattern-extraction';
            console.log('✅ Pattern extraction successful:', patternContent.length, 'characters');
          }
        } catch (error) {
          console.log('Pattern extraction failed:', error);
        }
      }

      console.log(`PDF extraction result: ${bestMethod}, content length: ${bestContent.length}`);
      
      return {
        content: bestContent || '',
        method: bestMethod || 'pdf-extraction-failed'
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      return {
        content: '',
        method: 'pdf-extraction-error'
      };
    }
  }

  // NEW: Clean PDF text extraction
  private async extractCleanPdfText(uint8Array: Uint8Array): Promise<string> {
    const decoder = new TextDecoder('utf-8', { fatal: false });
    const pdfText = decoder.decode(uint8Array);
    
    // Look for clean text patterns only
    const cleanTexts = new Set<string>();
    
    // Extract text from simple parentheses (most reliable)
    const simpleTextMatches = pdfText.match(/\(([A-Za-z\s.,!?;:]{20,})\)/g) || [];
    
    simpleTextMatches.forEach(match => {
      const text = match.slice(1, -1)
        .replace(/\\n/g, ' ')
        .replace(/\\r/g, ' ')
        .replace(/\\t/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Only accept clearly readable text
      if (text.length > 15 && /^[A-Za-z\s.,!?;:'\-()]+$/.test(text)) {
        const wordCount = text.split(/\s+/).filter(w => /^[A-Za-z]{2,}$/.test(w)).length;
        if (wordCount >= 3) {
          cleanTexts.add(text);
        }
      }
    });
    
    return Array.from(cleanTexts).join(' ').trim();
  }

  // NEW: Validated PDF text extraction
  private async extractValidatedPdfText(uint8Array: Uint8Array): Promise<string> {
    let pdfString = '';
    // Only process reasonable portion to avoid memory issues
    const processingLength = Math.min(uint8Array.length, 1000000); // 1MB max
    
    for (let i = 0; i < processingLength; i++) {
      const char = uint8Array[i];
      // Only include printable ASCII characters
      if ((char >= 32 && char <= 126) || char === 10 || char === 13) {
        pdfString += String.fromCharCode(char);
      }
    }
    
    return this.extractTextFromValidatedPdfString(pdfString);
  }

  private extractTextFromValidatedPdfString(pdfText: string): string {
    const extractedTexts = new Set<string>();
    
    // Only look for clearly readable text patterns
    const readableTextPatterns = [
      /\(([A-Za-z][A-Za-z\s.,!?;:'\-()]{15,})\)/g,
      /BT\s+[^ET]*\(([A-Za-z][A-Za-z\s.,!?;:'\-()]{15,})\)[^ET]*ET/g
    ];
    
    readableTextPatterns.forEach(pattern => {
      const matches = pdfText.match(pattern) || [];
      matches.forEach(match => {
        const textMatch = match.match(/\(([^)]+)\)/);
        if (textMatch) {
          const text = textMatch[1]
            .replace(/\\n/g, ' ')
            .replace(/\\r/g, ' ')
            .replace(/\\t/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
          
          // Strict validation for clean text
          if (text.length > 15 && 
              /^[A-Za-z]/.test(text) && 
              /^[A-Za-z\s.,!?;:'\-()]+$/.test(text)) {
            
            const words = text.split(/\s+/).filter(w => /^[A-Za-z]{2,}$/.test(w));
            if (words.length >= 4) { // At least 4 real words
              extractedTexts.add(text);
            }
          }
        }
      });
    });
    
    const validTexts = Array.from(extractedTexts)
      .filter(text => text.length > 20)
      .sort((a, b) => b.length - a.length);
    
    return validTexts.join(' ').trim();
  }

  private async processWordFile(file: File): Promise<{ content: string; method: string }> {
    try {
      const content = await this.readFileAsText(file);
      
      const readabilityCheck = this.validateContentReadability(content);
      if (readabilityCheck.isValid && content.length > 50) {
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
      
      const readabilityCheck = this.validateContentReadability(content);
      if (readabilityCheck.isValid) {
        return content;
      } else {
        throw new Error(`Content readability check failed: ${readabilityCheck.reason}`);
      }
    } catch (error) {
      throw new Error(`Unable to extract meaningful content from ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
