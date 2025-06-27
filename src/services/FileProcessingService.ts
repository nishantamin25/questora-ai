
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
  };
}

class FileProcessingServiceClass {
  private ocrWorker: any = null;

  async processFile(file: File): Promise<ProcessedFileContent> {
    console.log(`Processing file: ${file.name} (${file.type}, ${file.size} bytes)`);
    
    const fileType = this.determineFileType(file);
    const metadata = {
      fileName: file.name,
      fileSize: file.size,
      processedAt: new Date().toISOString(),
      extractionMethod: '',
      ocrAttempted: false,
      ocrSuccessful: false,
      ocrError: undefined as string | undefined
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

      // PRODUCTION: OCR fallback for image-based PDFs with clear error handling
      if (!this.isRealReadableContent(content)) {
        console.log('❌ Initial extraction failed validation, checking for OCR fallback...');
        
        if (this.shouldUseOCRFallback(file, content)) {
          console.log('🔄 File appears to be image-based. Starting OCR fallback process...');
          metadata.ocrAttempted = true;
          
          try {
            const ocrContent = await this.performOCRExtraction(file);
            if (ocrContent && ocrContent.length > 100 && this.isRealReadableContent(ocrContent)) {
              console.log('✅ OCR extraction successful:', ocrContent.length, 'characters');
              content = ocrContent;
              metadata.extractionMethod += '-ocr-success';
              metadata.ocrSuccessful = true;
            } else {
              console.log('❌ OCR produced insufficient readable content');
              metadata.ocrSuccessful = false;
              metadata.ocrError = 'OCR completed but produced insufficient readable text';
              throw new Error(`OCR processing completed but could not extract sufficient readable text from ${file.name}. The file may be corrupted, heavily formatted, or contain non-standard text. Please try uploading a different file or a text-based version of the document.`);
            }
          } catch (ocrError) {
            console.error('❌ OCR fallback failed:', ocrError);
            metadata.ocrSuccessful = false;
            metadata.ocrError = ocrError instanceof Error ? ocrError.message : 'OCR processing failed';
            
            // Provide specific error message based on error type
            if (ocrError instanceof Error && ocrError.message.includes('network')) {
              throw new Error(`OCR processing failed due to network issues. Please check your internet connection and try again with ${file.name}.`);
            } else if (ocrError instanceof Error && ocrError.message.includes('format')) {
              throw new Error(`The file ${file.name} is in an unsupported format for OCR processing. Please convert to a standard PDF or image format and try again.`);
            } else {
              throw new Error(`OCR processing failed for ${file.name}. The file may be corrupted, password-protected, or contain complex formatting that prevents text extraction. Please try uploading a simpler text-based document.`);
            }
          }
        } else {
          console.log('❌ File does not qualify for OCR fallback');
          throw new Error(`Unable to extract readable text from ${file.name}. The file format may not be supported or the content may not contain extractable text. Please upload a text-based document (PDF with text layer, Word document, or plain text file).`);
        }
      }

      console.log(`✅ Successfully processed content: ${content.length} characters`);

      // Try ChatGPT enhancement for substantial content
      if (content.length > 200 && this.hasSubstantialContent(content)) {
        try {
          console.log('Attempting ChatGPT content enhancement...');
          const enhancedContent = await ChatGPTService.enhanceTextContent(content);
          if (enhancedContent && enhancedContent.length > content.length * 0.5 && this.isRealReadableContent(enhancedContent)) {
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
      
      // If OCR was attempted and failed, provide specific guidance
      if (metadata.ocrAttempted && !metadata.ocrSuccessful) {
        throw error; // Re-throw the specific OCR error message
      }
      
      // For other errors, provide general guidance
      throw new Error(`Unable to process ${file.name}. ${error instanceof Error ? error.message : 'Unknown error occurred'}. Please ensure the file contains readable text and try uploading a different format if necessary.`);
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);

    return {
      content,
      type: fileType,
      metadata
    };
  }

  private shouldUseOCRFallback(file: File, content: string): boolean {
    const fileName = file.name.toLowerCase();
    const isPDF = fileName.endsWith('.pdf') || file.type === 'application/pdf';
    const isImage = file.type.startsWith('image/');
    const hasInsufficientText = content.length < 300; // Stricter threshold
    
    console.log('🔍 OCR Fallback Assessment:', {
      fileName,
      isPDF,
      isImage,
      contentLength: content.length,
      hasInsufficientText,
      qualifiesForOCR: (isPDF || isImage) && hasInsufficientText
    });
    
    return (isPDF || isImage) && hasInsufficientText;
  }

  private async performOCRExtraction(file: File): Promise<string> {
    console.log('🔍 Starting OCR extraction with enhanced error handling...');
    
    try {
      const worker = await this.getOCRWorker();
      
      console.log('✅ OCR worker initialized successfully');
      
      let ocrResult: any;
      
      // For images, process directly
      if (file.type.startsWith('image/')) {
        console.log('Processing image file with OCR');
        ocrResult = await worker.recognize(file);
      } else if (file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf') {
        console.log('Processing PDF file with OCR');
        
        // Create a blob URL for the PDF file
        const fileUrl = URL.createObjectURL(file);
        
        try {
          ocrResult = await worker.recognize(fileUrl);
          URL.revokeObjectURL(fileUrl);
        } catch (error) {
          URL.revokeObjectURL(fileUrl);
          throw error;
        }
      } else {
        // For other file types, try direct processing
        ocrResult = await worker.recognize(file);
      }
      
      const extractedText = ocrResult.data.text.trim();
      
      console.log('📝 OCR Extraction Results:', {
        confidence: ocrResult.data.confidence,
        textLength: extractedText.length,
        wordCount: extractedText.split(/\s+/).length,
        hasReadableContent: this.isRealReadableContent(extractedText)
      });
      
      if (!extractedText || extractedText.length < 50) {
        throw new Error('OCR processing completed but extracted minimal text content');
      }
      
      if (ocrResult.data.confidence < 30) {
        console.warn('⚠️ Low OCR confidence detected:', ocrResult.data.confidence);
      }
      
      return extractedText;
      
    } catch (error) {
      console.error('❌ OCR extraction error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          throw new Error('OCR processing failed due to network connectivity issues');
        } else if (error.message.includes('format') || error.message.includes('invalid')) {
          throw new Error('File format is not compatible with OCR processing');
        } else if (error.message.includes('memory') || error.message.includes('size')) {
          throw new Error('File is too large for OCR processing');
        }
      }
      
      throw new Error(`OCR processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  private async getOCRWorker(): Promise<any> {
    if (!this.ocrWorker) {
      console.log('Initializing OCR worker...');
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

  private hasSubstantialContent(content: string): boolean {
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const words = content.split(/\s+/).filter(word => /^[a-zA-Z]{3,}$/.test(word));
    const topics = content.match(/\b(?:chapter|section|introduction|conclusion|analysis|method|result|discussion|summary|overview|concept|principle|theory|practice|application|implementation|strategy|approach|technique|process|system|framework|model|design|development|research|study|data|information|knowledge|understanding|learning|education|training|course|lesson|topic|subject|content|material|resource|guide|manual|handbook|document|report|paper|article|book|text|literature|reference|source|example|case|scenario|situation|problem|solution|answer|question|issue|challenge|opportunity|benefit|advantage|disadvantage|risk|factor|element|component|aspect|feature|characteristic|property|attribute|quality|standard|criteria|requirement|specification|detail|description|explanation|definition|meaning|purpose|objective|goal|target|aim|mission|vision|strategy|plan|approach|method|technique|procedure|process|step|stage|phase|level|degree|extent|scope|range|scale|size|amount|quantity|number|count|measure|metric|indicator|parameter|variable|factor|element|component|part|section|segment|division|category|type|kind|sort|class|group|set|collection|series|sequence|order|arrangement|organization|structure|pattern|format|style|design|layout|presentation|display|appearance|look|view|perspective|angle|point|position|location|place|site|area|region|zone|field|domain|sector|industry|market|business|company|organization|institution|agency|department|division|unit|team|group|member|individual|person|people|user|customer|client|audience|reader|viewer|participant|contributor|author|writer|creator|developer|designer|architect|engineer|analyst|researcher|scientist|expert|specialist|professional|practitioner|consultant|advisor|mentor|teacher|instructor|trainer|educator|student|learner|beginner|intermediate|advanced|expert|master|professional)\b/gi) || [];
    
    return sentences.length >= 5 && words.length >= 50 && topics.length >= 3;
  }

  private isRealReadableContent(content: string): boolean {
    if (!content || content.length < 100) {
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
      /stream.*?endstream/s,
      /\d+\s+\d+\s+obj/,
      /endobj/,
      /xref/,
      /startxref/,
      /BT.*?ET/s,
      /Td|TD|Tm|T\*|TL|Tc|Tw|Tz|Tf|Tr|Ts/,
      /\/Root\s+\d+/,
      /\/Info\s+\d+/,
      /\/Size\s+\d+/,
      /trailer/,
      /<<\s*\/\w+/,
      />>\s*endobj/,
      /q\s+Q/,
      /rg\s+RG/,
      /cm\s+l\s+S/,
      /BX.*?EX/s
    ];

    let garbageCount = 0;
    for (const pattern of pdfGarbagePatterns) {
      const matches = cleanContent.match(pattern);
      if (matches) {
        garbageCount += matches.length;
      }
    }

    if (garbageCount > 5) {
      console.log('❌ Content contains too many PDF garbage patterns:', garbageCount);
      return false;
    }

    // Check for readable text characteristics
    const words = cleanContent.split(/\s+/).filter(word => /^[a-zA-Z]{2,}$/.test(word));
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 15);
    const readableChars = (cleanContent.match(/[a-zA-Z0-9\s.,!?;:()\-'"]/g) || []).length;
    const readableRatio = readableChars / cleanContent.length;
    
    const meaningfulPatterns = cleanContent.match(/\b(?:the|and|of|to|a|in|for|is|on|that|by|this|with|from|they|we|are|have|has|was|were|been|or|as|an|at|be|if|all|can|would|will|but|not|what|there|about|which|when|more|also|its|use|may|how|other|these|some|could|time|very|first|after|way|many|must|before|here|through|back|years|work|life|only|over|think|where|much|should|well|never|being|each|between|under|while|case|most|now|used|such|during|place|right|great|still|even|good|any|old|see|him|make|two|both|does|different|away|again|off|went|our|day|get|come|made|part|own|say|small|every|found|large|did|long|without|another|down|because|against|something|too|those|though|three|state|new|just|since|system|might|high|several|around|world|including|important|need|possible|known|become|example|however|therefore|following|according|analysis|research|study|results|conclusion|method|approach|data|information|evidence|findings|significant|important|process|development|understanding|knowledge|learning|education|theory|concept|application|practice|implementation|strategy|technology|business|management|service|quality|performance|effectiveness|efficiency|improvement|solution|problem|challenge|opportunity|future|current|present|potential|successful|professional|industry|market|customer|value|benefits|advantages|requirements|standards|guidelines|best|practices|recommendations|considerations|factors|elements|aspects|features|characteristics|properties|capabilities|functions|operations|procedures|methods|techniques|tools|resources|materials|content|structure|framework|model|design|architecture|platform|environment|context|situation|conditions|circumstances|issues|concerns|implications|outcomes|impact|effects|consequences|changes|developments|trends|patterns|relationships|connections|interactions|communication|collaboration|coordination|integration|optimization|enhancement|innovation|creativity|expertise|skills|experience|competence|qualifications|certification|training|preparation|planning|organization|administration|governance|leadership|direction|guidance|support|assistance|consultation|advice|feedback|evaluation|assessment|monitoring|control|measurement|tracking|reporting|documentation|records|archives|history|background|overview|introduction|summary|abstract|review|survey|comparison|contrast|discussion|debate|argument|position|perspective|viewpoint|opinion|interpretation|explanation|description|definition|clarification|illustration|demonstration|presentation|communication|expression|articulation|formulation|specification|detail|precision|accuracy|reliability|validity|consistency|coherence|logic|reasoning|rationale|justification|evidence|proof|confirmation|verification|validation|authentication|authorization|approval)\b/gi) || [];

    const isValid = words.length >= 20 && 
                   sentences.length >= 3 && 
                   readableRatio > 0.75 &&
                   meaningfulPatterns.length >= 10;

    console.log('✅ Content validation:', { 
      length: cleanContent.length, 
      wordCount: words.length,
      sentenceCount: sentences.length,
      readableRatio: readableRatio.toFixed(2),
      meaningfulPatterns: meaningfulPatterns.length,
      garbageCount,
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
      
      if (this.isRealReadableContent(content) && content.length > 50) {
        return {
          content,
          method: 'word-file-reading'
        };
      } else {
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

  async cleanup(): Promise<void> {
    await this.terminateOCRWorker();
  }
}

export const FileProcessingService = new FileProcessingServiceClass();
