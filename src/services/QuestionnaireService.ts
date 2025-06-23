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
  includeCourse: boolean;
  includeQuestionnaire: boolean;
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
    // ... keep existing code (other question templates)
  };

  private cleanupOldQuestionnaires(): void {
    try {
      const questionnaires = this.getAllQuestionnaires();
      // Keep only the 5 most recent questionnaires (reduced from 10)
      const recentQuestionnaires = questionnaires
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      // Clear storage completely first
      localStorage.removeItem('questionnaires');
      
      // Try to save the reduced set
      if (recentQuestionnaires.length > 0) {
        localStorage.setItem('questionnaires', JSON.stringify(recentQuestionnaires));
      }
      
      console.log('Cleaned up old questionnaires, kept:', recentQuestionnaires.length);
    } catch (error) {
      console.error('Error during cleanup:', error);
      // If cleanup fails, clear all questionnaires
      localStorage.removeItem('questionnaires');
    }
  }

  async generateQuestionnaire(prompt: string, options: GenerateQuestionnaireOptions, fileContent?: string): Promise<Questionnaire> {
    console.log('Generating questionnaire with options:', options);
    console.log('File content provided:', !!fileContent);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const questionnaireId = this.generateId();
    const title = options.testName;
    const description = this.generateDescription(prompt, fileContent);
    
    let questions: Question[] = [];
    
    // Only generate questions if includeQuestionnaire is true
    if (options.includeQuestionnaire) {
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
    }

    // Handle course generation
    let courseContent = null;
    if (options.includeCourse) {
      console.log('Generating course content...');
      courseContent = this.generateCourseContent(prompt, fileContent);
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
      timeframe: options.timeframe,
      ...(courseContent && { courseContent })
    };

    console.log('Generated questionnaire:', questionnaire);
    return questionnaire;
  }

  private generateCourseContent(prompt: string, fileContent?: string): any {
    console.log('Generating course content from prompt and files');
    
    // Basic course structure generation
    const courseContent = {
      id: this.generateId(),
      title: `Course: ${prompt.substring(0, 50)}...`,
      description: `This course was generated based on: "${prompt}"`,
      modules: []
    };

    // If we have file content, try to create modules from it
    if (fileContent && fileContent.trim().length > 0) {
      const modules = this.extractModulesFromContent(fileContent);
      courseContent.modules = modules;
    } else {
      // Create a basic module structure from the prompt
      courseContent.modules = [
        {
          id: this.generateId(),
          title: 'Introduction',
          content: `Welcome to this course about: ${prompt}`,
          type: 'text'
        },
        {
          id: this.generateId(),
          title: 'Main Content',
          content: `This module covers the key concepts related to: ${prompt}`,
          type: 'text'
        }
      ];
    }

    return courseContent;
  }

  private extractModulesFromContent(fileContent: string): any[] {
    const modules = [];
    
    // Try to extract meaningful sections from file content
    const lines = fileContent.split('\n').filter(line => line.trim().length > 0);
    
    let currentModule = null;
    let moduleContent = [];
    
    for (const line of lines) {
      // Check if this line could be a heading/title
      if (line.length < 100 && (
        line.startsWith('#') || 
        line.match(/^[A-Z][^.]*:?$/) ||
        line.match(/^\d+\./)
      )) {
        // Save previous module if exists
        if (currentModule) {
          modules.push({
            id: this.generateId(),
            title: currentModule,
            content: moduleContent.join('\n'),
            type: 'text'
          });
        }
        
        // Start new module
        currentModule = line.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '');
        moduleContent = [];
      } else {
        // Add to current module content
        moduleContent.push(line);
      }
    }
    
    // Don't forget the last module
    if (currentModule) {
      modules.push({
        id: this.generateId(),
        title: currentModule,
        content: moduleContent.join('\n'),
        type: 'text'
      });
    }
    
    // If no modules were extracted, create a single module with all content
    if (modules.length === 0) {
      modules.push({
        id: this.generateId(),
        title: 'Course Content',
        content: fileContent,
        type: 'text'
      });
    }
    
    return modules.slice(0, 5); // Limit to 5 modules
  }

  saveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      const existingQuestionnaires = this.getAllQuestionnaires();
      const updatedQuestionnaires = existingQuestionnaires.filter(q => q.id !== questionnaire.id);
      updatedQuestionnaires.unshift({...questionnaire, isSaved: true});
      
      // Try to save with more aggressive size management
      const dataToSave = JSON.stringify(updatedQuestionnaires);
      
      // Check if data size is too large (approximate check)
      if (dataToSave.length > 4000000) { // ~4MB limit
        console.log('Data too large, performing aggressive cleanup...');
        this.cleanupOldQuestionnaires();
        
        // Try again with just this questionnaire
        const minimalData = JSON.stringify([{...questionnaire, isSaved: true}]);
        localStorage.setItem('questionnaires', minimalData);
      } else {
        localStorage.setItem('questionnaires', dataToSave);
      }
      
      console.log('Questionnaire saved successfully');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'QuotaExceededError') {
        console.log('Storage quota exceeded, performing aggressive cleanup...');
        
        // More aggressive cleanup - clear everything and save only this questionnaire
        localStorage.removeItem('questionnaires');
        
        try {
          const singleQuestionnaireData = JSON.stringify([{...questionnaire, isSaved: true}]);
          localStorage.setItem('questionnaires', singleQuestionnaireData);
          console.log('Questionnaire saved successfully after aggressive cleanup');
        } catch (retryError) {
          console.error('Failed to save questionnaire even after aggressive cleanup:', retryError);
          throw new Error('Unable to save. Please try refreshing the page and try again.');
        }
      } else {
        console.error('Error saving questionnaire:', error);
        throw error;
      }
    }
  }

  getAllQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem('questionnaires');
      if (stored) {
        return JSON.parse(stored);
      }
      return [];
    } catch (error) {
      console.error('Error reading questionnaires from localStorage:', error);
      return [];
    }
  }

  getActiveQuestionnaires(): Questionnaire[] {
    return this.getAllQuestionnaires().filter(q => q.isActive && q.isSaved);
  }

  deleteQuestionnaire(questionnaireId: string): void {
    try {
      const questionnaires = this.getAllQuestionnaires();
      const updatedQuestionnaires = questionnaires.filter(q => q.id !== questionnaireId);
      localStorage.setItem('questionnaires', JSON.stringify(updatedQuestionnaires));
      console.log('Questionnaire deleted successfully');
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      throw error;
    }
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
