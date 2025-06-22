
interface ChatGPTQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface ChatGPTResponse {
  questions: ChatGPTQuestion[];
}

class ChatGPTServiceClass {
  private apiKey: string = '';

  setApiKey(apiKey: string) {
    this.apiKey = apiKey;
    localStorage.setItem('chatgpt_api_key', apiKey);
  }

  getApiKey(): string {
    if (!this.apiKey) {
      this.apiKey = localStorage.getItem('chatgpt_api_key') || '';
    }
    return this.apiKey;
  }

  async generateQuestions(
    prompt: string, 
    numberOfQuestions: number, 
    difficulty: 'easy' | 'medium' | 'hard',
    fileContent?: string
  ): Promise<ChatGPTQuestion[]> {
    const apiKey = this.getApiKey();
    
    if (!apiKey) {
      throw new Error('ChatGPT API key is required');
    }

    const systemPrompt = this.buildSystemPrompt(difficulty);
    const userPrompt = this.buildUserPrompt(prompt, numberOfQuestions, fileContent);

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          max_tokens: 4000,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error:', error);
        throw new Error(error.error?.message || 'Failed to generate questions with ChatGPT');
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        throw new Error('No content received from ChatGPT');
      }

      console.log('ChatGPT response:', content);
      return this.parseQuestions(content);
    } catch (error) {
      console.error('ChatGPT API error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(difficulty: 'easy' | 'medium' | 'hard'): string {
    const difficultyInstructions = {
      easy: 'Create simple, straightforward questions that test basic understanding and recall.',
      medium: 'Create moderately challenging questions that require some analysis and application of concepts.',
      hard: 'Create complex questions that require deep thinking, analysis, and synthesis of information.'
    };

    return `You are an expert question generator. Your task is to create high-quality, relevant multiple-choice questions based on the given topic or content.

Guidelines:
- ${difficultyInstructions[difficulty]}
- Each question must have exactly 4 options (A, B, C, D)
- Only one option should be correct
- Questions should be clear, unambiguous, and directly relevant to the topic
- Avoid trick questions or overly technical jargon unless appropriate
- Make incorrect options plausible but clearly distinguishable from the correct answer
- Focus on practical knowledge and real-world applications when possible

Response format: Return your response as a JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct"
  }
]

Important: Return ONLY the JSON array, no additional text or formatting.`;
  }

  private buildUserPrompt(prompt: string, numberOfQuestions: number, fileContent?: string): string {
    let userPrompt = `Generate ${numberOfQuestions} multiple-choice questions about: "${prompt}"

Please create questions that are:
1. Directly relevant to the topic: "${prompt}"
2. Practical and applicable
3. Testing important concepts and knowledge
4. Varied in scope (don't repeat similar questions)`;

    if (fileContent && fileContent.trim().length > 10) {
      userPrompt += `\n\nAdditional context from uploaded file:\n"${fileContent.substring(0, 2000)}${fileContent.length > 2000 ? '...' : ''}"

Please incorporate information from both the prompt and the file content to create comprehensive questions.`;
    }

    return userPrompt;
  }

  private parseQuestions(content: string): ChatGPTQuestion[] {
    try {
      // Clean the content - remove any markdown formatting or extra text
      let cleanContent = content.trim();
      
      // Find JSON array in the content
      const jsonStart = cleanContent.indexOf('[');
      const jsonEnd = cleanContent.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('No JSON array found in response');
      }
      
      cleanContent = cleanContent.substring(jsonStart, jsonEnd);
      
      const parsed = JSON.parse(cleanContent);
      
      if (!Array.isArray(parsed)) {
        throw new Error('Response is not an array');
      }

      // Validate and clean the questions
      return parsed.map((item, index) => {
        if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
          throw new Error(`Invalid question format at index ${index}`);
        }
        
        return {
          question: item.question,
          options: item.options,
          correctAnswer: item.correctAnswer || 0,
          explanation: item.explanation || ''
        };
      });
    } catch (error) {
      console.error('Error parsing ChatGPT response:', error);
      throw new Error('Failed to parse questions from ChatGPT response');
    }
  }
}

export const ChatGPTService = new ChatGPTServiceClass();
