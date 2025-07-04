
import { ApiKeyManager } from './ApiKeyManager';
import { ApiCallService } from './ApiCallService';
import { PDFTextExtractor } from './PDFTextExtractor';

export class ChatGPTPDFProcessor {
  static async processPDFWithChatGPT(file: File): Promise<{
    content: string;
    analysis: {
      type: string;
      complexity: 'basic' | 'intermediate' | 'advanced';
      keyTopics: string[];
      wordCount: number;
      isEducational: boolean;
    };
  }> {
    console.log('🤖 PROCESSING PDF WITH CHATGPT:', file.name);

    if (!ApiKeyManager.hasApiKey()) {
      throw new Error('OpenAI API key required for PDF processing');
    }

    try {
      // STEP 1: Extract base64 from PDF for maximum accuracy
      console.log('📄 Converting PDF to base64 for ChatGPT processing...');
      const base64Data = await this.fileToBase64(file);
      
      console.log('✅ PDF conversion successful:', {
        size: Math.round(base64Data.length * 0.75 / 1024) + 'KB',
        fileName: file.name
      });
      
      // STEP 2: Use ChatGPT to extract and analyze with maximum accuracy
      const systemPrompt = `You are an expert PDF content extractor and analyzer. Your task is to:

1. Extract ALL text content from the provided PDF with maximum accuracy
2. Preserve formatting, structure, and hierarchy
3. Maintain tables, lists, and special formatting
4. Clean up any extraction artifacts while preserving all meaningful content
5. Analyze the content for educational value and complexity

CRITICAL: Extract every single word, number, and piece of information from the document. Do not summarize or condense - provide complete, verbatim extraction.

Return your response in this exact JSON format:
{
  "cleanedContent": "The complete extracted text content with perfect accuracy",
  "analysis": {
    "type": "educational|business|technical|research|other",
    "complexity": "basic|intermediate|advanced", 
    "keyTopics": ["topic1", "topic2", "topic3"],
    "wordCount": number,
    "isEducational": true|false,
    "summary": "Brief summary of the content"
  }
}`;

      const userPrompt = `Please extract ALL content from this PDF with maximum accuracy. Extract every word, number, table, list, and piece of information. Maintain the original structure and formatting as much as possible.`;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: userPrompt
            },
            {
              type: 'input_file',
              filename: file.name,
              file_data: base64Data
            }
          ]
        }
      ];

      const requestBody = {
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_tokens: 8000,
        temperature: 0.0, // Maximum accuracy
        response_format: { type: "json_object" }
      };

      console.log('📤 Sending PDF to ChatGPT for high-accuracy extraction...');
      const response = await ApiCallService.makeApiCall(requestBody, 'CHATGPT_HIGH_ACCURACY_PDF_EXTRACTION');

      if (!response) {
        throw new Error('No response from ChatGPT PDF extraction');
      }

      const parsedResponse = JSON.parse(response);
      
      if (!parsedResponse.cleanedContent || !parsedResponse.analysis) {
        throw new Error('Invalid response format from ChatGPT PDF extraction');
      }

      console.log('✅ CHATGPT HIGH-ACCURACY PDF EXTRACTION SUCCESS:', {
        extractedLength: parsedResponse.cleanedContent.length,
        wordCount: parsedResponse.analysis.wordCount,
        type: parsedResponse.analysis.type,
        complexity: parsedResponse.analysis.complexity,
        isEducational: parsedResponse.analysis.isEducational
      });

      return {
        content: parsedResponse.cleanedContent,
        analysis: parsedResponse.analysis
      };

    } catch (error) {
      console.error('❌ ChatGPT high-accuracy PDF processing failed:', error);
      throw new Error(`ChatGPT PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private static async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        const result = e.target?.result as string;
        // Remove the data URL prefix to get just the base64 data
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to convert file to base64'));
      };
      
      reader.readAsDataURL(file);
    });
  }

  static async extractTextWithFallback(file: File): Promise<string> {
    try {
      const result = await this.processPDFWithChatGPT(file);
      return result.content;
    } catch (error) {
      console.error('ChatGPT PDF processing failed:', error);
      
      // Try direct text extraction as last resort
      try {
        console.log('🔄 Attempting direct PDF text extraction as fallback...');
        const directText = await PDFTextExtractor.extractTextFromPDF(file);
        if (directText && directText.length > 200) {
          return directText;
        }
      } catch (directError) {
        console.error('Direct extraction also failed:', directError);
      }
      
      throw new Error(`PDF processing completely failed. The file "${file.name}" may be image-based, corrupted, or password-protected. Please ensure the PDF contains selectable text.`);
    }
  }
}
