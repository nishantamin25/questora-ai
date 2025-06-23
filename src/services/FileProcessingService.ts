
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

    switch (fileType) {
      case 'text':
        const result = await this.processTextFile(file);
        content = result.content;
        metadata.extractionMethod = result.method;
        break;
      case 'video':
        content = await this.processVideoFile(file);
        metadata.extractionMethod = 'video-metadata-extraction';
        break;
      case 'image':
        content = await this.processImageFile(file);
        metadata.extractionMethod = 'image-metadata-extraction';
        break;
      default:
        content = await this.processGenericFile(file);
        metadata.extractionMethod = 'generic-text-extraction';
    }

    return {
      content: this.cleanContent(content),
      type: fileType,
      metadata
    };
  }

  private determineFileType(file: File): 'text' | 'video' | 'image' | 'other' {
    const fileName = file.name.toLowerCase();
    const mimeType = file.type.toLowerCase();

    // Text files
    if (
      mimeType.startsWith('text/') ||
      mimeType === 'application/pdf' ||
      fileName.endsWith('.txt') ||
      fileName.endsWith('.doc') ||
      fileName.endsWith('.docx') ||
      fileName.endsWith('.pdf') ||
      fileName.endsWith('.md') ||
      fileName.endsWith('.csv')
    ) {
      return 'text';
    }

    // Video files
    if (
      mimeType.startsWith('video/') ||
      fileName.endsWith('.mp4') ||
      fileName.endsWith('.avi') ||
      fileName.endsWith('.mov') ||
      fileName.endsWith('.wmv') ||
      fileName.endsWith('.webm')
    ) {
      return 'video';
    }

    // Image files
    if (
      mimeType.startsWith('image/') ||
      fileName.endsWith('.jpg') ||
      fileName.endsWith('.jpeg') ||
      fileName.endsWith('.png') ||
      fileName.endsWith('.svg') ||
      fileName.endsWith('.gif') ||
      fileName.endsWith('.bmp') ||
      fileName.endsWith('.webp')
    ) {
      return 'image';
    }

    return 'other';
  }

  private async processTextFile(file: File): Promise<{ content: string; method: string }> {
    const fileName = file.name.toLowerCase();
    
    try {
      if (fileName.endsWith('.pdf')) {
        return await this.processPdfFile(file);
      } else if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) {
        return await this.processWordFile(file);
      } else {
        // Plain text files
        const content = await this.readFileAsText(file);
        return {
          content,
          method: 'text-file-reading'
        };
      }
    } catch (error) {
      console.error(`Error processing text file ${file.name}:`, error);
      return {
        content: `[Error processing ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}]`,
        method: 'error-fallback'
      };
    }
  }

  private async processPdfFile(file: File): Promise<{ content: string; method: string }> {
    try {
      // For now, we'll extract basic metadata and readable text
      // In a production environment, you'd use a PDF parsing library like pdf-parse
      const content = await this.readFileAsText(file);
      
      // Check if content looks like binary PDF data
      if (this.isPdfBinaryContent(content)) {
        return {
          content: this.extractPdfMetadata(file),
          method: 'pdf-metadata-extraction'
        };
      }
      
      // If we can read it as text, clean it up
      return {
        content: this.cleanPdfText(content),
        method: 'pdf-text-extraction'
      };
    } catch (error) {
      return {
        content: this.extractPdfMetadata(file),
        method: 'pdf-fallback-metadata'
      };
    }
  }

  private async processWordFile(file: File): Promise<{ content: string; method: string }> {
    try {
      // For Word documents, we'll attempt text extraction
      // In a production environment, you'd use libraries like mammoth.js for .docx
      const content = await this.readFileAsText(file);
      
      if (this.isWordBinaryContent(content)) {
        return {
          content: this.extractWordMetadata(file),
          method: 'word-metadata-extraction'
        };
      }
      
      return {
        content: this.cleanWordText(content),
        method: 'word-text-extraction'
      };
    } catch (error) {
      return {
        content: this.extractWordMetadata(file),
        method: 'word-fallback-metadata'
      };
    }
  }

  private async processVideoFile(file: File): Promise<string> {
    // For video files, we'll extract metadata and provide instructions for transcript
    // In a production environment, you'd integrate with speech-to-text services
    
    const videoInfo = {
      fileName: file.name,
      fileSize: Math.round(file.size / (1024 * 1024)),
      duration: 'Unknown',
      format: file.type || 'video/mp4'
    };

    return `Video File Analysis:
File: ${videoInfo.fileName}
Size: ${videoInfo.fileSize}MB
Format: ${videoInfo.format}

Content Type: Video content for educational analysis
Processing Note: This video file contains audio/visual content that would benefit from:
1. Speech-to-text transcription of any spoken content
2. Visual analysis of any text, diagrams, or educational materials
3. Extraction of key topics and concepts for question generation

For optimal question generation, consider:
- Main topics discussed in the video
- Key concepts or learning objectives
- Important facts or data presented
- Educational content suitable for assessment

Recommended Question Types:
- Comprehension questions about main concepts
- Application questions based on examples shown
- Analysis questions about processes or methods demonstrated`;
  }

  private async processImageFile(file: File): Promise<string> {
    // For image files, we'll extract metadata and provide OCR-style analysis
    // In a production environment, you'd integrate with OCR services like Tesseract.js
    
    const imageInfo = {
      fileName: file.name,
      fileSize: Math.round(file.size / 1024),
      format: file.type || this.getImageFormat(file.name)
    };

    return `Image File Analysis:
File: ${imageInfo.fileName}
Size: ${imageInfo.fileSize}KB
Format: ${imageInfo.format}

Content Type: Visual/Diagram content for educational analysis
Processing Note: This image file may contain:
1. Text content that can be extracted via OCR
2. Diagrams, charts, or educational visuals
3. Infographics with embedded information
4. Screenshots of educational content

For optimal question generation, consider:
- Any visible text content in the image
- Diagram labels, captions, or annotations
- Educational concepts illustrated
- Data or information presented visually

Recommended Question Types:
- Questions about text content visible in the image
- Comprehension questions about diagrams or charts
- Analysis questions about visual data presentation
- Application questions based on illustrated concepts`;
  }

  private async processGenericFile(file: File): Promise<string> {
    try {
      const content = await this.readFileAsText(file);
      
      if (this.isReadableText(content)) {
        return content;
      } else {
        return this.extractGenericMetadata(file);
      }
    } catch (error) {
      return this.extractGenericMetadata(file);
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

  private isPdfBinaryContent(content: string): boolean {
    const pdfIndicators = [
      /^\s*%PDF/,
      /<<\s*\/Type\s*\/Catalog/,
      /obj\s*<<.*>>/,
      /endstream/,
      /^\s*\d+\s+\d+\s+obj/,
      /%����/
    ];
    
    return pdfIndicators.some(indicator => indicator.test(content));
  }

  private isWordBinaryContent(content: string): boolean {
    const wordIndicators = [
      /PK\x03\x04/, // ZIP signature for .docx
      /\xd0\xcf\x11\xe0/, // OLE signature for .doc
      /Microsoft Office/,
      /word\//i
    ];
    
    return wordIndicators.some(indicator => indicator.test(content));
  }

  private isReadableText(content: string): boolean {
    if (!content || content.length < 10) return false;
    
    const readableChars = (content.match(/[a-zA-Z0-9\s.,!?]/g) || []).length;
    const totalChars = content.length;
    const readableRatio = readableChars / totalChars;
    
    return readableRatio > 0.7;
  }

  private cleanContent(content: string): string {
    if (!content) return '';
    
    // Remove excessive whitespace
    content = content.replace(/\s+/g, ' ').trim();
    
    // Remove binary artifacts
    content = content.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x9F]/g, '');
    
    // Clean up common PDF artifacts
    content = content.replace(/%PDF-[\d.]+/g, '');
    content = content.replace(/obj\s*<<.*?>>/g, '');
    content = content.replace(/endstream/g, '');
    content = content.replace(/\d+\s+\d+\s+obj/g, '');
    
    // Remove excessive line breaks
    content = content.replace(/\n{3,}/g, '\n\n');
    
    return content.trim();
  }

  private cleanPdfText(content: string): string {
    let cleaned = content;
    
    // Remove PDF-specific markers
    cleaned = cleaned.replace(/%PDF-[\d.]+/g, '');
    cleaned = cleaned.replace(/%%EOF/g, '');
    cleaned = cleaned.replace(/trailer/g, '');
    cleaned = cleaned.replace(/xref/g, '');
    cleaned = cleaned.replace(/startx?ref/g, '');
    
    // Remove object references
    cleaned = cleaned.replace(/\d+\s+\d+\s+obj/g, '');
    cleaned = cleaned.replace(/endobj/g, '');
    
    // Clean stream markers
    cleaned = cleaned.replace(/stream\s*/g, '');
    cleaned = cleaned.replace(/endstream/g, '');
    
    return this.cleanContent(cleaned);
  }

  private cleanWordText(content: string): string {
    let cleaned = content;
    
    // Remove Word-specific artifacts
    cleaned = cleaned.replace(/Microsoft Office Word/g, '');
    cleaned = cleaned.replace(/\[Content_Types\]\.xml/g, '');
    cleaned = cleaned.replace(/word\/_rels\/document\.xml\.rels/g, '');
    
    return this.cleanContent(cleaned);
  }

  private extractPdfMetadata(file: File): string {
    return `PDF Document Analysis:
File Name: ${file.name}
File Size: ${Math.round(file.size / 1024)}KB
Content Type: PDF document

Note: This appears to be a PDF file with binary content. For optimal question generation:
1. The document likely contains structured text, images, or formatted content
2. Consider the document's educational purpose and subject matter
3. Generate questions based on typical PDF content types (reports, articles, educational materials)

Recommended Question Approaches:
- Focus on main topics typically found in PDF documents
- Create comprehension questions about document structure
- Generate analysis questions about content organization
- Include application questions based on document purpose`;
  }

  private extractWordMetadata(file: File): string {
    return `Word Document Analysis:
File Name: ${file.name}
File Size: ${Math.round(file.size / 1024)}KB
Content Type: Microsoft Word document

Note: This appears to be a Word document with formatted content. For optimal question generation:
1. The document likely contains structured text with headings and sections
2. Consider typical Word document content (reports, essays, instructions)
3. Generate questions based on document organization and content

Recommended Question Approaches:
- Create questions about document structure and main points
- Focus on comprehension of written content
- Generate analysis questions about document purpose
- Include application questions based on document type`;
  }

  private extractGenericMetadata(file: File): string {
    return `File Analysis:
File Name: ${file.name}
File Size: ${Math.round(file.size / 1024)}KB
Content Type: ${file.type || 'Unknown'}

Note: This file contains content that requires specialized processing. For question generation:
1. Consider the file's educational context and purpose
2. Generate questions based on the file type and likely content
3. Focus on general comprehension and application

Recommended Question Approaches:
- Create questions about file purpose and context
- Generate comprehension questions about likely content
- Include application questions based on file type`;
  }

  private getImageFormat(fileName: string): string {
    const extension = fileName.split('.').pop()?.toLowerCase();
    const formatMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'svg': 'image/svg+xml',
      'gif': 'image/gif',
      'bmp': 'image/bmp',
      'webp': 'image/webp'
    };
    
    return formatMap[extension || ''] || 'image/unknown';
  }
}

export const FileProcessingService = new FileProcessingServiceClass();
