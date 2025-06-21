import { ConfigService } from './ConfigService';

interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive?: boolean;
}

class QuestionnaireServiceClass {
  private questionTemplates = {
    'customer satisfaction': [
      'How satisfied are you with our product/service overall?',
      'How likely are you to recommend us to a friend or colleague?',
      'How would you rate the quality of our customer service?',
      'What aspect of our service did you find most valuable?',
      'How can we improve your experience with us?'
    ],
    'employee feedback': [
      'How satisfied are you with your current role?',
      'Do you feel valued and appreciated at work?',
      'How would you rate the communication from management?',
      'What motivates you most in your current position?',
      'What suggestions do you have for improving our workplace?'
    ],
    'product feedback': [
      'How easy was it to use our product?',
      'Which features do you find most useful?',
      'What problems does our product solve for you?',
      'How does our product compare to alternatives?',
      'What additional features would you like to see?'
    ],
    'event feedback': [
      'How would you rate the overall event experience?',
      'Was the event content relevant to your needs?',
      'How was the quality of the speakers/presentations?',
      'Would you attend similar events in the future?',
      'What could we do to improve future events?'
    ]
  };

  async generateQuestionnaire(prompt: string, fileContent?: string): Promise<Questionnaire> {
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const config = ConfigService.getConfig();
    const questionnaireId = this.generateId();
    
    // Analyze prompt to determine questionnaire type
    const category = this.categorizePrompt(prompt);
    const title = this.generateTitle(prompt);
    const description = this.generateDescription(prompt, fileContent);
    
    // Generate questions based on prompt and configuration
    const questions = this.generateQuestions(
      prompt, 
      category, 
      config, 
      fileContent
    );

    const questionnaire: Questionnaire = {
      id: questionnaireId,
      title,
      description,
      questions,
      createdAt: new Date().toISOString(),
      isActive: false
    };

    // Save to localStorage
    this.saveQuestionnaire(questionnaire);

    return questionnaire;
  }

  saveQuestionnaire(questionnaire: Questionnaire): void {
    const existingQuestionnaires = this.getAllQuestionnaires();
    const updatedQuestionnaires = existingQuestionnaires.filter(q => q.id !== questionnaire.id);
    updatedQuestionnaires.unshift(questionnaire);
    localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
  }

  getAllQuestionnaires(): Questionnaire[] {
    const stored = localStorage.getItem('questionnaires');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }

  deleteQuestionnaire(questionnaireId: string): void {
    const questionnaires = this.getAllQuestionnaires();
    const updatedQuestionnaires = questionnaires.filter(q => q.id !== questionnaireId);
    localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
  }

  private categorizePrompt(prompt: string): string {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('customer') || lowerPrompt.includes('satisfaction') || lowerPrompt.includes('service')) {
      return 'customer satisfaction';
    }
    if (lowerPrompt.includes('employee') || lowerPrompt.includes('staff') || lowerPrompt.includes('workplace')) {
      return 'employee feedback';
    }
    if (lowerPrompt.includes('product') || lowerPrompt.includes('feature') || lowerPrompt.includes('usability')) {
      return 'product feedback';
    }
    if (lowerPrompt.includes('event') || lowerPrompt.includes('conference') || lowerPrompt.includes('workshop')) {
      return 'event feedback';
    }
    
    return 'general';
  }

  private generateTitle(prompt: string): string {
    const words = prompt.split(' ').slice(0, 6);
    return words.join(' ').replace(/^./, str => str.toUpperCase()) + ' Questionnaire';
  }

  private generateDescription(prompt: string, fileContent?: string): string {
    let description = `This questionnaire was generated based on: "${prompt}"`;
    if (fileContent) {
      description += ` Additional context was provided from uploaded file content.`;
    }
    return description;
  }

  private generateQuestions(prompt: string, category: string, config: any, fileContent?: string): Question[] {
    const questions: Question[] = [];
    const baseQuestions = this.questionTemplates[category as keyof typeof this.questionTemplates] || 
                         this.questionTemplates['customer satisfaction'];
    
    const numQuestions = Math.min(config.numberOfQuestions, baseQuestions.length);
    
    for (let i = 0; i < numQuestions; i++) {
      const questionText = this.adaptQuestionToPrompt(baseQuestions[i], prompt);
      const question: Question = {
        id: this.generateId(),
        text: questionText,
        type: 'multiple-choice' // Force all questions to be multiple-choice with 4 options
      };

      // Always ensure exactly 4 options for every question
      question.options = [
        'Strongly Disagree',
        'Disagree', 
        'Agree',
        'Strongly Agree'
      ];

      questions.push(question);
    }

    // If file content is provided, add a context-specific question
    if (fileContent && fileContent.length > 10) {
      questions.push({
        id: this.generateId(),
        text: 'Based on the provided context, how would you rate the overall quality?',
        type: 'multiple-choice',
        options: ['Poor', 'Fair', 'Good', 'Excellent']
      });
    }

    return questions;
  }

  private adaptQuestionToPrompt(baseQuestion: string, prompt: string): string {
    // Simple adaptation - replace generic terms with prompt-specific terms
    let adapted = baseQuestion;
    
    if (prompt.toLowerCase().includes('website')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'website');
    } else if (prompt.toLowerCase().includes('app')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'app');
    } else if (prompt.toLowerCase().includes('course')) {
      adapted = adapted.replace(/product\/service|service|product/gi, 'course');
    }
    
    return adapted;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const QuestionnaireService = new QuestionnaireServiceClass();
