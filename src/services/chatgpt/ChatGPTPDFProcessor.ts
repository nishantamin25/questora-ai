
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
      // STEP 1: Extract base64 data from PDF
      console.log('📄 Converting PDF to base64...');
      const base64Data = await this.fileToBase64(file);
      
      console.log('✅ PDF base64 conversion successful:', {
        fileSize: file.size,
        base64Length: base64Data.length,
        preview: base64Data.substring(0, 100) + '...'
      });
      
      // STEP 2: Use ChatGPT to process the PDF directly
      const systemPrompt = `You are a PDF content processor. Your task is to:

1. Extract and clean all text content from the provided PDF
2. Remove any PDF artifacts, formatting issues, or corrupted characters
3. Structure the content into readable, educational material
4. Analyze the content for educational value and complexity

Return your response in this exact JSON format:
{
  "cleanedContent": "The cleaned and organized text content from the PDF",
  "analysis": {
    "type": "educational|business|technical|research|other",
    "complexity": "basic|intermediate|advanced", 
    "keyTopics": ["topic1", "topic2", "topic3"],
    "wordCount": number,
    "isEducational": true|false,
    "summary": "Brief summary of the content"
  }
}`;

      const userPrompt = `Please extract and clean the text content from this PDF file. The file name is "${file.name}". Extract all readable text and organize it into a clean, structured format suitable for creating educational questions.`;

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
              type: 'image_url',
              image_url: {
                url: `data:application/pdf;base64,${base64Data}`
              }
            }
          ]
        }
      ];

      const requestBody = {
        model: 'gpt-4-vision-preview',
        messages,
        max_tokens: 4000,
        temperature: 0.1,
        response_format: { type: "json_object" }
      };

      console.log('📤 Sending PDF to ChatGPT for processing...');
      const response = await ApiCallService.makeApiCall(requestBody, 'CHATGPT_PDF_PROCESSING');

      if (!response) {
        throw new Error('No response from ChatGPT PDF processing');
      }

      const parsedResponse = JSON.parse(response);
      
      if (!parsedResponse.cleanedContent || !parsedResponse.analysis) {
        throw new Error('Invalid response format from ChatGPT PDF processing');
      }

      console.log('✅ CHATGPT PDF PROCESSING SUCCESS:', {
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
      
      // Fallback: Try simple text extraction
      try {
        console.log('🔄 Attempting fallback text extraction...');
        const fallbackText = await PDFTextExtractor.extractTextFromPDF(file);
        
        // Check if we got actual content (not just base64)
        if (fallbackText && !fallbackText.includes('base64:') && fallbackText.length > 200) {
          console.log('✅ Fallback extraction successful');
          return {
            content: fallbackText,
            analysis: {
              type: 'document',
              complexity: 'basic',
              keyTopics: ['extracted from PDF'],
              wordCount: fallbackText.split(' ').length,
              isEducational: true
            }
          };
        }
      } catch (fallbackError) {
        console.error('Fallback extraction also failed:', fallbackError);
      }
      
      throw new Error(`PDF processing completely failed. The file "${file.name}" may be image-based, corrupted, or password-protected. Please ensure the PDF contains selectable text.`);
    }
  }

  static async extractTextWithFallback(file: File): Promise<string> {
    try {
      const result = await this.processPDFWithChatGPT(file);
      return result.content;
    } catch (error) {
      console.error('ChatGPT PDF processing failed:', error);
      throw error;
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
}
