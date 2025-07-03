import { ChatGPTService } from '../ChatGPTService';
import { QuestionnaireStorage } from './QuestionnaireStorage';
import { LanguageService } from '../LanguageService';
import { Questionnaire, Question, TestOptions } from './QuestionnaireTypes';

export class QuestionnaireGenerator {
  static async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<Questionnaire> {
    console.log('🎯 Starting questionnaire generation with options:', {
      prompt: prompt.substring(0, 100),
      options,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets,
      currentLanguage: LanguageService.getCurrentLanguage()
    });

    // Generate proper UUID for questionnaire
    const questionnaireId = this.generateUUID();
    const currentLanguage = LanguageService.getCurrentLanguage();
    
    try {
      let questionnaire: Questionnaire;

      if (fileContent && fileContent.trim() !== '') {
        console.log('📄 Processing file content for questionnaire generation');
        
        // Generate questions from file content
        const questions = await this.generateQuestionsFromFile(fileContent, options);
        
        // Generate course content if requested
        let courseContent = null;
        if (options.includeCourse) {
          courseContent = await this.generateCourseContent(fileContent, options);
        }

        questionnaire = {
          id: questionnaireId,
          title: options.testName || 'Generated Test',
          description: `Test generated from uploaded content (Set ${setNumber}/${totalSets})`,
          testName: options.testName,
          difficulty: options.difficulty,
          timeframe: options.timeframe,
          questions: questions,
          createdAt: new Date().toISOString(),
          isActive: false,
          isSaved: false,
          setNumber: setNumber,
          totalSets: totalSets,
          courseContent: courseContent,
          language: currentLanguage
        };
      } else {
        console.log('💭 Generating questionnaire from text prompt');
        
        // Generate from text prompt
        const questions = await this.generateQuestionsFromPrompt(prompt, options);
        
        // Generate course content if requested
        let courseContent = null;
        if (options.includeCourse) {
          courseContent = await this.generateCourseFromPrompt(prompt, options);
        }

        questionnaire = {
          id: questionnaireId,
          title: options.testName || 'Generated Test',
          description: `Test generated from prompt (Set ${setNumber}/${totalSets})`,
          testName: options.testName,
          difficulty: options.difficulty,
          timeframe: options.timeframe,
          questions: questions,
          createdAt: new Date().toISOString(),
          isActive: false,
          isSaved: false,
          setNumber: setNumber,
          totalSets: totalSets,
          courseContent: courseContent,
          language: currentLanguage
        };
      }

      console.log('✅ Questionnaire generated successfully:', {
        id: questionnaire.id,
        title: questionnaire.title,
        questionsCount: questionnaire.questions.length,
        hasCourse: !!questionnaire.courseContent,
        setNumber: questionnaire.setNumber,
        totalSets: questionnaire.totalSets
      });

      return questionnaire;
    } catch (error) {
      console.error('❌ Error generating questionnaire:', error);
      throw new Error(`Failed to generate questionnaire: ${error.message}`);
    }
  }

  private static async generateQuestionsFromFile(fileContent: string, options: TestOptions): Promise<Question[]> {
    try {
      const systemPrompt = `You are an expert test creator. Create ${options.numberOfQuestions} ${options.difficulty} multiple-choice questions based on the provided content. 
      
      Requirements:
      - Each question should have exactly 4 options
      - Questions should test understanding of the key concepts
      - Difficulty level: ${options.difficulty}
      - Return JSON format with array of questions
      - Each question object should have: question, options (array of 4 strings), correctAnswer (0-3 index)
      
      JSON format:
      [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]`;

      const userPrompt = `Content to create questions from:\n\n${fileContent}`;

      const response = await ChatGPTService.generateContent(
        systemPrompt,
        userPrompt,
        'gpt-4o-mini'
      );

      const chatGPTQuestions = JSON.parse(response);

      if (!Array.isArray(chatGPTQuestions)) {
        throw new Error('Invalid response format from ChatGPT');
      }

      let formattedQuestions: Question[] = chatGPTQuestions.map((q, index) => ({
        id: this.generateUUID(),
        text: q.question,
        type: 'multiple-choice' as const,
        options: q.options,
        correctAnswer: q.correctAnswer,
        adminSelectedAnswer: q.correctAnswer
      }));

      console.log('✅ Questions generated from file:', formattedQuestions.length);
      return formattedQuestions;
    } catch (error) {
      console.error('❌ Error generating questions from file:', error);
      throw new Error(`Failed to generate questions from file: ${error.message}`);
    }
  }

  private static async generateQuestionsFromPrompt(prompt: string, options: TestOptions): Promise<Question[]> {
    try {
      const systemPrompt = `You are an expert test creator. Create ${options.numberOfQuestions} ${options.difficulty} multiple-choice questions about the given topic.
      
      Requirements:
      - Each question should have exactly 4 options
      - Questions should be relevant to the topic
      - Difficulty level: ${options.difficulty}
      - Return JSON format with array of questions
      - Each question object should have: question, options (array of 4 strings), correctAnswer (0-3 index)
      
      JSON format:
      [
        {
          "question": "Question text here?",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctAnswer": 0
        }
      ]`;

      const response = await ChatGPTService.generateContent(
        systemPrompt,
        prompt,
        'gpt-4o-mini'
      );

      const chatGPTQuestions = JSON.parse(response);

      if (!Array.isArray(chatGPTQuestions)) {
        throw new Error('Invalid response format from ChatGPT');
      }

      let formattedQuestions: Question[] = chatGPTQuestions.map((q, index) => ({
        id: this.generateUUID(),
        text: q.question,
        type: 'multiple-choice' as const,
        options: q.options,
        correctAnswer: q.correctAnswer,
        adminSelectedAnswer: q.correctAnswer
      }));

      console.log('✅ Questions generated from prompt:', formattedQuestions.length);
      return formattedQuestions;
    } catch (error) {
      console.error('❌ Error generating questions from prompt:', error);
      throw new Error(`Failed to generate questions from prompt: ${error.message}`);
    }
  }

  private static async generateCourseContent(fileContent: string, options: TestOptions): Promise<any> {
    try {
      const systemPrompt = `You are an expert course creator. Create a comprehensive course based on the provided content.
      
      Requirements:
      - Create a structured course with title, description, and modules
      - Each module should have a title and detailed content
      - Course should align with ${options.difficulty} difficulty level
      - Return JSON format
      
      JSON format:
      {
        "title": "Course title",
        "description": "Course description",
        "modules": [
          {
            "title": "Module title",
            "content": "Detailed module content",
            "type": "text"
          }
        ]
      }`;

      const userPrompt = `Content to create course from:\n\n${fileContent}`;

      const response = await ChatGPTService.generateContent(
        systemPrompt,
        userPrompt,
        'gpt-4o-mini'
      );

      const courseContent = JSON.parse(response);
      console.log('✅ Course content generated from file');
      return courseContent;
    } catch (error) {
      console.error('❌ Error generating course content:', error);
      return null;
    }
  }

  private static async generateCourseFromPrompt(prompt: string, options: TestOptions): Promise<any> {
    try {
      const systemPrompt = `You are an expert course creator. Create a comprehensive course about the given topic.
      
      Requirements:
      - Create a structured course with title, description, and modules
      - Each module should have a title and detailed content
      - Course should align with ${options.difficulty} difficulty level
      - Return JSON format
      
      JSON format:
      {
        "title": "Course title",
        "description": "Course description", 
        "modules": [
          {
            "title": "Module title",
            "content": "Detailed module content",
            "type": "text"
          }
        ]
      }`;

      const response = await ChatGPTService.generateContent(
        systemPrompt,
        prompt,
        'gpt-4o-mini'
      );

      const courseContent = JSON.parse(response);
      console.log('✅ Course content generated from prompt');
      return courseContent;
    } catch (error) {
      console.error('❌ Error generating course from prompt:', error);
      return null;
    }
  }

  static autoSaveQuestionnaire(questionnaire: Questionnaire): void {
    QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
  }

  private static generateUUID(): string {
    return crypto.randomUUID();
  }
}
