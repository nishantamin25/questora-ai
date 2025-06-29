import { ChatGPTService } from './ChatGPTService';
import { ChatGPTPDFProcessor } from './chatgpt/ChatGPTPDFProcessor';
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
    console.log(`🔍 SIMPLE FILE PROCESSING: ${file.name} (${file.type}, ${file.size} bytes)`);
    
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
        validationStage: 'initial',
        ocrQualificationCheck: {}
      }
    };

    let content = '';

    try {
      if (fileType === 'text' && this.isPDFFile(file)) {
        console.log('🤖 PROCESSING PDF WITH SIMPLE EXTRACTION...');
        try {
          const chatGPTResult = await ChatGPTPDFProcessor.processPDFWithChatGPT(file);
          content = chatGPTResult.content;
          metadata.extractionMethod = 'chatgpt-pdf-simple';
          
          console.log('✅ PDF PROCESSING SUCCESS:', {
            contentLength: content.length,
            wordCount: chatGPTResult.analysis.wordCount
          });
          
        } catch (chatGPTError) {
          console.error('❌ PDF processing failed:', chatGPTError);
          throw new Error(`PDF processing failed: ${chatGPTError instanceof Error ? chatGPTError.message : 'Unknown error'}`);
        }
      } else {
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
      }

      // SIMPLIFIED: Just check we got some content
      if (!content || content.length < 20) {
        console.error('❌ INSUFFICIENT CONTENT:', {
          fileName: file.name,
          contentLength: content?.length || 0,
          extractionMethod: metadata.extractionMethod
        });
        throw new Error(`Could not extract readable content from "${file.name}". Please ensure the file contains readable text.`);
      }

      metadata.diagnostics!.initialContentLength = content.length;
      metadata.diagnostics!.contentPreview = content.substring(0, 200) + '...';
      metadata.diagnostics!.validationStage = 'final';

      console.log('✅ FILE PROCESSING SUCCESSFUL:', {
        fileName: file.name,
        contentLength: content.length,
        extractionMethod: metadata.extractionMethod
      });

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

  private isPDFFile(file: File): boolean {
    return file.name.toLowerCase().endsWith('.pdf') || file.type === 'application/pdf';
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
    console.log('⚠️ Using legacy PDF processing - should use ChatGPT instead');
    throw new Error('Legacy PDF processing not supported - use enhanced PDF processor');
  }

  private async processWordFile(file: File): Promise<{ content: string; method: string }> {
    try {
      const content = await this.readFileAsText(file);
      if (content.length < 10) {
        throw new Error('Word file contains insufficient readable content');
      }
      return {
        content,
        method: 'word-file-reading'
      };
    } catch (error) {
      console.error('Word file processing failed:', error);
      throw new Error(`Word file processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processVideoFile(file: File): Promise<string> {
    throw new Error('Video file processing not supported. Please upload text-based files (PDF, TXT, DOC) with readable content.');
  }

  private async processImageFile(file: File): Promise<string> {
    throw new Error('Image file processing not supported. Please upload text-based files (PDF, TXT, DOC) with readable content.');
  }

  private async processGenericFile(file: File): Promise<string> {
    try {
      const content = await this.readFileAsText(file);
      if (content.length < 10) {
        throw new Error('File contains insufficient readable content');
      }
      return content;
    } catch (error) {
      throw new Error(`Generic file processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      this.ocrWorker = null;
    }
  }
}

export const FileProcessingService = new FileProcessingServiceClass();
