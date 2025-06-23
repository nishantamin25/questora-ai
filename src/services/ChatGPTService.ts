
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
    console.log('ChatGPT API key updated');
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
    fileContent?: string,
    setNumber?: number,
    totalSets?: number
  ): Promise<ChatGPTQuestion[]> {
    const apiKey = this.getApiKey();
    
    console.log('ChatGPT generation started:', {
      prompt,
      numberOfQuestions,
      difficulty,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent?.length || 0,
      hasApiKey: !!apiKey,
      setNumber,
      totalSets
    });

    if (!apiKey) {
      throw new Error('ChatGPT API key is required');
    }

    const systemPrompt = this.buildSystemPrompt(difficulty, !!fileContent);
    const userPrompt = this.buildUserPrompt(prompt, numberOfQuestions, fileContent, setNumber, totalSets);

    console.log('System prompt length:', systemPrompt.length);
    console.log('User prompt length:', userPrompt.length);

    try {
      console.log('Making request to OpenAI API...');
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

      console.log('OpenAI API response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('OpenAI API error details:', error);
        
        // Check for specific error types
        if (error.error?.code === 'insufficient_quota') {
          throw new Error('Your OpenAI API key has exceeded its quota. Please check your OpenAI account billing.');
        }
        
        if (error.error?.code === 'invalid_api_key') {
          throw new Error('Invalid OpenAI API key. Please check your API key and try again.');
        }
        
        throw new Error(error.error?.message || 'Failed to generate questions with ChatGPT');
      }

      const data = await response.json();
      console.log('OpenAI API response received, parsing...');
      
      const content = data.choices[0]?.message?.content;
      
      if (!content) {
        console.error('No content in ChatGPT response');
        throw new Error('No content received from ChatGPT');
      }

      console.log('ChatGPT raw response length:', content.length);
      const parsedQuestions = this.parseQuestions(content);
      
      // Ensure we have the exact number of questions requested
      if (parsedQuestions.length !== numberOfQuestions) {
        console.warn(`Expected ${numberOfQuestions} questions, got ${parsedQuestions.length}`);
      }
      
      console.log('Successfully parsed questions:', parsedQuestions.length);
      return parsedQuestions.slice(0, numberOfQuestions);
    } catch (error) {
      console.error('ChatGPT API error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(difficulty: 'easy' | 'medium' | 'hard', hasFileContent: boolean): string {
    const difficultyInstructions = {
      easy: 'Create simple, straightforward questions that test basic understanding and recall of the material.',
      medium: 'Create moderately challenging questions that require some analysis and application of the concepts from the content.',
      hard: 'Create complex questions that require deep thinking, analysis, and synthesis of the information provided.'
    };

    let systemPrompt = `You are an expert question generator specializing in creating content-based assessments. Your task is to create high-quality multiple-choice questions based EXCLUSIVELY on the provided content.

CRITICAL REQUIREMENTS:
- ${difficultyInstructions[difficulty]}
- Each question must have exactly 4 options (A, B, C, D)
- Only one option should be correct
- ALL questions must be directly derived from the provided material
- DO NOT include external knowledge or assumptions
- Questions should test comprehension, analysis, and application of the specific content provided
- Avoid trick questions or overly technical jargon unless present in the source material
- Make incorrect options plausible but clearly distinguishable from the correct answer
- Ensure questions cover different sections/topics from the provided content
- Focus on key concepts, important facts, and main ideas from the material`;

    if (hasFileContent) {
      systemPrompt += `

FILE CONTENT SPECIFIC INSTRUCTIONS:
- Base ALL questions exclusively on the uploaded file content
- Do not reference external sources or general knowledge
- Focus on the specific information, concepts, and details present in the file
- Ensure questions test understanding of the material as presented in the document
- Cover different sections or topics from the file to ensure comprehensive coverage
- Maintain the context and terminology used in the original document
- Extract key concepts, procedures, facts, and relationships from the content
- Generate questions that would help assess someone's understanding of this specific material`;
    }

    systemPrompt += `

QUESTION QUALITY STANDARDS:
- Questions should be clear and unambiguous
- Options should be of similar length and complexity
- Avoid "all of the above" or "none of the above" options
- Use active voice when possible
- Test different cognitive levels (recall, comprehension, application, analysis)

Response format: Return your response as a JSON array with this exact structure:
[
  {
    "question": "Question text here",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Brief explanation of why this is correct based on the provided content"
  }
]

IMPORTANT: Return ONLY the JSON array, no additional text or formatting.`;

    return systemPrompt;
  }

  private buildUserPrompt(prompt: string, numberOfQuestions: number, fileContent?: string, setNumber?: number, totalSets?: number): string {
    let userPrompt = '';

    if (fileContent && fileContent.trim().length > 50) {
      // Limit content length to avoid token limits
      const limitedContent = fileContent.length > 3500 
        ? fileContent.substring(0, 3500) + '...'
        : fileContent;
        
      userPrompt = `Generate exactly ${numberOfQuestions} multiple-choice questions based EXCLUSIVELY on the following content:

CONTENT TO ANALYZE:
"${limitedContent}"

REQUIREMENTS:
1. Generate exactly ${numberOfQuestions} questions - no more, no less
2. All questions must be derived directly from the content above
3. Do not use external knowledge or make assumptions
4. Focus on key concepts, important details, and main ideas from the material
5. Ensure questions test different aspects of the content
6. Cover various sections/topics present in the material
7. Test comprehension, analysis, and application of the specific information provided
8. Make sure each question has exactly 4 options with only one correct answer`;

      if (prompt && prompt.trim().length > 0) {
        userPrompt += `\n\nADDITIONAL CONTEXT: "${prompt}"
Use this context to help focus the questions, but still base all questions on the file content above.`;
      }
    } else {
      userPrompt = `Generate exactly ${numberOfQuestions} multiple-choice questions about: "${prompt}"

REQUIREMENTS:
1. Generate exactly ${numberOfQuestions} questions - no more, no less
2. Questions should be directly relevant to the topic: "${prompt}"
3. Create practical and applicable questions
4. Test important concepts and knowledge
5. Ensure questions are varied in scope (don't repeat similar questions)
6. Each question must have exactly 4 options with only one correct answer
7. Focus on comprehension, application, and analysis of the topic`;
    }

    if (setNumber && totalSets && totalSets > 1) {
      userPrompt += `\n\nSET VARIATION: This is set ${setNumber} of ${totalSets} question sets. Please ensure the questions are unique and don't overlap with other sets while still covering the content comprehensively. Vary the question styles and focus areas for this specific set.`;
    }

    userPrompt += `\n\nRemember: Return exactly ${numberOfQuestions} questions in the specified JSON format.`;

    return userPrompt;
  }

  private parseQuestions(content: string): ChatGPTQuestion[] {
    try {
      console.log('Parsing ChatGPT response...');
      
      // Clean the content - remove any markdown formatting or extra text
      let cleanContent = content.trim();
      
      // Find JSON array in the content
      const jsonStart = cleanContent.indexOf('[');
      const jsonEnd = cleanContent.lastIndexOf(']') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        console.error('No JSON array found in response');
        throw new Error('No JSON array found in response');
      }
      
      cleanContent = cleanContent.substring(jsonStart, jsonEnd);
      console.log('Extracted JSON content:', cleanContent);
      
      const parsed = JSON.parse(cleanContent);
      
      if (!Array.isArray(parsed)) {
        console.error('Response is not an array');
        throw new Error('Response is not an array');
      }

      // Validate and clean the questions
      return parsed.map((item, index) => {
        if (!item.question || !Array.isArray(item.options) || item.options.length !== 4) {
          console.error(`Invalid question format at index ${index}:`, item);
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
