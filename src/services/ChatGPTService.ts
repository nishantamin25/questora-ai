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

    let fullPrompt = `You are a question generator. Your task is to create exactly ${numberOfQuestions} multiple-choice questions at ${difficulty} difficulty level.

TOPIC: ${prompt}

${fileContent ? `CONTENT TO USE:
Use the following content as your primary source. Create questions based on the concepts, information, and topics found in this content:

${fileContent}

INSTRUCTIONS:
- Create questions based on the concepts and information in the above content
- Focus on key topics, terms, and principles mentioned
- Use your knowledge to create comprehensive questions about these topics` : 'Create questions based on the topic and your knowledge.'}

${totalSets > 1 ? `This is set ${setNumber} of ${totalSets}, so ensure questions are unique and don't overlap with other sets.` : ''}

RESPONSE FORMAT:
Return a JSON object with a "questions" array. Each question must have:
- question: string (the question text)
- options: array of 4 strings (answer choices)  
- correct_answer: number (index 0-3 of correct option)
- explanation: string (brief explanation of the answer)

Example format:
{
  "questions": [
    {
      "question": "What is the main topic?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Option A is correct because..."
    }
  ]
}`;

    if (language !== 'en') {
      fullPrompt += ` Generate questions in ${language}.`;
    }

    try {
      console.log('Sending request to OpenAI with content length:', fileContent.length);

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
              content: 'You are an expert question generator. Always create valid multiple-choice questions in the requested JSON format. Work with any content provided and create meaningful educational questions.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 3000,
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

      console.log('Raw OpenAI response:', content);

      if (!content) {
        console.warn('No content received from OpenAI. Full response:', data);
        return this.createFallbackQuestions(prompt, numberOfQuestions, difficulty);
      }

      try {
        const parsedResponse = JSON.parse(content);
        console.log('Parsed OpenAI response:', parsedResponse);

        let questions = [];
        
        if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
          questions = parsedResponse.questions;
        } else if (Array.isArray(parsedResponse)) {
          questions = parsedResponse;
        } else {
          console.warn('Unexpected response format, trying to extract questions...');
          questions = this.extractQuestionsFromResponse(parsedResponse);
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          console.error('No valid questions found in response. Creating fallback questions.');
          return this.createFallbackQuestions(prompt, numberOfQuestions, difficulty);
        }

        // FIXED: Handle both correctAnswer and correct_answer formats
        const validQuestions = questions
          .filter(q => q && q.question && q.options && Array.isArray(q.options))
          .map(q => ({
            question: q.question,
            options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                          typeof q.correct_answer === 'number' ? q.correct_answer : 0,
            explanation: q.explanation || 'Explanation not provided.'
          }))
          .slice(0, numberOfQuestions);

        if (validQuestions.length === 0) {
          console.error('No valid questions after filtering. Creating fallback questions.');
          return this.createFallbackQuestions(prompt, numberOfQuestions, difficulty);
        }

        console.log(`Successfully parsed ${validQuestions.length} questions`);
        return validQuestions;

      } catch (parseError) {
        console.error('Error parsing JSON from OpenAI:', parseError);
        console.error('Content received from OpenAI:', content);
        
        const extractedQuestions = this.extractQuestionsFromText(content);
        if (extractedQuestions.length > 0) {
          console.log('Successfully extracted questions from malformed response');
          return extractedQuestions.slice(0, numberOfQuestions);
        }
        
        return this.createFallbackQuestions(prompt, numberOfQuestions, difficulty);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.createFallbackQuestions(prompt, numberOfQuestions, difficulty);
    }
  }

  private extractQuestionsFromResponse(response: any): any[] {
    const questions = [];
    
    for (const key in response) {
      const value = response[key];
      if (Array.isArray(value) && value.length > 0 && value[0].question) {
        questions.push(...value);
      }
    }
    
    return questions;
  }

  private extractQuestionsFromText(text: string): any[] {
    const questions = [];
    console.log('Attempting to extract questions from text:', text.substring(0, 500));
    
    try {
      const questionBlocks = text.split(/(?:\d+\.|\n\n|\*\*Question)/);
      
      for (const block of questionBlocks) {
        if (block.trim().length < 20) continue;
        
        const lines = block.split('\n').map(l => l.trim()).filter(l => l);
        if (lines.length < 5) continue;
        
        const questionText = lines[0].replace(/^[\d\.\*\-\s]+/, '');
        const options = [];
        let correctAnswer = 0;
        
        for (let i = 1; i < Math.min(lines.length, 6); i++) {
          const line = lines[i];
          if (line.match(/^[A-D][\.\)\:]?\s*/)) {
            options.push(line.replace(/^[A-D][\.\)\:]?\s*/, ''));
            if (line.toLowerCase().includes('correct') || line.includes('*')) {
              correctAnswer = options.length - 1;
            }
          }
        }
        
        if (questionText && options.length >= 4) {
          questions.push({
            question: questionText,
            options: options.slice(0, 4),
            correctAnswer,
            explanation: 'Extracted from response text.'
          });
        }
      }
    } catch (error) {
      console.error('Error extracting questions from text:', error);
    }
    
    return questions;
  }

  private createFallbackQuestions(prompt: string, numberOfQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): any[] {
    console.log('Creating fallback questions for:', prompt);
    
    const questions = [];
    const topics = this.extractTopicsFromPrompt(prompt);
    
    for (let i = 0; i < numberOfQuestions; i++) {
      const topic = topics[i % topics.length] || 'general knowledge';
      questions.push({
        question: `What is an important aspect of ${topic}?`,
        options: [
          `Key concept related to ${topic}`,
          `Alternative approach to ${topic}`,
          `Common misconception about ${topic}`,
          `Unrelated concept`
        ],
        correctAnswer: 0,
        explanation: `This question covers fundamental concepts related to ${topic}.`
      });
    }
    
    return questions;
  }

  private extractTopicsFromPrompt(prompt: string): string[] {
    const words = prompt.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'create', 'course', 'questions', 'about'].includes(word));
    
    return words.slice(0, 5);
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
              content: 'You are an educational content enhancer. Extract, clean, and enhance the provided text content to make it suitable for educational course generation and assessment. Focus on creating clear, structured educational material. Always work with the content provided.'
            },
            {
              role: 'user',
              content: `Please enhance this text content for educational use. Extract key information, organize it logically, and expand on important concepts to create comprehensive educational material:

${textContent}`
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
      return textContent;
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
              content: 'You are an educational content generator. Create comprehensive, well-structured educational material suitable for course generation and assessment.'
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

  public hasApiKey(): boolean {
    const apiKey = localStorage.getItem('openai_api_key');
    return !!apiKey;
  }

  public setApiKey(apiKey: string): void {
    localStorage.setItem('openai_api_key', apiKey);
  }

  public clearApiKey(): void {
    localStorage.removeItem('openai_api_key');
  }

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
