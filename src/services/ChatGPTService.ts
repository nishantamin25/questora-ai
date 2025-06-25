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

    console.log('🔍 STRICT GENERATION: Questions from file content only:', {
      prompt,
      requestedQuestions: numberOfQuestions,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets
    });

    // ABSOLUTE REQUIREMENT: Block without substantial file content
    if (!fileContent || fileContent.length < 300) {
      console.error('❌ BLOCKED: Insufficient file content for question generation');
      throw new Error(`Question generation requires substantial file content (minimum 300 characters). Current content: ${fileContent?.length || 0} characters. Upload a file with readable text to generate accurate questions.`);
    }

    // STRICT: Validate content quality
    if (!this.validateFileContentQuality(fileContent)) {
      console.error('❌ BLOCKED: File content quality validation failed');
      throw new Error('The file content is not suitable for question generation. Content appears corrupted, incomplete, or lacks educational substance.');
    }

    console.log('✅ VALIDATED: File content approved for strict generation');

    // CRITICAL: Zero-hallucination prompt with exact question count enforcement
    const strictPrompt = `USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

STRICT GENERATION RULES:
1. Generate EXACTLY ${numberOfQuestions} questions - no more, no less
2. Use ONLY information explicitly present in the document content above
3. NEVER add educational terminology like "assessment preparation", "learning structure", "educational goals", "academic confidence", "best practices", "industry standards" unless they appear in the source
4. NEVER fabricate content, frameworks, methodologies, or concepts not in the document
5. Each question must be answerable using ONLY the specific information provided
6. Honor the user's intent: "${prompt}" while staying within document boundaries

${totalSets > 1 ? `Generate unique questions for set ${setNumber} of ${totalSets}.` : ''}

RESPONSE FORMAT:
{
  "questions": [
    {
      "question": "Question based on actual document content",
      "options": ["Option from doc", "Option from doc", "Option from doc", "Option from doc"],
      "correct_answer": 0,
      "explanation": "Explanation referencing specific document information"
    }
  ]
}

Generate EXACTLY ${numberOfQuestions} questions now.`;

    if (language !== 'en') {
      strictPrompt += ` Generate in ${language}.`;
    }

    try {
      console.log('📤 Sending STRICT anti-hallucination request...');

      const response = await fetch(this.OPENAI_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            {
              role: 'system',
              content: 'You are a strict content-based question generator. You NEVER fabricate, hallucinate, or add content not present in the source. You generate EXACTLY the requested number of questions. You combine user intent with source material without adding educational fluff or generic terminology.'
            },
            {
              role: 'user',
              content: strictPrompt
            }
          ],
          max_tokens: Math.max(2000, numberOfQuestions * 400), // Scale tokens with question count
          temperature: 0.0, // Zero creativity to prevent hallucination
          response_format: { type: "json_object" }
        })
      });

      if (!response.ok) {
        console.error('OpenAI API Error:', response.status, response.statusText);
        throw new Error(`OpenAI API request failed: ${response.status}`);
      }

      const data = await response.json();
      const content = data.choices[0]?.message?.content;

      if (!content) {
        console.error('❌ No content from OpenAI');
        throw new Error('Failed to generate questions - no AI response');
      }

      const parsedResponse = JSON.parse(content);
      let questions = parsedResponse.questions || [];

      if (!Array.isArray(questions)) {
        console.error('❌ Invalid response format');
        throw new Error('AI response format invalid');
      }

      // STRICT: Validate each question against content and remove fabricated ones
      const validatedQuestions = questions
        .filter(q => q && q.question && q.options && Array.isArray(q.options))
        .filter(q => this.strictValidateQuestionAgainstContent(q, fileContent))
        .map(q => ({
          question: q.question,
          options: q.options.slice(0, 4), // Ensure exactly 4 options
          correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                         typeof q.correct_answer === 'number' ? q.correct_answer : 0,
          explanation: q.explanation || 'Based on document content.'
        }));

      // CRITICAL: Enforce exact question count
      if (validatedQuestions.length < numberOfQuestions) {
        console.error(`❌ QUESTION COUNT MISMATCH: Generated ${validatedQuestions.length}, requested ${numberOfQuestions}`);
        throw new Error(`Could only generate ${validatedQuestions.length} valid questions from document content. Requested ${numberOfQuestions}. The document may not contain sufficient content for the requested number of questions.`);
      }

      const finalQuestions = validatedQuestions.slice(0, numberOfQuestions);
      
      console.log(`✅ SUCCESS: Generated exactly ${finalQuestions.length} validated questions`);
      return finalQuestions;

    } catch (error) {
      console.error('❌ Question generation failed:', error);
      throw error;
    }
  }

  // ENHANCED: Stricter content quality validation
  private validateFileContentQuality(fileContent: string): boolean {
    if (!fileContent || fileContent.length < 300) return false;

    // Check for meaningful content indicators
    const contentIndicators = [
      /\b(?:chapter|section|introduction|conclusion|summary|overview|definition|concept|principle|process|method|approach|technique|procedure|system|analysis|result|finding|example|case|data|information|research|study)\b/gi
    ];

    let indicatorCount = 0;
    contentIndicators.forEach(pattern => {
      const matches = fileContent.match(pattern);
      if (matches) indicatorCount += matches.length;
    });

    const words = fileContent.split(/\s+/).filter(word => word.length > 2);
    const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 20);

    const isValid = indicatorCount >= 5 && words.length >= 100 && sentences.length >= 5;
    
    console.log('📊 Content validation:', {
      length: fileContent.length,
      words: words.length,
      sentences: sentences.length,
      indicators: indicatorCount,
      isValid
    });

    return isValid;
  }

  // ENHANCED: Ultra-strict question validation
  private strictValidateQuestionAgainstContent(question: any, fileContent: string): boolean {
    const questionText = question.question?.toLowerCase() || '';
    const fileContentLower = fileContent.toLowerCase();

    // CRITICAL: Block fabricated educational terms
    const bannedFabricatedTerms = [
      'assessment preparation', 'assessment readiness', 'educational structure', 
      'learning structure', 'educational goals', 'learning objectives', 'academic confidence',
      'confidence-building', 'professional methodologies', 'best practices', 
      'industry standards', 'professional development', 'strategic approaches',
      'theoretical frameworks', 'advanced techniques', 'comprehensive analysis',
      'systematic evaluation', 'key learning areas', 'skill development',
      'competency building', 'knowledge assessment', 'performance evaluation',
      'progression from basic to advanced', 'purpose of learning', 'educational outcomes'
    ];

    // Reject if contains banned terms not in source
    for (const term of bannedFabricatedTerms) {
      if (questionText.includes(term) && !fileContentLower.includes(term)) {
        console.warn(`❌ REJECTED: Fabricated term "${term}":`, question.question?.substring(0, 80));
        return false;
      }
    }

    // STRICT: Question must have strong alignment with source content
    const questionWords = questionText.split(/\s+/).filter(word => word.length > 4);
    let sourceAlignmentCount = 0;
    
    for (const word of questionWords.slice(0, 15)) {
      if (fileContentLower.includes(word)) {
        sourceAlignmentCount++;
      }
    }

    const alignmentRatio = sourceAlignmentCount / Math.max(questionWords.length, 1);
    const hasStrongAlignment = alignmentRatio >= 0.4; // At least 40% word overlap

    if (!hasStrongAlignment) {
      console.warn('❌ REJECTED: Insufficient source alignment:', question.question?.substring(0, 80));
      return false;
    }

    console.log('✅ VALIDATED:', question.question?.substring(0, 80));
    return true;
  }

  private extractQuestionsFromResponse(parsedResponse: any): any[] {
    if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
      return parsedResponse.questions;
    } else if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
      return parsedResponse.data;
    } else if (parsedResponse.items && Array.isArray(parsedResponse.items)) {
      return parsedResponse.items;
    }
    
    const keys = Object.keys(parsedResponse);
    for (const key of keys) {
      if (Array.isArray(parsedResponse[key]) && parsedResponse[key].length > 0) {
        const firstItem = parsedResponse[key][0];
        if (firstItem && firstItem.question && firstItem.options) {
          return parsedResponse[key];
        }
      }
    }
    
    return [];
  }

  async enhanceTextContent(textContent: string, userPrompt: string = ''): Promise<string> {
    const apiKey = this.getApiKey();
    
    try {
      const organizationPrompt = userPrompt 
        ? `USER REQUEST: "${userPrompt}"

DOCUMENT CONTENT:
${textContent}

STRICT INSTRUCTIONS:
- Organize the document content according to the user's request
- Use ONLY information present in the source text
- Do NOT add educational frameworks, methodologies, or concepts not in the source
- Do NOT add terms like "assessment preparation", "learning structure", "educational goals" unless present in source
- Simply reorganize and clarify existing content while honoring user intent

Organize the content now:`
        : `Clean and organize this text content for educational use. Preserve ALL original information. Do NOT add frameworks, methodologies, or educational concepts not present in the source:

${textContent}`;

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
              content: 'You organize content while preserving source integrity. You NEVER add information, frameworks, or educational terminology not present in the source. You follow user structural requests while staying within source boundaries.'
            },
            {
              role: 'user',
              content: organizationPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const enhancedContent = data.choices[0]?.message?.content || textContent;
      
      if (this.validateContentIntegrity(textContent, enhancedContent)) {
        return enhancedContent;
      } else {
        console.warn('Enhanced content failed integrity check, returning original');
        return textContent;
      }
    } catch (error) {
      console.error('Error enhancing text content:', error);
      return textContent;
    }
  }

  private validateContentIntegrity(original: string, enhanced: string): boolean {
    if (enhanced.length > original.length * 1.5) {
      console.warn('Enhanced content significantly longer than original - potential fabrication');
      return false;
    }

    const bannedTerms = [
      'assessment preparation', 'educational structure', 'learning structure',
      'educational goals', 'academic confidence', 'confidence-building',
      'professional methodologies', 'best practices', 'industry standards',
      'strategic approaches', 'theoretical frameworks', 'comprehensive analysis',
      'systematic evaluation', 'skill development', 'competency building'
    ];

    const originalLower = original.toLowerCase();
    const enhancedLower = enhanced.toLowerCase();

    for (const term of bannedTerms) {
      if (enhancedLower.includes(term) && !originalLower.includes(term)) {
        console.warn(`Enhanced content contains fabricated term: ${term}`);
        return false;
      }
    }

    return true;
  }

  async generateContent(prompt: string, fileContent: string = ''): Promise<string> {
    const apiKey = this.getApiKey();
    
    try {
      const strictPrompt = fileContent 
        ? `USER REQUEST: "${prompt}"

DOCUMENT CONTENT:
"""
${fileContent}
"""

STRICT GENERATION RULES:
- Respond to the user's request using ONLY the document content provided
- Do NOT add educational terminology, frameworks, or concepts not in the document
- Do NOT fabricate "learning objectives", "assessment preparation", "educational structure" unless in source
- Honor the user's intent while staying strictly within document boundaries
- Generate content based on actual file information only

Generate response now:`
        : `USER REQUEST: "${prompt}"

Generate focused content based strictly on this request. Do not add generic educational frameworks or methodologies unless specifically requested.`;

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
              content: 'You generate content that respects user intent and source material boundaries. When provided with source content, you use ONLY that content. You never fabricate educational frameworks, methodologies, or terminology not present in the source or explicitly requested by the user.'
            },
            {
              role: 'user',
              content: strictPrompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.2
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
