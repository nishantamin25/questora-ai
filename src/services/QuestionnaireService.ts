import { ConfigService } from './ConfigService';
import { ChatGPTService } from './ChatGPTService';
import { FileProcessingService } from './FileProcessingService';

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
      const recentQuestionnaires = questionnaires
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);
      
      localStorage.removeItem('questionnaires');
      
      if (recentQuestionnaires.length > 0) {
        localStorage.setItem('questionnaires', JSON.stringify(recentQuestionnaires));
      }
      
      console.log('Cleaned up old questionnaires, kept:', recentQuestionnaires.length);
    } catch (error) {
      console.error('Error during cleanup:', error);
      localStorage.removeItem('questionnaires');
    }
  }

  async generateQuestionnaire(prompt: string, options: GenerateQuestionnaireOptions, fileContent?: string, setNumber?: number, totalSets?: number): Promise<Questionnaire> {
    console.log('Generating questionnaire with options:', options, 'Set:', setNumber, 'of', totalSets);
    console.log('Raw file content provided:', !!fileContent, 'Length:', fileContent?.length);
    
    let processedFileContent = '';
    let isFileContentUsable = false;
    
    if (fileContent && fileContent.trim().length > 0) {
      console.log('Processing file content for questionnaire generation...');
      
      try {
        const processedFile = await FileProcessingService.processFile(new File([fileContent], 'uploadedFile'));
        processedFileContent = processedFile.content;
        isFileContentUsable = processedFileContent.length > 100; // Increased threshold
        console.log('File content is educational and usable. Processed length:', processedFileContent.length);
      } catch (error) {
        console.error('Error processing file content:', error);
        processedFileContent = '';
        isFileContentUsable = false;
      }
    }
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const questionnaireId = this.generateId();
    const setInfo = setNumber && totalSets && totalSets > 1 ? ` - Set ${setNumber}` : '';
    const title = options.testName + setInfo;
    const description = this.generateDescription(prompt, isFileContentUsable ? processedFileContent : undefined, setNumber, totalSets);
    
    let questions: Question[] = [];
    
    if (options.includeQuestionnaire) {
      const chatGptApiKey = ChatGPTService.getApiKey();
      if (chatGptApiKey && (isFileContentUsable || prompt.trim())) {
        try {
          console.log('Using ChatGPT to generate questions...');
          const chatGptQuestions = await ChatGPTService.generateQuestions(
            prompt,
            options.numberOfQuestions,
            options.difficulty,
            isFileContentUsable ? processedFileContent : undefined,
            setNumber,
            totalSets
          );
          
          questions = chatGptQuestions.map(q => ({
            id: this.generateId(),
            text: q.question,
            type: 'multiple-choice',
            options: q.options,
            correctAnswer: q.correctAnswer
          }));
          
          console.log(`Successfully generated ${questions.length} questions with ChatGPT`);
        } catch (error) {
          console.error('ChatGPT generation failed, falling back to enhanced generation:', error);
          questions = this.generateTemplateQuestions(
            prompt,
            options.numberOfQuestions,
            options.difficulty,
            undefined,
            setNumber,
            totalSets
          );
        }
      } else if (isFileContentUsable) {
        console.log('Using enhanced file-based generation (no ChatGPT API key)');
        questions = this.generateEnhancedQuestions(
          prompt,
          options.numberOfQuestions, 
          options.difficulty, 
          processedFileContent,
          setNumber, 
          totalSets
        );
      } else {
        console.log('Using template-based generation (no usable file content)');
        questions = this.generateTemplateQuestions(
          prompt, 
          options.numberOfQuestions, 
          options.difficulty, 
          undefined,
          setNumber, 
          totalSets
        );
      }
      
      if (questions.length < options.numberOfQuestions) {
        console.log(`Generated ${questions.length} questions, need ${options.numberOfQuestions}. Filling remaining slots.`);
        const additionalQuestions = this.generateTemplateQuestions(
          prompt,
          options.numberOfQuestions - questions.length,
          options.difficulty,
          undefined,
          setNumber,
          totalSets
        );
        questions.push(...additionalQuestions);
      }
      
      questions = questions.slice(0, options.numberOfQuestions);
      console.log(`Final question count: ${questions.length}`);
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
      totalSets
    };

    console.log(`Generated questionnaire with ${questions.length} questions:`, questionnaire);
    return questionnaire;
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
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

  private generateTemplateQuestions(
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
    
    let baseQuestionCount = numberOfQuestions;
    let fileBasedQuestions: Question[] = [];
    
    if (fileContent && fileContent.trim().length > 10) {
      fileBasedQuestions = this.generateFileBasedQuestions(fileContent, prompt, setNumber);
      baseQuestionCount = Math.max(numberOfQuestions - fileBasedQuestions.length, Math.floor(numberOfQuestions * 0.7));
    }
    
    const extendedQuestionPool = [
      ...baseQuestions,
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
    
    const shuffledQuestions = [...extendedQuestionPool].sort(() => Math.random() - 0.5);
    const setOffset = setNumber ? (setNumber - 1) * numberOfQuestions : 0;
    const totalQuestionsNeeded = totalSets ? totalSets * numberOfQuestions : numberOfQuestions;
    
    while (shuffledQuestions.length < totalQuestionsNeeded) {
      shuffledQuestions.push(...extendedQuestionPool);
    }
    
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

    questions.push(...fileBasedQuestions.slice(0, numberOfQuestions - questions.length));

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
        questions.push({
          id: this.generateId(),
          text: `How would you rate this aspect? (Set ${setNumber || 1}, Question ${questions.length + 1})`,
          type: 'radio',
          options: ['Poor', 'Fair', 'Good', 'Excellent']
        });
      }
    }

    return questions.slice(0, numberOfQuestions);
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
    
    if (setNumber && setNumber > 1) {
      const variations = [
        '', 
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

  private generateFileBasedQuestions(fileContent: string, prompt: string, setNumber?: number): Question[] {
    const questions: Question[] = [];
    
    const content = fileContent.toLowerCase();
    const setVariation = setNumber ? ` (Set ${setNumber})` : '';
    
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
    
    if (questions.length === 0) {
      questions.push({
        id: this.generateId(),
        text: `Based on the provided document content, how relevant is the information to your needs?${setVariation}`,
        type: 'radio',
        options: ['Not Relevant', 'Somewhat Relevant', 'Relevant', 'Very Relevant']
      });
    }
    
    return questions.slice(0, 3);
  }
}

export const QuestionnaireService = new QuestionnaireServiceClass();
