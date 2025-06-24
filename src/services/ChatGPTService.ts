import { LanguageService } from './LanguageService';

class ChatGPTServiceClass {
  private readonly OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';

  async generateQuestions(
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<any[]> {
    const apiKey = this.getApiKey();
    const language = LanguageService.getCurrentLanguage();

    let fullPrompt = `Generate ${numberOfQuestions} ${difficulty} difficulty multiple-choice questions about: ${prompt}.`;

    if (fileContent) {
      fullPrompt += ` The questions should be based on the following content: ${fileContent}.`;
    }

    if (totalSets > 1) {
      fullPrompt += ` This is set ${setNumber} of ${totalSets}, so ensure the questions are unique and do not overlap with other sets.`;
    }

    fullPrompt += ` Each question should have 4 options and indicate the correct answer (0, 1, 2, or 3). Also, include a brief explanation for each answer. The response should be a JSON array of question objects.`;

    if (language !== 'en') {
      fullPrompt += ` Translate the questions and explanations to ${language}.`;
    }

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
              role: 'system',
              content: 'You are a quiz question generator. Generate multiple-choice questions with 4 options, a correct answer, and an explanation.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        console.error('OpenAI API Error:', response.status, response.statusText);
        const errorData = await response.json();
        console.error('OpenAI API Error Details:', errorData);
        throw new Error(`OpenAI API request failed with status ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.warn('No content received from OpenAI. Full response:', data);
        throw new Error('No content received from OpenAI');
      }

      try {
        const questions = JSON.parse(content);
        if (!Array.isArray(questions)) {
          console.error('Invalid questions format. Expected an array. Received:', questions);
          throw new Error('Invalid questions format from OpenAI');
        }
        return questions;
      } catch (parseError) {
        console.error('Error parsing JSON from OpenAI:', parseError);
        console.error('Content received from OpenAI:', content);
        throw new Error('Failed to parse questions from OpenAI response');
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      throw error;
    }
  }

  async analyzeImage(base64Image: string, prompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    
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

  async enhanceTextContent(textContent: string): Promise<string> {
    const apiKey = this.getApiKey();
    
    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are an educational content enhancer. Extract, clean, and enhance the provided text content to make it suitable for educational course generation and assessment. Focus on creating clear, structured educational material.'
            },
            {
              role: 'user',
              content: `Please enhance this text content for educational use. Extract key information, organize it logically, and expand on important concepts to create comprehensive educational material:\n\n${textContent}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.5
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || textContent;
    } catch (error) {
      console.error('Error enhancing text content:', error);
      throw new Error('Failed to enhance text content with ChatGPT');
    }
  }

  async generateContent(prompt: string): Promise<string> {
    const apiKey = this.getApiKey();
    
    try {
      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are an educational content generator. Create comprehensive, well-structured educational material suitable for course generation and assessment. Focus on providing substantial content that covers key concepts, practical applications, and learning objectives.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'Unable to generate content.';
    } catch (error) {
      console.error('Error generating content:', error);
      throw new Error('Failed to generate content with ChatGPT');
    }
  }

  // Public method to get API key status
  public hasApiKey(): boolean {
    const apiKey = localStorage.getItem('openai_api_key');
    return !!apiKey;
  }

  // Public method to set API key
  public setApiKey(apiKey: string): void {
    localStorage.setItem('openai_api_key', apiKey);
  }

  // Public method to clear API key
  public clearApiKey(): void {
    localStorage.removeItem('openai_api_key');
  }

  // Public method to get API key (used internally and by other services)
  public getApiKey(): string {
    const apiKey = localStorage.getItem('openai_api_key');
    if (!apiKey) {
      console.warn('No OpenAI API key found in localStorage. Please set it in the settings.');
      return '';
    }
    return apiKey;
  }
}

export const ChatGPTService = new ChatGPTServiceClass();
