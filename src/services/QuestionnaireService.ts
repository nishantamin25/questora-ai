
import { ChatGPTService } from './ChatGPTService';
import { CourseService } from './CourseService';
import { LanguageService } from './LanguageService';

interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'boolean';
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

interface TestOptions {
  testName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  timeframe: number;
  includeCourse: boolean;
  includeQuestionnaire: boolean;
}

interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive: boolean;
  testName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isSaved: boolean;
  timeframe: number;
  setNumber?: number;
  totalSets?: number;
  course?: any;
}

class QuestionnaireServiceClass {
  private readonly STORAGE_KEY = 'questionnaires';
  private readonly ACTIVE_STORAGE_KEY = 'active_questionnaires';

  async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<Questionnaire> {
    console.log('QuestionnaireService.generateQuestionnaire called with:', {
      prompt,
      options,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets
    });

    const questionnaireId = this.generateId();
    const testId = `${questionnaireId}-set${setNumber}`;
    const currentLanguage = LanguageService.getCurrentLanguage();
    
    console.log(`Current interface language: ${currentLanguage}`);
    
    try {
      let questionnaire: Questionnaire = {
        id: testId,
        title: `${options.testName}${totalSets > 1 ? ` - Set ${setNumber}` : ''}`,
        description: `This questionnaire was generated based on: "${prompt}"${fileContent ? ' Additional context was provided from uploaded file content.' : ''}${totalSets > 1 ? ` This is set ${setNumber} of ${totalSets} with unique questions.` : ''}`,
        questions: [],
        createdAt: new Date().toISOString(),
        isActive: false,
        testName: options.testName,
        difficulty: options.difficulty,
        isSaved: false,
        timeframe: options.timeframe,
        setNumber,
        totalSets
      };

      // Generate questionnaire if requested
      if (options.includeQuestionnaire) {
        console.log('Generating questions via ChatGPT...');
        
        try {
          // Always generate in English first for consistency
          const chatGPTQuestions = await ChatGPTService.generateQuestions(
            prompt,
            options.numberOfQuestions,
            options.difficulty,
            fileContent,
            setNumber,
            totalSets
          );

          console.log('ChatGPT returned questions:', chatGPTQuestions.length);

          // Convert ChatGPT questions to our format
          let formattedQuestions: Question[] = chatGPTQuestions.map((q, index) => ({
            id: this.generateId(),
            text: q.question,
            type: 'multiple-choice' as const,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }));

          // If current language is not English, translate questions immediately
          if (currentLanguage !== 'en') {
            console.log(`Interface language is ${currentLanguage}, translating questions immediately...`);
            try {
              formattedQuestions = await LanguageService.translateQuestions(formattedQuestions, currentLanguage);
              console.log('Questions translated successfully to', currentLanguage);
            } catch (error) {
              console.error('Error translating questions:', error);
              // Continue with English questions if translation fails
              console.warn('Continuing with English questions due to translation failure');
            }
          }

          questionnaire.questions = formattedQuestions;
          console.log('Formatted questions for questionnaire:', formattedQuestions.length);
        } catch (error) {
          console.error('Error generating questions:', error);
          throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Translate title and description if not in English
      if (currentLanguage !== 'en') {
        console.log(`Translating questionnaire metadata to ${currentLanguage}...`);
        try {
          questionnaire.title = await LanguageService.translateContent(questionnaire.title, currentLanguage);
          questionnaire.description = await LanguageService.translateContent(questionnaire.description, currentLanguage);
          console.log('Questionnaire metadata translated successfully');
        } catch (error) {
          console.error('Error translating questionnaire metadata:', error);
          // Continue with English metadata if translation fails
        }
      }

      // Generate course if requested and file content is available
      if (options.includeCourse) {
        console.log('Generating course content...');
        
        if (!fileContent || fileContent.trim().length < 50) {
          console.warn('Course generation requested but insufficient file content available');
          throw new Error('Course generation requires uploaded files with content. Please upload files and ensure they are processed before generating a course.');
        }

        try {
          // For course generation, we pass the file content directly
          let course = await CourseService.generateCourse(prompt, [], fileContent);
          
          // Translate course content if not in English
          if (currentLanguage !== 'en' && course) {
            try {
              console.log(`Translating course content to ${currentLanguage}...`);
              
              // Translate course name and description (using correct property names)
              if (course.name) {
                course.name = await LanguageService.translateContent(course.name, currentLanguage);
              }
              if (course.description) {
                course.description = await LanguageService.translateContent(course.description, currentLanguage);
              }
              
              // Translate course materials
              if (course.materials && Array.isArray(course.materials)) {
                course.materials = await Promise.all(
                  course.materials.map(async (material: any) => ({
                    ...material,
                    title: material.title ? await LanguageService.translateContent(material.title, currentLanguage) : material.title,
                    content: material.content ? await LanguageService.translateContent(material.content, currentLanguage) : material.content
                  }))
                );
              }
              
              console.log('Course content translated successfully');
            } catch (error) {
              console.error('Error translating course content:', error);
              // Continue with English course content if translation fails
            }
          }
          
          questionnaire.course = course;
          console.log('Course generated successfully:', course.id);
        } catch (error) {
          console.error('Error generating course:', error);
          throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log('Questionnaire generation completed successfully:', {
        id: questionnaire.id,
        questionsCount: questionnaire.questions.length,
        hasCourse: !!questionnaire.course,
        setNumber: questionnaire.setNumber,
        totalSets: questionnaire.totalSets,
        language: currentLanguage,
        questionsInLanguage: currentLanguage !== 'en' ? 'Translated' : 'English'
      });

      return questionnaire;
    } catch (error) {
      console.error('Error in generateQuestionnaire:', error);
      throw error;
    }
  }

  saveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      console.log('Saving questionnaire:', questionnaire.id);
      
      // Mark as saved
      questionnaire.isSaved = true;
      
      // Save to main storage
      const questionnaires = this.getAllQuestionnaires();
      
      // Remove existing questionnaire with same ID if it exists
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== questionnaire.id);
      filteredQuestionnaires.push(questionnaire);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      // Also save to active storage for guest access
      if (questionnaire.isActive) {
        const activeQuestionnaires = this.getActiveQuestionnaires();
        const filteredActive = activeQuestionnaires.filter(q => q.id !== questionnaire.id);
        filteredActive.push(questionnaire);
        localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      }
      
      console.log('Questionnaire saved successfully:', questionnaire.id);
    } catch (error) {
      console.error('Error saving questionnaire:', error);
      throw new Error('Failed to save questionnaire');
    }
  }

  getAllQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const questionnaires = stored ? JSON.parse(stored) : [];
      return Array.isArray(questionnaires) ? questionnaires : [];
    } catch (error) {
      console.error('Error loading questionnaires:', error);
      return [];
    }
  }

  getActiveQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem(this.ACTIVE_STORAGE_KEY);
      const questionnaires = stored ? JSON.parse(stored) : [];
      return Array.isArray(questionnaires) ? questionnaires : [];
    } catch (error) {
      console.error('Error loading active questionnaires:', error);
      return [];
    }
  }

  getQuestionnaireById(id: string): Questionnaire | null {
    const questionnaires = this.getAllQuestionnaires();
    return questionnaires.find(q => q.id === id) || null;
  }

  deleteQuestionnaire(id: string): void {
    try {
      console.log('Deleting questionnaire:', id);
      
      // Remove from main storage
      const questionnaires = this.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      // Remove from active storage
      const activeQuestionnaires = this.getActiveQuestionnaires();
      const filteredActive = activeQuestionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      
      console.log('Questionnaire deleted successfully:', id);
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
      throw new Error('Failed to delete questionnaire');
    }
  }

  activateQuestionnaire(id: string): void {
    try {
      console.log('Activating questionnaire:', id);
      
      const questionnaire = this.getQuestionnaireById(id);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }
      
      // Mark as active
      questionnaire.isActive = true;
      
      // Save to main storage
      this.saveQuestionnaire(questionnaire);
      
      console.log('Questionnaire activated successfully:', id);
    } catch (error) {
      console.error('Error activating questionnaire:', error);
      throw new Error('Failed to activate questionnaire');
    }
  }

  deactivateQuestionnaire(id: string): void {
    try {
      console.log('Deactivating questionnaire:', id);
      
      const questionnaire = this.getQuestionnaireById(id);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }
      
      // Mark as inactive
      questionnaire.isActive = false;
      
      // Save to main storage
      this.saveQuestionnaire(questionnaire);
      
      // Remove from active storage
      const activeQuestionnaires = this.getActiveQuestionnaires();
      const filteredActive = activeQuestionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      
      console.log('Questionnaire deactivated successfully:', id);
    } catch (error) {
      console.error('Error deactivating questionnaire:', error);
      throw new Error('Failed to deactivate questionnaire');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }
}

export const QuestionnaireService = new QuestionnaireServiceClass();
