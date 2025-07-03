
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
      // STEP 1: Extract actual text from PDF
      console.log('📄 Extracting text from PDF...');
      const extractedText = await PDFTextExtractor.extractTextFromPDF(file);
      
      // if (!extractedText || extractedText.length < 200) {
      //   throw new Error(`Insufficient text extracted from PDF. Only ${extractedText?.length || 0} characters found. The PDF may be image-based or corrupted.`);
      // }
      
      console.log('✅ PDF text extraction successful:', {
        length: extractedText.length,
        preview: extractedText.substring(0, 200) + '...'
      });
      
      // STEP 2: Use ChatGPT to clean and analyze the extracted text
      const systemPrompt = `You are a PDF content processor. Your task is to:

1. Clean and organize the provided text that was extracted from a PDF
2. Remove any PDF artifacts, formatting issues, or corrupted characters
3. Structure the content into readable, educational material
4. Analyze the content for educational value and complexity

The text may contain some extraction artifacts, so please clean it up while preserving all meaningful content.

Return your response in this exact JSON format:
{
  "cleanedContent": "The cleaned and organized text content",
  "analysis": {
    "type": "educational|business|technical|research|other",
    "complexity": "basic|intermediate|advanced", 
    "keyTopics": ["topic1", "topic2", "topic3"],
    "wordCount": number,
    "isEducational": true|false,
    "summary": "Brief summary of the content"
  }
}`;

      const userPrompt = `The following is a base64-encoded PDF
      Please clean and analyze this text extracted from the PDF file":
      Clean up any extraction artifacts and organize this into readable educational content.
      `;

      const messages = [
        {
          role: 'system',
          content: systemPrompt
        },
        {
          role: 'user', 
          content: userPrompt
        },
        {
          role: 'user',
          content: [
                {
                    type: "input_file",
                    filename: file.name,
                    file_data: `data:application/pdf;base64,${extractedText}`,
                }
            ],
        }
      ];

      const requestBody = {
        model: 'gpt-4.1-2025-04-14',
        messages,
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      };

      console.log('📤 Sending extracted text to ChatGPT for cleaning and analysis...');
      const response = await ApiCallService.makeApiCall(requestBody, 'CHATGPT_PDF_CLEANING');

      if (!response) {
        throw new Error('No response from ChatGPT PDF cleaning');
      }

      const parsedResponse = JSON.parse(response);
      
      if (!parsedResponse.cleanedContent || !parsedResponse.analysis) {
        throw new Error('Invalid response format from ChatGPT PDF cleaning');
      }

      console.log('✅ CHATGPT PDF CLEANING SUCCESS:', {
        originalLength: extractedText.length,
        cleanedLength: parsedResponse.cleanedContent.length,
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
      console.error('❌ ChatGPT PDF processing failed:', error);
      throw new Error(`ChatGPT PDF processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
