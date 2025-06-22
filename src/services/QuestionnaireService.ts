import { ConfigService } from './ConfigService';
import { ChatGPTService } from './ChatGPTService';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
  correctAnswer?: number; // Index of the correct answer
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive?: boolean;
  testName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isSaved?: boolean;
  timeframe?: number;
}

interface GenerateQuestionnaireOptions {
  testName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  timeframe: number;
}

class QuestionnaireServiceClass {
  private questionTemplates = {
    'customer satisfaction': [
      'How satisfied are you with our product/service overall?',
      'How likely are you to recommend us to a friend or colleague?',
      'How would you rate the quality of our customer service?',
      'What aspect of our service did you find most valuable?',
      'How can we improve your experience with us?',
      'How would you rate the value for money of our service?',
      'How satisfied are you with the response time to your inquiries?',
      'How easy was it to find the information you needed?',
      'How professional was our staff during your interaction?',
      'How likely are you to use our services again?'
    ],
    'employee feedback': [
      'How satisfied are you with your current role?',
      'Do you feel valued and appreciated at work?',
      'How would you rate the communication from management?',
      'What motivates you most in your current position?',
      'What suggestions do you have for improving our workplace?',
      'How satisfied are you with your work-life balance?',
      'How would you rate the training and development opportunities?',
      'How comfortable do you feel expressing your opinions at work?',
      'How satisfied are you with the recognition you receive?',
      'How likely are you to recommend this company as a place to work?'
    ],
    'product feedback': [
      'How easy was it to use our product?',
      'Which features do you find most useful?',
      'What problems does our product solve for you?',
      'How does our product compare to alternatives?',
      'What additional features would you like to see?',
      'How would you rate the product design and interface?',
      'How satisfied are you with the product performance?',
      'How likely are you to upgrade to a newer version?',
      'How would you rate the product documentation?',
      'What is the biggest challenge you face when using our product?'
    ],
    'event feedback': [
      'How would you rate the overall event experience?',
      'Was the event content relevant to your needs?',
      'How was the quality of the speakers/presentations?',
      'Would you attend similar events in the future?',
      'What could we do to improve future events?',
      'How satisfied were you with the event venue and facilities?',
      'How would you rate the event organization and logistics?',
      'How useful was the networking opportunity provided?',
      'How satisfied were you with the event duration?',
      'What was the most valuable part of the event for you?'
    ]
  };

  async generateQuestionnaire(prompt: string, options: GenerateQuestionnaireOptions, fileContent?: string): Promise<Questionnaire> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const questionnaireId = this.generateId();
    const title = options.testName;
    const description = this.generateDescription(prompt, fileContent);
    
    let questions: Question[] = [];
    
    // Try to use ChatGPT first if API key is available
    const chatGptApiKey = ChatGPTService.getApiKey();
    if (chatGptApiKey) {
      try {
        console.log('Using ChatGPT to generate questions...');
        const chatGptQuestions = await ChatGPTService.generateQuestions(
          prompt,
          options.numberOfQuestions,
          options.difficulty,
          fileContent
        );
        
        // Convert ChatGPT questions to our format
        questions = chatGptQuestions.map(q => ({
          id: this.generateId(),
          text: q.question,
          type: 'multiple-choice',
          options: q.options,
          correctAnswer: q.correctAnswer
        }));
        
        console.log('Successfully generated questions with ChatGPT');
      } catch (error) {
        console.error('ChatGPT generation failed, falling back to template-based generation:', error);
        // Fall back to template-based generation
        questions = this.generateFallbackQuestions(prompt, options, fileContent);
      }
    } else {
      console.log('No ChatGPT API key found, using template-based generation');
      // Use template-based generation
      questions = this.generateFallbackQuestions(prompt, options, fileContent);
    }

    const questionnaire: Questionnaire = {
      id: questionnaireId,
      title,
      description,
      questions,
      createdAt: new Date().toISOString(),
      isActive: false,
      testName: options.testName,
      difficulty: options.difficulty,
      isSaved: false,
      timeframe: options.timeframe
    };

    return questionnaire;
  }

  saveQuestionnaire(questionnaire: Questionnaire): void {
    const existingQuestionnaires = this.getAllQuestionnaires();
    const updatedQuestionnaires = existingQuestionnaires.filter(q => q.id !== questionnaire.id);
    updatedQuestionnaires.unshift({...questionnaire, isSaved: true});
    localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
  }

  getAllQuestionnaires(): Questionnaire[] {
    const stored = localStorage.getItem('questionnaires');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }

  getActiveQuestionnaires(): Questionnaire[] {
    return this.getAllQuestionnaires().filter(q => q.isActive && q.isSaved);
  }

  deleteQuestionnaire(questionnaireId: string): void {
    const questionnaires = this.getAllQuestionnaires();
    const updatedQuestionnaires = questionnaires.filter(q => q.id !== questionnaireId);
    localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
  }

  private categorizePrompt(prompt: string, fileContent?: string): string {
    const lowerPrompt = prompt.toLowerCase();
    const lowerFileContent = fileContent?.toLowerCase() || '';
    const combinedContent = lowerPrompt + ' ' + lowerFileContent;
    
    if (combinedContent.includes('customer') || combinedContent.includes('satisfaction') || combinedContent.includes('service')) {
      return 'customer satisfaction';
    }
    if (combinedContent.includes('employee') || combinedContent.includes('staff') || combinedContent.includes('workplace')) {
      return 'employee feedback';
    }
    if (combinedContent.includes('product') || combinedContent.includes('feature') || combinedContent.includes('usability')) {
      return 'product feedback';
    }
    if (combinedContent.includes('event') || combinedContent.includes('conference') || combinedContent.includes('workshop')) {
      return 'event feedback';
    }
    
    return 'general';
  }

  private generateDescription(prompt: string, fileContent?: string): string {
    let description = `This questionnaire was generated based on: "${prompt}"`;
    if (fileContent && fileContent.trim().length > 0) {
      description += ` Additional context was provided from uploaded file content.`;
    }
    return description;
  }

  private generateQuestions(prompt: string, category: string, numberOfQuestions: number, fileContent?: string): Question[] {
    const questions: Question[] = [];
    const baseQuestions = this.questionTemplates[category as keyof typeof this.questionTemplates] || 
                         this.questionTemplates['customer satisfaction'];
    
    // Calculate how many questions to take from base questions vs file-based questions
    let baseQuestionCount = numberOfQuestions;
    let fileBasedQuestions: Question[] = [];
    
    if (fileContent && fileContent.trim().length > 10) {
      fileBasedQuestions = this.generateFileBasedQuestions(fileContent, prompt);
      baseQuestionCount = Math.max(numberOfQuestions - fileBasedQuestions.length, Math.floor(numberOfQuestions * 0.7));
    }
    
    // Generate base questions
    const shuffledBaseQuestions = [...baseQuestions].sort(() => Math.random() - 0.5);
    for (let i = 0; i < Math.min(baseQuestionCount, shuffledBaseQuestions.length); i++) {
      const questionText = this.adaptQuestionToPrompt(shuffledBaseQuestions[i], prompt, fileContent);
      const question: Question = {
        id: this.generateId(),
        text: questionText,
        type: 'radio'
      };

      question.options = [
        'Strongly Disagree',
        'Disagree', 
        'Agree',
        'Strongly Agree'
      ];

      questions.push(question);
    }

    // Add file-based questions if available
    questions.push(...fileBasedQuestions.slice(0, numberOfQuestions - questions.length));

    // If we still need more questions, generate generic ones
    while (questions.length < numberOfQuestions) {
      const genericQuestions = [
        'How would you rate your overall experience?',
        'What improvements would you suggest?',
        'How likely are you to participate again?',
        'How clear were the instructions provided?',
        'How satisfied are you with the support received?'
      ];
      
      const randomGeneric = genericQuestions[Math.floor(Math.random() * genericQuestions.length)];
      questions.push({
        id: this.generateId(),
        text: this.adaptQuestionToPrompt(randomGeneric, prompt, fileContent),
        type: 'radio',
        options: ['Poor', 'Fair', 'Good', 'Excellent']
      });
    }

    return questions.slice(0, numberOfQuestions);
  }

  private generateFileBasedQuestions(fileContent: string, prompt: string): Question[] {
    const questions: Question[] = [];
    
    // Analyze file content to generate relevant questions
    const content = fileContent.toLowerCase();
    
    if (content.includes('policy') || content.includes('procedure')) {
      questions.push({
        id: this.generateId(),
        text: 'Based on the provided policy document, how clear are the outlined procedures?',
        type: 'radio',
        options: ['Very Unclear', 'Somewhat Unclear', 'Clear', 'Very Clear']
      });
    }
    
    if (content.includes('training') || content.includes('course') || content.includes('learn')) {
      questions.push({
        id: this.generateId(),
        text: 'How would you rate the comprehensiveness of the training material provided?',
        type: 'radio',
        options: ['Poor', 'Fair', 'Good', 'Excellent']
      });
    }
    
    // Default file-based question if no specific patterns are found
    if (questions.length === 0) {
      questions.push({
        id: this.generateId(),
        text: 'Based on the provided document content, how relevant is the information to your needs?',
        type: 'radio',
        options: ['Not Relevant', 'Somewhat Relevant', 'Relevant', 'Very Relevant']
      });
    }
    
    return questions.slice(0, 3); // Limit to 3 additional questions from file content
  }

  private adaptQuestionToPrompt(baseQuestion: string, prompt: string, fileContent?: string): string {
    let adapted = baseQuestion;
    const combinedContent = prompt.toLowerCase() + ' ' + (fileContent?.toLowerCase() || '');
    
    if (combinedContent.includes('website')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'website');
    } else if (combinedContent.includes('app')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'app');
    } else if (combinedContent.includes('course') || combinedContent.includes('training')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'course');
    } else if (combinedContent.includes('policy')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'policy');
    }
    
    return adapted;
  }

  private generateFallbackQuestions(prompt: string, options: GenerateQuestionnaireOptions, fileContent?: string): Question[] {
    // This is the existing question generation logic
    const category = this.categorizePrompt(prompt, fileContent);
    return this.generateQuestions(prompt, category, options.numberOfQuestions, fileContent);
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const QuestionnaireService = new QuestionnaireServiceClass();
