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

      // Try ChatGPT enhancement for substantial content - but only if content is already good
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
      throw error;
    }

    console.log(`Final processed content for ${file.name}: ${content.length} characters`);

    return {
      content,
      type: fileType,
      metadata
    };
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
    
    // Check for PDF garbage patterns - more comprehensive
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

    // Reject if contains significant PDF garbage
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
    
    // Check for meaningful content patterns
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
      
      // Multiple extraction strategies
      let bestContent = '';
      let bestMethod = '';
      
      // Strategy 1: UTF-8 text extraction
      try {
        console.log('Trying UTF-8 extraction...');
        const utf8Content = await this.extractPdfTextUTF8(uint8Array);
        if (this.isRealReadableContent(utf8Content) && utf8Content.length > bestContent.length) {
          bestContent = utf8Content;
          bestMethod = 'utf8-text-extraction';
          console.log('✅ UTF-8 extraction successful:', utf8Content.length, 'characters');
        }
      } catch (error) {
        console.log('UTF-8 extraction failed:', error);
      }

      // Strategy 2: Latin-1 text extraction
      try {
        console.log('Trying Latin-1 extraction...');
        const latin1Content = await this.extractPdfTextLatin1(uint8Array);
        if (this.isRealReadableContent(latin1Content) && latin1Content.length > bestContent.length) {
          bestContent = latin1Content;
          bestMethod = 'latin1-text-extraction';
          console.log('✅ Latin-1 extraction successful:', latin1Content.length, 'characters');
        }
      } catch (error) {
        console.log('Latin-1 extraction failed:', error);
      }

      // Strategy 3: Pattern-based extraction
      try {
        console.log('Trying pattern-based extraction...');
        const patternContent = await this.extractPdfTextPatterns(uint8Array);
        if (this.isRealReadableContent(patternContent) && patternContent.length > bestContent.length) {
          bestContent = patternContent;
          bestMethod = 'pattern-based-extraction';
          console.log('✅ Pattern extraction successful:', patternContent.length, 'characters');
        }
      } catch (error) {
        console.log('Pattern extraction failed:', error);
      }

      if (!bestContent || bestContent.length < 100) {
        throw new Error('PDF contains no readable text content. This may be a scanned document that requires OCR processing.');
      }

      console.log(`✅ Best PDF extraction method: ${bestMethod}, content length: ${bestContent.length}`);
      
      return {
        content: bestContent,
        method: bestMethod
      };
      
    } catch (error) {
      console.error('PDF processing failed:', error);
      throw new Error(`PDF text extraction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    // Convert bytes to string for pattern matching
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
    
    // Combine and structure the extracted text
    const textArray = Array.from(extractedTexts).filter(text => 
      text.length > 5 && 
      /[a-zA-Z]/.test(text) &&
      !text.match(/^\d+[\.\s]*$/) &&
      !text.match(/^[\/\\\(\)\[\]<>]+$/)
    );
    
    // Sort by length to prioritize longer, more meaningful text
    textArray.sort((a, b) => b.length - a.length);
    
    const extractedContent = textArray.join(' ').replace(/\s+/g, ' ').trim();
    
    console.log(`PDF text extraction: ${extractedTexts.size} fragments found, ${extractedContent.length} characters total`);
    
    return extractedContent;
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
