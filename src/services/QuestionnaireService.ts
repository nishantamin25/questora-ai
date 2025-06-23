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
  setNumber?: number;
  totalSets?: number;
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
    'employee feedback': [
      'How satisfied are you with your current role?',
      'How would you rate the work-life balance?',
      'How supportive is your immediate supervisor?',
      'How clear are your job responsibilities?',
      'How satisfied are you with professional development opportunities?',
      'How would you rate communication within the team?',
      'How fair is the compensation for your role?',
      'How likely are you to recommend this company as a place to work?',
      'How satisfied are you with the work environment?',
      'How well does the company support your career goals?'
    ],
    'product feedback': [
      'How easy is the product to use?',
      'How well does the product meet your needs?',
      'How would you rate the product quality?',
      'How satisfied are you with the product features?',
      'How likely are you to recommend this product?',
      'How does this product compare to alternatives?',
      'How satisfied are you with the product performance?',
      'How intuitive is the product interface?',
      'How reliable has the product been?',
      'How would you rate the overall value of the product?'
    ],
    'event feedback': [
      'How satisfied were you with the event overall?',
      'How well organized was the event?',
      'How relevant was the content to your interests?',
      'How would you rate the quality of speakers/presenters?',
      'How satisfied were you with the venue?',
      'How likely are you to attend similar events?',
      'How would you rate the networking opportunities?',
      'How clear was the event communication beforehand?',
      'How satisfied were you with the event duration?',
      'How would you rate the registration process?'
    ],
    'general': [
      'How would you rate your overall experience?',
      'What improvements would you suggest?',
      'How likely are you to participate again?',
      'How clear were the instructions provided?',
      'How satisfied are you with the support received?',
      'How would you rate the quality of the content?',
      'How user-friendly did you find the interface?',
      'How relevant was the information provided?',
      'How would you rate the response time?',
      'How professional was the service?'
    ]
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

  async generateQuestionnaire(prompt: string, options: GenerateQuestionnaireOptions, fileContent?: string, setNumber?: number, totalSets?: number): Promise<Questionnaire> {
    console.log('Generating questionnaire with options:', options, 'Set:', setNumber, 'of', totalSets);
    console.log('File content provided:', !!fileContent);
    
    // Simulate AI processing delay
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const questionnaireId = this.generateId();
    const setInfo = setNumber && totalSets && totalSets > 1 ? ` - Set ${setNumber}` : '';
    const title = options.testName + setInfo;
    const description = this.generateDescription(prompt, fileContent, setNumber, totalSets);
    
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
            fileContent,
            setNumber,
            totalSets
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
          questions = this.generateQuestions(
            prompt, 
            options.numberOfQuestions, 
            options.difficulty, 
            fileContent, 
            setNumber, 
            totalSets
          );
        }
      } else {
        console.log('No ChatGPT API key found, using template-based generation');
        // Use template-based generation
        questions = this.generateQuestions(
          prompt, 
          options.numberOfQuestions, 
          options.difficulty, 
          fileContent, 
          setNumber, 
          totalSets
        );
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
      setNumber,
      totalSets,
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

  private generateDescription(prompt: string, fileContent?: string, setNumber?: number, totalSets?: number): string {
    let description = `This questionnaire was generated based on: "${prompt}"`;
    if (fileContent && fileContent.trim().length > 0) {
      description += ` Additional context was provided from uploaded file content.`;
    }
    if (setNumber && totalSets && totalSets > 1) {
      description += ` This is set ${setNumber} of ${totalSets} with unique questions.`;
    }
    return description;
  }

  private generateQuestions(
    prompt: string, 
    numberOfQuestions: number, 
    difficulty: 'easy' | 'medium' | 'hard', 
    fileContent?: string, 
    setNumber?: number, 
    totalSets?: number
  ): Question[] {
    const questions: Question[] = [];
    const category = this.categorizePrompt(prompt, fileContent);
    const baseQuestions = this.questionTemplates[category as keyof typeof this.questionTemplates] || 
                         this.questionTemplates['customer satisfaction'];
    
    // Calculate how many questions to take from base questions vs file-based questions
    let baseQuestionCount = numberOfQuestions;
    let fileBasedQuestions: Question[] = [];
    
    if (fileContent && fileContent.trim().length > 10) {
      fileBasedQuestions = this.generateFileBasedQuestions(fileContent, prompt, setNumber);
      baseQuestionCount = Math.max(numberOfQuestions - fileBasedQuestions.length, Math.floor(numberOfQuestions * 0.7));
    }
    
    // Create a much larger pool of questions to ensure uniqueness across sets
    const extendedQuestionPool = [
      ...baseQuestions,
      // Add more generic questions to expand the pool
      'How would you rate your overall experience?',
      'What improvements would you suggest?',
      'How likely are you to participate again?',
      'How clear were the instructions provided?',
      'How satisfied are you with the support received?',
      'How would you rate the quality of the content?',
      'How user-friendly did you find the interface?',
      'How relevant was the information provided?',
      'How would you rate the response time?',
      'How professional was the service?',
      'How accessible was the platform?',
      'How engaging was the content?',
      'How comprehensive was the information?',
      'How timely was the delivery?',
      'How helpful was the documentation?',
      'How intuitive was the navigation?',
      'How reliable was the system performance?',
      'How effective was the communication?',
      'How satisfied are you with the features?',
      'How would you rate the overall design?',
      'How convenient was the process?',
      'How thorough was the explanation?',
      'How accurate was the information?',
      'How flexible were the options?',
      'How responsive was the support team?',
      'How well did it meet your expectations?',
      'How smooth was the experience?',
      'How clear was the feedback provided?',
      'How organized was the content structure?',
      'How valuable was the training received?'
    ];
    
    // Shuffle and create unique offset for each set to ensure no overlap
    const shuffledQuestions = [...extendedQuestionPool].sort(() => Math.random() - 0.5);
    const setOffset = setNumber ? (setNumber - 1) * numberOfQuestions : 0;
    const totalQuestionsNeeded = totalSets ? totalSets * numberOfQuestions : numberOfQuestions;
    
    // Ensure we have enough questions in the pool
    while (shuffledQuestions.length < totalQuestionsNeeded) {
      shuffledQuestions.push(...extendedQuestionPool);
    }
    
    // Take unique questions for this set
    for (let i = 0; i < Math.min(baseQuestionCount, shuffledQuestions.length - setOffset); i++) {
      const questionIndex = setOffset + i;
      if (questionIndex < shuffledQuestions.length) {
        const questionText = this.adaptQuestionToPrompt(shuffledQuestions[questionIndex], prompt, fileContent, setNumber);
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
    }

    // Add file-based questions if available
    questions.push(...fileBasedQuestions.slice(0, numberOfQuestions - questions.length));

    // Fill remaining slots with additional unique questions if needed
    while (questions.length < numberOfQuestions) {
      const remainingIndex = setOffset + questions.length;
      if (remainingIndex < shuffledQuestions.length) {
        const questionText = this.adaptQuestionToPrompt(shuffledQuestions[remainingIndex], prompt, fileContent, setNumber);
        questions.push({
          id: this.generateId(),
          text: questionText,
          type: 'radio',
          options: ['Poor', 'Fair', 'Good', 'Excellent']
        });
      } else {
        // Fallback if we somehow run out of questions
        questions.push({
          id: this.generateId(),
          text: `How would you rate this aspect? (Set ${setNumber || 1}, Question ${questions.length + 1})`,
          type: 'radio',
          options: ['Poor', 'Fair', 'Good', 'Excellent']
        });
      }
    }

    console.log(`Generated ${questions.length} unique questions for set ${setNumber || 1}`);
    return questions.slice(0, numberOfQuestions);
  }

  private generateFileBasedQuestions(fileContent: string, prompt: string, setNumber?: number): Question[] {
    const questions: Question[] = [];
    
    // Analyze file content to generate relevant questions
    const content = fileContent.toLowerCase();
    const setVariation = setNumber ? ` (Set ${setNumber} perspective)` : '';
    
    if (content.includes('policy') || content.includes('procedure')) {
      questions.push({
        id: this.generateId(),
        text: `Based on the provided policy document, how clear are the outlined procedures?${setVariation}`,
        type: 'radio',
        options: ['Very Unclear', 'Somewhat Unclear', 'Clear', 'Very Clear']
      });
    }
    
    if (content.includes('training') || content.includes('course') || content.includes('learn')) {
      questions.push({
        id: this.generateId(),
        text: `How would you rate the comprehensiveness of the training material provided?${setVariation}`,
        type: 'radio',
        options: ['Poor', 'Fair', 'Good', 'Excellent']
      });
    }
    
    // Default file-based question if no specific patterns are found
    if (questions.length === 0) {
      questions.push({
        id: this.generateId(),
        text: `Based on the provided document content, how relevant is the information to your needs?${setVariation}`,
        type: 'radio',
        options: ['Not Relevant', 'Somewhat Relevant', 'Relevant', 'Very Relevant']
      });
    }
    
    return questions.slice(0, 3); // Limit to 3 additional questions from file content
  }

  private adaptQuestionToPrompt(baseQuestion: string, prompt: string, fileContent?: string, setNumber?: number): string {
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
    
    // Add subtle variation for different sets
    if (setNumber && setNumber > 1) {
      const variations = [
        '', // no change for set 1
        ' in your experience',
        ' from your perspective',
        ' in your opinion',
        ' based on your usage'
      ];
      const variation = variations[setNumber % variations.length];
      if (variation && !adapted.includes(variation)) {
        adapted = adapted.replace('?', `${variation}?`);
      }
    }
    
    return adapted;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const QuestionnaireService = new QuestionnaireServiceClass();
