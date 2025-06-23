
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
    
    // Enhanced file content validation and processing
    if (fileContent && fileContent.trim().length > 0) {
      console.log('Processing file content for questionnaire generation...');
      fileContent = this.processFileContent(fileContent);
      console.log('Processed file content length:', fileContent.length);
    }
    
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
      if (chatGptApiKey && fileContent && fileContent.trim().length > 50) {
        try {
          console.log('Using ChatGPT to generate file-based questions...');
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
          
          console.log('Successfully generated file-based questions with ChatGPT');
        } catch (error) {
          console.error('ChatGPT generation failed, falling back to enhanced file-based generation:', error);
          // Fall back to enhanced file-based generation
          questions = this.generateEnhancedFileBasedQuestions(
            fileContent || '', 
            prompt,
            options.numberOfQuestions, 
            options.difficulty, 
            setNumber, 
            totalSets
          );
        }
      } else if (fileContent && fileContent.trim().length > 50) {
        console.log('Using enhanced file-based generation (no ChatGPT API key)');
        // Use enhanced file-based generation when we have substantial file content
        questions = this.generateEnhancedFileBasedQuestions(
          fileContent, 
          prompt,
          options.numberOfQuestions, 
          options.difficulty, 
          setNumber, 
          totalSets
        );
      } else {
        console.log('Using template-based generation (no file content)');
        // Use template-based generation when no file content is available
        questions = this.generateTemplateQuestions(
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

  private processFileContent(rawContent: string): string {
    // Clean and structure the file content for better question generation
    let processedContent = rawContent;
    
    // Remove excessive whitespace and normalize line breaks
    processedContent = processedContent.replace(/\s+/g, ' ').trim();
    processedContent = processedContent.replace(/\n\s*\n/g, '\n\n');
    
    // Extract key sections and topics
    const sections = this.extractSections(processedContent);
    
    // If we found structured sections, use them; otherwise use the original content
    if (sections.length > 0) {
      processedContent = sections.map(section => 
        `Section: ${section.title}\nContent: ${section.content}`
      ).join('\n\n');
    }
    
    return processedContent;
  }

  private extractSections(content: string): Array<{title: string, content: string}> {
    const sections = [];
    const lines = content.split('\n');
    
    let currentSection = null;
    let currentContent: string[] = [];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      
      // Check if this line could be a section header
      if (this.isSectionHeader(trimmedLine)) {
        // Save previous section if exists
        if (currentSection) {
          sections.push({
            title: currentSection,
            content: currentContent.join(' ').trim()
          });
        }
        
        // Start new section
        currentSection = trimmedLine.replace(/^#+\s*/, '').replace(/^\d+\.\s*/, '');
        currentContent = [];
      } else if (trimmedLine.length > 0) {
        // Add to current section content
        currentContent.push(trimmedLine);
      }
    }
    
    // Don't forget the last section
    if (currentSection && currentContent.length > 0) {
      sections.push({
        title: currentSection,
        content: currentContent.join(' ').trim()
      });
    }
    
    return sections.filter(section => section.content.length > 20); // Filter out very short sections
  }

  private isSectionHeader(line: string): boolean {
    // Check for various header patterns
    return (
      line.startsWith('#') || // Markdown headers
      !!line.match(/^[A-Z][^.]*:?$/) || // ALL CAPS or Title Case ending with optional colon
      !!line.match(/^\d+\./) || // Numbered sections
      !!line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]+)*$/) || // Title Case
      (line.length < 80 && line.length > 5 && !line.includes(',') && !line.includes(';'))
    );
  }

  private generateEnhancedFileBasedQuestions(
    fileContent: string,
    prompt: string,
    numberOfQuestions: number,
    difficulty: 'easy' | 'medium' | 'hard',
    setNumber?: number,
    totalSets?: number
  ): Question[] {
    console.log('Generating enhanced file-based questions...');
    
    const questions: Question[] = [];
    const sections = this.extractSections(fileContent);
    const keyTopics = this.extractKeyTopics(fileContent);
    
    console.log('Found sections:', sections.length);
    console.log('Key topics:', keyTopics);
    
    // Generate questions from different sections to ensure variety
    const sectionsToUse = sections.length > 0 ? sections : [{ title: 'Main Content', content: fileContent }];
    
    for (let i = 0; i < numberOfQuestions && i < sectionsToUse.length * 3; i++) {
      const sectionIndex = i % sectionsToUse.length;
      const section = sectionsToUse[sectionIndex];
      
      const question = this.generateQuestionFromSection(
        section,
        keyTopics,
        difficulty,
        i + 1,
        setNumber
      );
      
      if (question) {
        questions.push(question);
      }
    }
    
    // Fill remaining slots with topic-based questions if needed
    while (questions.length < numberOfQuestions && keyTopics.length > 0) {
      const topicIndex = questions.length % keyTopics.length;
      const topic = keyTopics[topicIndex];
      
      const question = this.generateTopicBasedQuestion(
        topic,
        fileContent,
        difficulty,
        questions.length + 1,
        setNumber
      );
      
      if (question) {
        questions.push(question);
      } else {
        break; // Avoid infinite loop
      }
    }
    
    console.log(`Generated ${questions.length} enhanced file-based questions`);
    return questions.slice(0, numberOfQuestions);
  }

  private extractKeyTopics(content: string): string[] {
    const words = content.toLowerCase().split(/\s+/);
    const wordCount: Record<string, number> = {};
    
    // Count word frequency, excluding common words
    const commonWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    words.forEach(word => {
      const cleanWord = word.replace(/[^\w]/g, '');
      if (cleanWord.length > 3 && !commonWords.has(cleanWord)) {
        wordCount[cleanWord] = (wordCount[cleanWord] || 0) + 1;
      }
    });
    
    // Get top 10 most frequent words as key topics
    return Object.entries(wordCount)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);
  }

  private generateQuestionFromSection(
    section: { title: string, content: string },
    keyTopics: string[],
    difficulty: 'easy' | 'medium' | 'hard',
    questionNumber: number,
    setNumber?: number
  ): Question | null {
    if (section.content.length < 20) return null;
    
    const sentences = section.content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    if (sentences.length === 0) return null;
    
    // Select a sentence that contains key information
    const informativeSentence = sentences.find(s => 
      keyTopics.some(topic => s.toLowerCase().includes(topic))
    ) || sentences[0];
    
    const questionTypes = this.getQuestionTypes(difficulty);
    const questionType = questionTypes[questionNumber % questionTypes.length];
    
    return this.createQuestionFromSentence(
      informativeSentence.trim(),
      section.title,
      questionType,
      questionNumber,
      setNumber
    );
  }

  private generateTopicBasedQuestion(
    topic: string,
    fileContent: string,
    difficulty: 'easy' | 'medium' | 'hard',
    questionNumber: number,
    setNumber?: number
  ): Question | null {
    // Find sentences containing the topic
    const sentences = fileContent.split(/[.!?]+/).filter(s => 
      s.toLowerCase().includes(topic) && s.trim().length > 15
    );
    
    if (sentences.length === 0) return null;
    
    const sentence = sentences[0].trim();
    const questionTypes = this.getQuestionTypes(difficulty);
    const questionType = questionTypes[questionNumber % questionTypes.length];
    
    return this.createQuestionFromSentence(
      sentence,
      `Topic: ${topic}`,
      questionType,
      questionNumber,
      setNumber
    );
  }

  private getQuestionTypes(difficulty: 'easy' | 'medium' | 'hard'): string[] {
    switch (difficulty) {
      case 'easy':
        return ['definition', 'identification', 'simple_fact'];
      case 'medium':
        return ['explanation', 'comparison', 'application'];
      case 'hard':
        return ['analysis', 'evaluation', 'synthesis'];
      default:
        return ['explanation', 'application'];
    }
  }

  private createQuestionFromSentence(
    sentence: string,
    context: string,
    questionType: string,
    questionNumber: number,
    setNumber?: number
  ): Question {
    const setVariation = setNumber ? ` (Set ${setNumber})` : '';
    
    // Generate question based on type and sentence content
    let questionText = '';
    let options: string[] = [];
    let correctAnswer = 0;
    
    switch (questionType) {
      case 'definition':
        questionText = `Based on the content, what is the main concept discussed in: "${sentence.substring(0, 50)}..."?${setVariation}`;
        options = [
          this.extractKeyConceptFromSentence(sentence),
          'A different unrelated concept',
          'A general business term',
          'An external reference'
        ];
        break;
        
      case 'identification':
        questionText = `According to the document, which statement is most accurate regarding the content?${setVariation}`;
        options = [
          sentence.substring(0, 60) + '...',
          'This is not mentioned in the document',
          'The opposite of what is stated',
          'An assumption not supported by the text'
        ];
        break;
        
      case 'explanation':
        questionText = `From the provided material, what can be concluded about ${context.toLowerCase()}?${setVariation}`;
        options = [
          this.generateCorrectConclusion(sentence),
          'Something not mentioned in the document',
          'The opposite conclusion',
          'An unrelated conclusion'
        ];
        break;
        
      case 'application':
        questionText = `Based on the information provided, how would you apply the concepts discussed?${setVariation}`;
        options = [
          this.generateCorrectApplication(sentence),
          'Apply unrelated concepts',
          'Ignore the provided information',
          'Use external assumptions'
        ];
        break;
        
      default:
        questionText = `According to the document content, what is stated about this topic?${setVariation}`;
        options = [
          sentence.substring(0, 50) + '...',
          'Information not in the document',
          'Contradictory information',
          'External assumptions'
        ];
    }
    
    return {
      id: this.generateId(),
      text: questionText,
      type: 'multiple-choice',
      options,
      correctAnswer
    };
  }

  private extractKeyConceptFromSentence(sentence: string): string {
    // Extract the main concept from the sentence
    const words = sentence.split(' ');
    const importantWords = words.filter(word => 
      word.length > 4 && 
      !['that', 'this', 'with', 'from', 'they', 'them', 'were', 'been', 'have'].includes(word.toLowerCase())
    );
    
    return importantWords.slice(0, 3).join(' ') || sentence.substring(0, 30);
  }

  private generateCorrectConclusion(sentence: string): string {
    // Generate a conclusion based on the sentence content
    if (sentence.includes('important') || sentence.includes('significant')) {
      return 'It is an important aspect mentioned in the document';
    }
    if (sentence.includes('process') || sentence.includes('method')) {
      return 'It describes a process outlined in the material';
    }
    if (sentence.includes('result') || sentence.includes('outcome')) {
      return 'It represents an outcome discussed in the content';
    }
    
    return 'It is directly supported by the provided information';
  }

  private generateCorrectApplication(sentence: string): string {
    // Generate an application based on the sentence content
    if (sentence.includes('should') || sentence.includes('must')) {
      return 'Follow the guidelines as specified in the document';
    }
    if (sentence.includes('best') || sentence.includes('effective')) {
      return 'Implement the best practices mentioned';
    }
    if (sentence.includes('avoid') || sentence.includes('prevent')) {
      return 'Avoid the issues highlighted in the material';
    }
    
    return 'Apply the principles discussed in the content';
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
