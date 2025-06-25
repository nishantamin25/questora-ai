
import { ApiKeyManager } from './ApiKeyManager';

export class ImageAnalysisService {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    const apiKey = ApiKeyManager.getApiKey();
    
    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
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
          ],
          max_tokens: 1500,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Unable to analyze image content.';
    } catch (error) {
      console.error('Error analyzing image:', error);
      throw new Error('Failed to analyze image with ChatGPT');
    }
  }
}
