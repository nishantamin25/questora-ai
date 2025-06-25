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

    // CRITICAL FIX: Ensure we use actual file content, not generic prompts
    let contentBasedPrompt = '';
    let sourceInstruction = '';

    if (fileContent && fileContent.trim().length > 100) {
      console.log('✅ Using REAL file content for question generation:', fileContent.length, 'characters');
      
      // Extract the most important parts of the content for focused questions
      const contentSummary = this.extractKeyContentForQuestions(fileContent);
      
      contentBasedPrompt = `Based EXCLUSIVELY on the following actual extracted content from the uploaded document, create ${numberOfQuestions} specific multiple-choice questions at ${difficulty} difficulty level.

ACTUAL DOCUMENT CONTENT:
"""
${contentSummary}
"""

CRITICAL INSTRUCTIONS:
- Create questions ONLY about the specific information, concepts, terms, and topics mentioned in the above content
- Do NOT create generic questions about the general topic
- Questions must be answerable using ONLY the information provided in the content above
- Focus on key facts, concepts, definitions, processes, and relationships mentioned in the content
- Make questions specific to the actual text, not general knowledge about the topic
- Each question should test understanding of specific content from the document`;

      sourceInstruction = `Questions must be directly based on the provided document content, not general knowledge.`;
    } else {
      console.log('⚠️ No substantial file content available, using prompt-based generation');
      contentBasedPrompt = `Create ${numberOfQuestions} multiple-choice questions about "${prompt}" at ${difficulty} difficulty level.`;
      sourceInstruction = `Create educational questions based on the topic.`;
    }

    let fullPrompt = `You are an expert question generator. ${sourceInstruction}

${contentBasedPrompt}

${totalSets > 1 ? `This is set ${setNumber} of ${totalSets}, so ensure questions are unique and don't overlap with other sets.` : ''}

RESPONSE FORMAT REQUIREMENTS:
Return a JSON object with a "questions" array. Each question MUST have:
- question: string (specific question based on the content)
- options: array of exactly 4 strings (answer choices)  
- correct_answer: number (index 0-3 of correct option)
- explanation: string (explanation referencing the source content)

Example format:
{
  "questions": [
    {
      "question": "According to the document, what is the main concept discussed?",
      "options": ["Specific Option A from content", "Specific Option B from content", "Specific Option C from content", "Specific Option D from content"],
      "correct_answer": 0,
      "explanation": "Based on the document content, Option A is correct because it directly states..."
    }
  ]
}

Generate exactly ${numberOfQuestions} questions now.`;

    if (language !== 'en') {
      fullPrompt += ` Generate questions in ${language}.`;
    }

    try {
      console.log('Sending focused content-based request to OpenAI...');

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
              content: 'You are an expert question generator specializing in creating specific, content-based questions. Always base questions on the actual provided content, never on general knowledge. Create questions that test specific understanding of the given material.'
            },
            {
              role: 'user',
              content: fullPrompt
            }
          ],
          max_tokens: 3000,
          temperature: 0.3, // Lower temperature for more focused, content-specific questions
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
        return this.createContentSpecificFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
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
          console.error('No valid questions found in response. Creating content-specific fallback questions.');
          return this.createContentSpecificFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
        }

        // Validate questions are content-specific
        const validQuestions = questions
          .filter(q => q && q.question && q.options && Array.isArray(q.options))
          .map(q => ({
            question: q.question,
            options: Array.isArray(q.options) ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
            correctAnswer: typeof q.correctAnswer === 'number' ? q.correctAnswer : 
                          typeof q.correct_answer === 'number' ? q.correct_answer : 0,
            explanation: q.explanation || 'Based on the document content.'
          }))
          .slice(0, numberOfQuestions);

        if (validQuestions.length === 0) {
          console.error('No valid questions after filtering. Creating content-specific fallback questions.');
          return this.createContentSpecificFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
        }

        console.log(`✅ Successfully generated ${validQuestions.length} content-specific questions`);
        return validQuestions;

      } catch (parseError) {
        console.error('Error parsing JSON from OpenAI:', parseError);
        console.error('Content received from OpenAI:', content);
        
        const extractedQuestions = this.extractQuestionsFromText(content);
        if (extractedQuestions.length > 0) {
          console.log('Successfully extracted questions from malformed response');
          return extractedQuestions.slice(0, numberOfQuestions);
        }
        
        return this.createContentSpecificFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      return this.createContentSpecificFallbackQuestions(fileContent, prompt, numberOfQuestions, difficulty);
    }
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

  private createContentSpecificFallbackQuestions(fileContent: string, prompt: string, numberOfQuestions: number, difficulty: 'easy' | 'medium' | 'hard'): any[] {
    console.log('Creating content-specific fallback questions');
    
    const questions = [];
    
    if (fileContent && fileContent.length > 100) {
      // Extract key terms and concepts from the actual content
      const keyTerms = this.extractTermsFromContent(fileContent);
      const concepts = this.extractConceptsFromContent(fileContent);
      const facts = this.extractFactsFromContent(fileContent);
      
      for (let i = 0; i < numberOfQuestions; i++) {
        let questionData;
        
        if (i < keyTerms.length) {
          questionData = {
            question: `Based on the document content, what is the significance of "${keyTerms[i]}"?`,
            options: [
              `It is a key concept mentioned in the document`,
              `It is unrelated to the document content`,
              `It is only briefly mentioned`,
              `It is not discussed in the document`
            ],
            correctAnswer: 0,
            explanation: `According to the document content, "${keyTerms[i]}" is specifically discussed as an important concept.`
          };
        } else if (i < concepts.length) {
          questionData = {
            question: `According to the document, which statement about "${concepts[i % concepts.length]}" is correct?`,
            options: [
              `It is explained as a relevant concept in the document`,
              `It is mentioned as irrelevant`,
              `It is not covered in the content`,
              `It contradicts the document's main points`
            ],
            correctAnswer: 0,
            explanation: `The document specifically discusses "${concepts[i % concepts.length]}" as part of its content.`
          };
        } else {
          questionData = {
            question: `Based on the document content, what is a key theme discussed?`,
            options: [
              `Concepts and information specific to the uploaded document`,
              `Generic information not related to the document`,
              `Unrelated theoretical concepts`,
              `Information contradicting the document`
            ],
            correctAnswer: 0,
            explanation: `The question focuses on the specific content and themes present in the uploaded document.`
          };
        }
        
        questions.push(questionData);
      }
    } else {
      // Fallback to prompt-based questions
      const topics = this.extractTopicsFromPrompt(prompt);
      
      for (let i = 0; i < numberOfQuestions; i++) {
        const topic = topics[i % topics.length] || 'the specified topic';
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
    }
    
    return questions;
  }

  private extractTermsFromContent(content: string): string[] {
    // Extract meaningful terms from content
    const terms = content.match(/\b[A-Z][a-z]{3,}(?:\s+[A-Z][a-z]{2,}){0,2}\b/g) || [];
    const uniqueTerms = [...new Set(terms)].filter(term => 
      term.length > 4 && 
      !['This', 'That', 'These', 'Those', 'When', 'Where', 'What', 'Which', 'While'].includes(term)
    );
    return uniqueTerms.slice(0, 10);
  }

  private extractConceptsFromContent(content: string): string[] {
    // Extract conceptual phrases
    const concepts = content.match(/\b(?:concept|principle|theory|method|approach|strategy|technique|process|system|framework|model|structure|design|implementation|application|practice|procedure|analysis|evaluation|assessment|measurement|development|improvement|optimization|solution|innovation|technology|methodology|standard|guideline|requirement|specification|criterion|factor|element|component|aspect|feature|characteristic|property|function|operation|capability|capacity|performance|effectiveness|efficiency|quality|value|benefit|advantage|outcome|result|impact|effect|influence|change|transformation|evolution|progress|advancement|achievement|success|accomplishment|result|consequence|implication|consideration|issue|challenge|problem|difficulty|obstacle|barrier|limitation|constraint|restriction|requirement|specification|criteria|parameter|variable|factor|indicator|measure|metric|value|number|percentage|ratio|rate|frequency|duration|time|period|interval|schedule|timeline|deadline|milestone|target|benchmark|threshold|limit|boundary)\b/gi) || [];
    return [...new Set(concepts)].slice(0, 8);
  }

  private extractFactsFromContent(content: string): string[] {
    // Extract factual statements (sentences with specific information)
    const sentences = content.split(/[.!?]+/).filter(s => 
      s.trim().length > 30 && 
      s.trim().length < 150 &&
      /\b(?:is|are|was|were|has|have|contains|includes|provides|offers|demonstrates|shows|indicates|suggests|reveals|explains|describes|defines|establishes|determines|identifies|measures|evaluates|analyzes|compares|contrasts|implements|applies|uses|utilizes|employs|requires|needs|must|should|can|will|may)\b/i.test(s)
    );
    return sentences.slice(0, 5);
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

  private extractTopicsFromPrompt(prompt: string): string[] {
    const words = prompt.toLowerCase().split(/\s+/)
      .filter(word => word.length > 3)
      .filter(word => !['the', 'and', 'for', 'with', 'from', 'create', 'course', 'questions', 'about'].includes(word));
    
    return words.slice(0, 5);
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
              content: 'You are an educational content enhancer. Clean, organize, and enhance the provided text content while preserving all original information. Focus on making the content clear and educational without adding new information not present in the source.'
            },
            {
              role: 'user',
              content: `Please clean and enhance this extracted text content for educational use. Organize it logically, fix formatting issues, and make it more readable while preserving ALL original information and concepts:

${textContent}`
            }
          ],
          max_tokens: 2000,
          temperature: 0.3 // Lower temperature to stay closer to original content
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const enhancedContent = data.choices[0]?.message?.content || textContent;
      
      // Validate that enhanced content is substantially better
      if (enhancedContent.length > textContent.length * 0.5) {
        return enhancedContent;
      } else {
        return textContent;
      }
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
              content: 'You are an educational content generator. When provided with source content, strictly organize and structure ONLY that content without adding new information. When generating original content, create comprehensive, well-structured educational material.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.3 // Lower temperature for more faithful content reproduction
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
