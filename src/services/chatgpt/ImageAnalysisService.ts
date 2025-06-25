
import { PayloadValidator } from './PayloadValidator';
import { ApiCallService } from './ApiCallService';

export class ImageAnalysisService {
  async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    console.log('🔍 IMAGE ANALYSIS START:', {
      promptLength: prompt.length,
      hasImage: !!base64Image,
      imageDataLength: base64Image.length
    });

    // Input validation
    if (!base64Image || !prompt) {
      throw new Error('Both image data and prompt are required');
    }

    if (!base64Image.match(/^[A-Za-z0-9+/]+=*$/)) {
      throw new Error('Invalid base64 image format');
    }

    // VALIDATE: Check prompt length
    const wordValidation = PayloadValidator.validateWordCount(prompt, 1000); // Lower limit for vision
    if (!wordValidation.isValid) {
      throw new Error(wordValidation.error!);
    }

    console.log('✅ IMAGE ANALYSIS - Prompt validated:', wordValidation.wordCount, 'words');
    
    // PREPARE: Create properly structured vision messages
    const messages = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`
            }
          }
        ]
      }
    ];

    const maxTokens = 1500;
    const model = 'gpt-4o';

    // VALIDATE: Ensure payload is properly structured for vision
    const payloadValidation = PayloadValidator.validateAndPreparePayload(model, messages, maxTokens);
    
    if (!payloadValidation.isValid) {
      console.error('❌ IMAGE ANALYSIS - Payload validation failed:', payloadValidation.error);
      throw new Error(payloadValidation.error!);
    }

    if (payloadValidation.error) {
      console.warn('⚠️ IMAGE ANALYSIS - Payload warning:', payloadValidation.error);
    }

    const requestBody = {
      model,
      messages: payloadValidation.messages,
      max_tokens: maxTokens,
      temperature: 0.7
    };

    try {
      const content = await ApiCallService.makeApiCall(requestBody, 'IMAGE ANALYSIS');
      
      if (!content) {
        throw new Error('No analysis result from OpenAI API');
      }
      
      console.log('✅ IMAGE ANALYSIS SUCCESS:', content.length, 'characters');
      return content;
    } catch (error) {
      console.error('❌ Image analysis failed:', error);
      throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
