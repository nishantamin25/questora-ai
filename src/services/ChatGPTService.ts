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

    console.log('🔍 CRITICAL: Question generation with STRICT file content validation:', {
      prompt,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets
    });

    // CRITICAL FIX: ABSOLUTELY NO QUESTION GENERATION WITHOUT SUBSTANTIAL FILE CONTENT
    if (!fileContent || fileContent.length < 300) {
      console.error('❌ BLOCKED: Insufficient file content for question generation');
      throw new Error('Question generation requires substantial file content (minimum 300 characters). The system will not generate questions without actual document content to prevent fabrication.');
    }

    // CRITICAL: Validate file content quality
    if (!this.validateFileContentQuality(fileContent)) {
      console.error('❌ BLOCKED: File content quality validation failed');
      throw new Error('The provided file content is not suitable for question generation. Content appears to be corrupted, incomplete, or lacks educational substance.');
    }

    console.log('✅ VALIDATED: File content approved for strict question generation');

    // CRITICAL FIX: INJECT FULL FILE CONTENT INTO PROMPT - NO FABRICATION ALLOWED
    const strictContentPrompt = `Based strictly on the content from the uploaded file below, generate exactly ${numberOfQuestions} multiple-choice questions that reflect the actual information, examples, and topics discussed in the document.

CRITICAL REQUIREMENTS:
- Use ONLY information explicitly present in the document content below
- Do NOT invent learning areas, skills, frameworks, methodologies, or concepts not found in the source
- Do NOT add generic educational terms like "assessment preparation", "critical thinking", "professional development", "best practices", "key learning areas", "confidence-building", or "evaluation frameworks" unless they appear verbatim in the document
- Questions must be answerable using ONLY the specific information provided in the content below
- Focus on actual facts, concepts, definitions, processes, examples, and specific details from the document
- Each answer option must be based on information present in or derivable from the document content

ACTUAL DOCUMENT CONTENT TO USE EXCLUSIVELY:
"""
${fileContent}
"""

${totalSets > 1 ? `This is set ${setNumber} of ${totalSets}, so ensure questions are unique and don't overlap with other sets while staying strictly within the document content above.` : ''}

RESPONSE FORMAT REQUIREMENTS:
Return a JSON object with a "questions" array. Each question MUST have:
- question: string (specific question about actual content from the document above)
- options: array of exactly 4 strings (answer choices based on document content)
- correct_answer: number (index 0-3 of correct option)
- explanation: string (explanation referencing specific information from the source document)

Example format:
{
  "questions": [
    {
      "question": "According to the document, what specific [concept/process/fact] is mentioned?",
      "options": ["Actual info from doc", "Actual info from doc", "Actual info from doc", "Actual info from doc"],
      "correct_answer": 0,
      "explanation": "The document specifically states that..."
    }
  ]
}

Generate exactly ${numberOfQuestions} questions now, using ONLY the document content provided above.`;

    if (language !== 'en') {
      strictContentPrompt += ` Generate questions in ${language}.`;
    }

    try {
      console.log('📤 Sending STRICT file-content-only request to OpenAI...');

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
              content: 'You are a strict content-based question generator. You ONLY create questions based on the exact content provided in the user message. You NEVER add content, frameworks, methodologies, learning objectives, or educational concepts not explicitly present in the source material. You are forbidden from using generic educational language unless it appears verbatim in the provided content.'
            },
            {
              role: 'user',
              content: strictContentPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.0, // Zero temperature to prevent any creativity/fabrication
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

      console.log('📥 Raw OpenAI response received');

      if (!content) {
        console.error('❌ No content received from OpenAI');
        throw new Error('Failed to generate questions - no response from AI service');
      }

      try {
        const parsedResponse = JSON.parse(content);
        console.log('✅ Parsed OpenAI response successfully');

        let questions = [];
        
        if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
          questions = parsedResponse.questions;
        } else if (Array.isArray(parsedResponse)) {
          questions = parsedResponse;
        } else {
          console.warn('Unexpected response format, extracting questions...');
          questions = this.extractQuestionsFromResponse(parsedResponse);
        }

        if (!Array.isArray(questions) || questions.length === 0) {
          console.error('❌ No valid questions found in response');
          throw new Error('AI service failed to generate valid questions based on the document content');
        }

        // CRITICAL: Validate questions are strictly content-adherent
        const validQuestions = questions
          .filter(q => q && q.question && q.options && Array.isArray(q.options))
          .filter(q => this.validateQuestionAgainstContent(q, fileContent))
          .map(q => ({
            question: q.question,
            options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                          typeof q.correct_answer === 'number' ? q.correct_answer : 0,
            explanation: q.explanation || 'Based on the document content.'
          }))
          .slice(0, numberOfQuestions);

        if (validQuestions.length === 0) {
          console.error('❌ CRITICAL: No questions passed content validation');
          throw new Error('All generated questions were rejected for containing fabricated content not present in the document. Please ensure the uploaded file contains substantial educational content.');
        }

        console.log(`✅ SUCCESS: Generated ${validQuestions.length} strictly content-based questions`);
        return validQuestions;

      } catch (parseError) {
        console.error('❌ Error parsing JSON from OpenAI:', parseError);
        throw new Error('Failed to parse AI response for question generation');
      }
    } catch (error) {
      console.error('❌ CRITICAL: Question generation failed:', error);
      throw error;
    }
  }

  // NEW: Strict file content quality validation
  private validateFileContentQuality(fileContent: string): boolean {
    if (!fileContent || fileContent.length < 300) {
      return false;
    }

    // Check for meaningful educational content
    const educationalIndicators = [
      // Structural indicators
      /\b(?:chapter|section|introduction|conclusion|summary|overview)\b/gi,
      // Content indicators  
      /\b(?:analysis|method|result|process|system|approach|technique|procedure)\b/gi,
      // Conceptual indicators
      /\b(?:concept|principle|theory|practice|application|implementation|strategy)\b/gi,
      // Informational indicators
      /\b(?:data|information|research|study|finding|evidence|example|case)\b/gi
    ];

    let indicatorCount = 0;
    for (const pattern of educationalIndicators) {
      const matches = fileContent.match(pattern);
      if (matches) {
        indicatorCount += matches.length;
      }
    }

    // Must have substantial educational content
    const hasEducationalContent = indicatorCount >= 8;
    
    // Check readability
    const words = fileContent.split(/\s+/).filter(word => word.length > 2);
    const hasEnoughWords = words.length >= 100;
    
    // Check for coherent sentences
    const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const hasCoherentContent = sentences.length >= 5;

    console.log('📊 Content quality validation:', {
      length: fileContent.length,
      wordCount: words.length,
      sentenceCount: sentences.length,
      educationalIndicators: indicatorCount,
      hasEducationalContent,
      hasEnoughWords,
      hasCoherentContent,
      isValid: hasEducationalContent && hasEnoughWords && hasCoherentContent
    });

    return hasEducationalContent && hasEnoughWords && hasCoherentContent;
  }

  // NEW: Strict validation of questions against source content
  private validateQuestionAgainstContent(question: any, fileContent: string): boolean {
    const questionText = question.question?.toLowerCase() || '';
    const fileContentLower = fileContent.toLowerCase();

    // CRITICAL: Check for fabricated educational terms not in source
    const fabricatedTerms = [
      'assessment preparation',
      'professional methodologies', 
      'critical evaluation frameworks',
      'confidence-building',
      'best practices',
      'industry standards',
      'professional development',
      'strategic approaches',
      'theoretical frameworks',
      'advanced techniques',
      'comprehensive analysis',
      'systematic evaluation',
      'key learning areas',
      'learning objectives',
      'educational outcomes',
      'skill development',
      'competency building',
      'knowledge assessment',
      'performance evaluation'
    ];

    // Reject questions with fabricated terms not in source
    for (const term of fabricatedTerms) {
      if (questionText.includes(term) && !fileContentLower.includes(term)) {
        console.warn(`❌ REJECTED: Question contains fabricated term "${term}" not in source:`, question.question);
        return false;
      }
    }

    // CRITICAL: Question must reference concepts that exist in the source
    const questionWords = questionText.split(/\s+/).filter(word => word.length > 4);
    let sourceMatchCount = 0;
    
    for (const word of questionWords.slice(0, 10)) { // Check first 10 meaningful words
      if (fileContentLower.includes(word)) {
        sourceMatchCount++;
      }
    }

    const hasSourceAlignment = sourceMatchCount >= Math.min(3, questionWords.length * 0.3);
    
    if (!hasSourceAlignment) {
      console.warn('❌ REJECTED: Question lacks alignment with source content:', question.question);
      return false;
    }

    console.log('✅ VALIDATED: Question approved:', question.question.substring(0, 80) + '...');
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
              content: 'You are a content organizer. Clean and organize the provided text content while preserving ALL original information. Do not add any new information, frameworks, methodologies, or concepts not present in the source text. Only reorganize and clarify existing content.'
            },
            {
              role: 'user',
              content: `Please clean and organize this extracted text content for educational use. Organize it logically and fix formatting issues while preserving ALL original information. Do not add any sections, summaries, frameworks, or concepts not present in the source:

${textContent}`
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

    const fabricatedTerms = [
      'assessment preparation',
      'professional methodologies',
      'critical evaluation frameworks',
      'confidence-building',
      'strategic approaches',
      'theoretical frameworks',
      'comprehensive analysis',
      'systematic evaluation',
      'best practices',
      'industry standards'
    ];

    const originalLower = original.toLowerCase();
    const enhancedLower = enhanced.toLowerCase();

    for (const term of fabricatedTerms) {
      if (enhancedLower.includes(term) && !originalLower.includes(term)) {
        console.warn(`Enhanced content contains fabricated term: ${term}`);
        return false;
      }
    }

    return true;
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
              content: 'You are an educational content generator. When provided with source content, organize and structure ONLY that content without adding new information. When generating original content, create focused educational material based strictly on the provided prompt without adding generic frameworks or methodologies unless specifically requested.'
            },
            {
              role: 'user',
              content: prompt
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
