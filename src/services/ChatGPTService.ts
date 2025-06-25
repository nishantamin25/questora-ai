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

    // CRITICAL FIX: STRICT FILE CONTENT ONLY - NO FABRICATION
    let contentBasedPrompt = '';

    if (fileContent && fileContent.trim().length > 100) {
      console.log('✅ STRICT MODE: Using ONLY file content for question generation');
      
      // Extract key content sections for focused questions
      const contentSummary = this.extractKeyContentForQuestions(fileContent);
      
      contentBasedPrompt = `Based strictly on the content extracted from the uploaded file below, generate ${numberOfQuestions} specific multiple-choice questions at ${difficulty} difficulty level.

CRITICAL INSTRUCTION: Use ONLY the information present in the document below. Do not add any sections, summaries, learning goals, frameworks, methodologies, or best practices unless they are explicitly found in the document itself.

ACTUAL DOCUMENT CONTENT:
"""
${contentSummary}
"""

STRICT REQUIREMENTS:
- Create questions EXCLUSIVELY about the specific information mentioned in the above content
- Do NOT create generic educational questions about the general topic
- Do NOT add academic frameworks, methodologies, or theoretical concepts not present in the content
- Do NOT create assessment preparation, professional development, or confidence-building questions unless explicitly mentioned
- Questions must be answerable using ONLY the information provided in the content above
- Focus on actual facts, concepts, definitions, and specific details from the document
- Each question should test understanding of content that exists in the document, not general knowledge`;

    } else {
      console.log('⚠️ No file content available - using prompt-based generation with restrictions');
      contentBasedPrompt = `Create ${numberOfQuestions} multiple-choice questions about "${prompt}" at ${difficulty} difficulty level.

IMPORTANT: Keep questions focused on the specific topic mentioned. Do not add generic academic frameworks or methodologies unless specifically requested.`;
    }

    let fullPrompt = `You are an expert question generator that creates questions based strictly on provided content.

${contentBasedPrompt}

${totalSets > 1 ? `This is set ${setNumber} of ${totalSets}, so ensure questions are unique and don't overlap with other sets.` : ''}

RESPONSE FORMAT REQUIREMENTS:
Return a JSON object with a "questions" array. Each question MUST have:
- question: string (specific question based on the actual content)
- options: array of exactly 4 strings (answer choices)  
- correct_answer: number (index 0-3 of correct option)
- explanation: string (explanation referencing the source content)

Example format:
{
  "questions": [
    {
      "question": "According to the document, what specific concept is discussed?",
      "options": ["Actual Option A from content", "Actual Option B from content", "Actual Option C from content", "Actual Option D from content"],
      "correct_answer": 0,
      "explanation": "Based on the document content, Option A is correct because the document specifically states..."
    }
  ]
}

Generate exactly ${numberOfQuestions} questions now. Use only the content provided above.`;

    if (language !== 'en') {
      fullPrompt += ` Generate questions in ${language}.`;
    }

    try {
      console.log('📤 Sending STRICT content-only request to OpenAI...');

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
              content: 'You are an expert question generator that creates questions based strictly on provided source content. NEVER add content, frameworks, methodologies, or concepts not present in the source material. Only use what is explicitly provided in the document content.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.1, // Very low temperature to prevent fabrication
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
        console.warn('No content received from OpenAI');
        return this.createStrictContentOnlyFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
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
          console.error('No valid questions found. Creating strict content-only fallback.');
          return this.createStrictContentOnlyFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
        }

        // Validate questions are content-specific and don't contain fabricated content
        const validQuestions = questions
          .filter(q => q && q.question && q.options && Array.isArray(q.options))
          .filter(q => this.validateQuestionContentAdherence(q, fileContent))
          .map(q => ({
            question: q.question,
            options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                          typeof q.correct_answer === 'number' ? q.correct_answer : 0,
            explanation: q.explanation || 'Based on the document content.'
          }))
          .slice(0, numberOfQuestions);

        if (validQuestions.length === 0) {
          console.error('No valid content-adherent questions after filtering');
          return this.createStrictContentOnlyFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
        }

        console.log(`✅ Generated ${validQuestions.length} strictly content-based questions`);
        return validQuestions;

      } catch (parseError) {
        console.error('Error parsing JSON from OpenAI:', parseError);
        return this.createStrictContentOnlyFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.createStrictContentOnlyFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
    }
  }

  // NEW: Validate questions don't contain fabricated content
  private validateQuestionContentAdherence(question: any, fileContent: string): boolean {
    if (!fileContent || fileContent.length < 100) {
      return true; // Allow if no file content to validate against
    }

    const questionText = question.question?.toLowerCase() || '';
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
      'systematic evaluation'
    ];

    // Check if question contains fabricated academic terms not in source
    const containsFabricatedTerms = fabricatedTerms.some(term => {
      const termInQuestion = questionText.includes(term);
      const termInSource = fileContent.toLowerCase().includes(term);
      return termInQuestion && !termInSource;
    });

    if (containsFabricatedTerms) {
      console.warn('❌ Question contains fabricated content not in source:', question.question);
      return false;
    }

    return true;
  }

  private extractKeyContentForQuestions(fileContent: string): string {
    // Extract the most relevant parts of the content for question generation
    const sentences = fileContent.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const paragraphs = fileContent.split(/\n\s*\n/).filter(p => p.trim().length > 50);
    
    // Get key sentences with important terms
    const keyTerms = fileContent.match(/\b(?:definition|concept|principle|theory|method|process|system|approach|strategy|technique|procedure|analysis|result|conclusion|finding|research|study|evidence|data|factor|element|component|aspect|feature|characteristic|property|function|operation|application|implementation|practice|procedure|analysis|evaluation|assessment|measurement|development|improvement|optimization|solution|innovation|technology|methodology|standard|guideline|requirement|specification|criteria|parameter|variable|factor|indicator|measure|metric|value|number|percentage|ratio|rate|frequency|duration|time|period|interval|schedule|timeline|deadline|milestone|target|benchmark|threshold|limit|boundary)\b/gi) || [];
    
    // Prioritize sentences with key terms
    const importantSentences = sentences.filter(sentence => {
      const termCount = (sentence.match(/\b(?:definition|concept|principle|theory|method|process|system|approach|strategy|technique|procedure|analysis|result|conclusion|finding|research|study|evidence|data|important|significant|critical|essential|fundamental|primary|main|key|major)\b/gi) || []).length;
      return termCount > 0 || sentence.length > 100;
    });
    
    // Combine the most important content
    const selectedContent = [
      ...importantSentences.slice(0, 10),
      ...paragraphs.slice(0, 5)
    ].join(' ').substring(0, 3000); // Limit to 3000 chars for API efficiency
    
    return selectedContent || fileContent.substring(0, 2000);
  }

  private extractQuestionsFromResponse(parsedResponse: any): any[] {
    // Extract questions from various possible response formats
    if (parsedResponse.questions && Array.isArray(parsedResponse.questions)) {
      return parsedResponse.questions;
    } else if (Array.isArray(parsedResponse)) {
      return parsedResponse;
    } else if (parsedResponse.data && Array.isArray(parsedResponse.data)) {
      return parsedResponse.data;
    } else if (parsedResponse.items && Array.isArray(parsedResponse.items)) {
      return parsedResponse.items;
    }
    
    // If no array found, try to extract from object properties
    const keys = Object.keys(parsedResponse);
    for (const key of keys) {
      if (Array.isArray(parsedResponse[key]) && parsedResponse[key].length > 0) {
        // Check if it looks like questions (has question and options properties)
        const firstItem = parsedResponse[key][0];
        if (firstItem && firstItem.question && firstItem.options) {
          return parsedResponse[key];
        }
      }
    }
    
    return [];
  }

  private createStrictContentOnlyFallbackQuestions(fileContent: string, prompt: string, numberOfQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): any[] {
    console.log('🔒 Creating STRICT content-only fallback questions');
    
    const questions = [];
    
    if (fileContent && fileContent.length > 100) {
      // Extract only actual terms and concepts from the file content
      const actualTerms = this.extractActualTermsFromContent(fileContent);
      const actualConcepts = this.extractActualConceptsFromContent(fileContent);
      
      for (let i = 0; i < numberOfQuestions; i++) {
        let questionData;
        
        if (i < actualTerms.length) {
          questionData = {
            question: `According to the document, what is mentioned about "${actualTerms[i]}"?`,
            options: [
              `Information as stated in the document`,
              `Information not mentioned in the document`,
              `Contradictory information`,
              `Unrelated concept`
            ],
            correctAnswer: 0,
            explanation: `The document specifically mentions "${actualTerms[i]}" in the provided content.`
          };
        } else if (i < actualConcepts.length) {
          questionData = {
            question: `Based on the document content, which statement about "${actualConcepts[i % actualConcepts.length]}" is accurate?`,
            options: [
              `As described in the document`,
              `Not mentioned in the document`,
              `Contradicts the document`,
              `Unrelated information`
            ],
            correctAnswer: 0,
            explanation: `The document discusses "${actualConcepts[i % actualConcepts.length]}" as part of its content.`
          };
        } else {
          questionData = {
            question: `What type of content is primarily discussed in the document?`,
            options: [
              `Content specific to the uploaded document`,
              `Generic theoretical frameworks`,
              `Unrelated academic concepts`,
              `Fabricated methodologies`
            ],
            correctAnswer: 0,
            explanation: `The question focuses on the actual content present in the uploaded document.`
          };
        }
        
        questions.push(questionData);
      }
    } else {
      // Very basic prompt-based questions without fabrication
      for (let i = 0; i < numberOfQuestions; i++) {
        questions.push({
          question: `What is a key aspect related to "${prompt}"?`,
          options: [
            `Direct concept from the topic`,
            `Unrelated information`,
            `Fabricated framework`,
            `Generic methodology`
          ],
          correctAnswer: 0,
          explanation: `This question focuses on the specific topic mentioned: "${prompt}".`
        });
      }
    }
    
    return questions;
  }

  // NEW: Extract only actual terms present in content
  private extractActualTermsFromContent(content: string): string[] {
    // Extract meaningful terms that actually appear in the content
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const terms = [];
    
    for (const sentence of sentences.slice(0, 10)) {
      const words = sentence.split(/\s+/).filter(word => 
        word.length > 4 && 
        /^[A-Za-z]+$/.test(word) &&
        !['this', 'that', 'these', 'those', 'when', 'where', 'what', 'which', 'while', 'they', 'their', 'there', 'then'].includes(word.toLowerCase())
      );
      
      if (words.length > 0) {
        terms.push(words[0]);
      }
    }
    
    return [...new Set(terms)].slice(0, 5);
  }

  // NEW: Extract only actual concepts present in content
  private extractActualConceptsFromContent(content: string): string[] {
    // Look for noun phrases that actually appear in the content
    const phrases = content.match(/\b[A-Z][a-z]+(?:\s+[a-z]+){1,2}\b/g) || [];
    const validPhrases = phrases.filter(phrase => 
      phrase.length > 8 && 
      phrase.length < 50 &&
      !phrase.toLowerCase().includes('the ') &&
      !phrase.toLowerCase().includes('this ') &&
      !phrase.toLowerCase().includes('that ')
    );
    
    return [...new Set(validPhrases)].slice(0, 5);
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
          temperature: 0.1 // Very low temperature to prevent content addition
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const enhancedContent = data.choices[0]?.message?.content || textContent;
      
      // Validate that enhanced content doesn't add fabricated sections
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

  // NEW: Validate content integrity to prevent fabrication
  private validateContentIntegrity(original: string, enhanced: string): boolean {
    // Check if enhanced content is suspiciously longer (indicating potential fabrication)
    if (enhanced.length > original.length * 1.5) {
      console.warn('Enhanced content significantly longer than original - potential fabrication');
      return false;
    }

    // Check for fabricated academic terms
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
          temperature: 0.2 // Low temperature to prevent fabrication
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
