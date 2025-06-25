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
  private readonly TEMP_STORAGE_KEY = 'temp_questionnaire';

  async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<Questionnaire> {
    console.log('🔍 STRICT QUESTIONNAIRE GENERATION: File content required:', {
      prompt,
      options,
      requestedQuestions: options.numberOfQuestions,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets
    });

    const questionnaireId = this.generateId();
    const testId = `${questionnaireId}-set${setNumber}`;
    const currentLanguage = LanguageService.getCurrentLanguage();
    
    try {
      let questionnaire: Questionnaire = {
        id: testId,
        title: `${options.testName}${totalSets > 1 ? ` - Set ${setNumber}` : ''}`,
        description: `Generated from: "${prompt}"${fileContent ? ' - Questions based strictly on uploaded file content.' : ''}${totalSets > 1 ? ` Set ${setNumber} of ${totalSets} with unique questions.` : ''}`,
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

      this.saveTempQuestionnaire(questionnaire);
      console.log('✅ TEMP SAVED: Questionnaire saved to prevent loss');

      // ABSOLUTE REQUIREMENT: File content for questions
      if (options.includeQuestionnaire) {
        console.log('🔍 ENFORCING: Strict file content requirement for questions...');
        
        if (!fileContent || fileContent.length < 300) {
          console.error('❌ BLOCKED: Insufficient file content for questions');
          throw new Error(`Question generation requires substantial file content (minimum 300 characters). Current content: ${fileContent?.length || 0} characters. Upload files with readable text to generate accurate questions.`);
        }

        console.log('✅ PROCEEDING: File content validated for strict question generation');
        
        try {
          // STRICT: Generate exact number of questions from file content
          const chatGPTQuestions = await ChatGPTService.generateQuestions(
            prompt,
            options.numberOfQuestions, // CRITICAL: Pass exact requested count
            options.difficulty,
            fileContent,
            setNumber,
            totalSets
          );

          console.log(`✅ GENERATED: ${chatGPTQuestions.length} questions from file content (requested: ${options.numberOfQuestions})`);

          // VALIDATION: Ensure exact question count
          if (chatGPTQuestions.length !== options.numberOfQuestions) {
            console.error(`❌ QUESTION COUNT MISMATCH: Generated ${chatGPTQuestions.length}, requested ${options.numberOfQuestions}`);
            throw new Error(`Generated ${chatGPTQuestions.length} questions, but ${options.numberOfQuestions} were requested. The file content may not support the requested number of questions.`);
          }

          let formattedQuestions: Question[] = chatGPTQuestions.map((q, index) => ({
            id: this.generateId(),
            text: q.question,
            type: 'multiple-choice' as const,
            options: q.options,
            correctAnswer: q.correctAnswer,
            explanation: q.explanation
          }));

          // Translate if needed
          if (currentLanguage !== 'en') {
            console.log(`🌐 Translating ${formattedQuestions.length} questions to ${currentLanguage}...`);
            try {
              formattedQuestions = await LanguageService.translateQuestions(formattedQuestions, currentLanguage);
              console.log('✅ Questions translated successfully');
            } catch (error) {
              console.error('⚠️ Translation failed, continuing with English:', error);
            }
          }

          questionnaire.questions = formattedQuestions;
          this.saveTempQuestionnaire(questionnaire);
          console.log(`✅ TEMP UPDATED: ${formattedQuestions.length} file-based questions added`);
          
        } catch (error) {
          console.error('❌ Question generation failed:', error);
          throw error; // Block fallback to prevent fabrication
        }
      }

      // Generate course if requested
      if (options.includeCourse) {
        console.log('🔍 ENFORCING: File content requirement for course...');
        
        if (!fileContent || fileContent.length < 200) {
          console.error('❌ BLOCKED: Insufficient file content for course');
          throw new Error(`Course generation requires substantial file content (minimum 200 characters). Current content: ${fileContent?.length || 0} characters.`);
        }

        try {
          let course = await CourseService.generateCourse(prompt, [], fileContent);
          
          // Translate course if needed
          if (currentLanguage !== 'en' && course) {
            try {
              console.log(`🌐 Translating course to ${currentLanguage}...`);
              
              if (course.name) {
                course.name = await LanguageService.translateContent(course.name, currentLanguage);
              }
              if (course.description) {
                course.description = await LanguageService.translateContent(course.description, currentLanguage);
              }
              
              if (course.materials && Array.isArray(course.materials)) {
                course.materials = await Promise.all(
                  course.materials.map(async (material: any) => ({
                    ...material,
                    title: material.title ? await LanguageService.translateContent(material.title, currentLanguage) : material.title,
                    content: material.content ? await LanguageService.translateContent(material.content, currentLanguage) : material.content
                  }))
                );
              }
              
              console.log('✅ Course translated successfully');
            } catch (error) {
              console.error('⚠️ Course translation failed:', error);
            }
          }
          
          questionnaire.course = course;
          this.saveTempQuestionnaire(questionnaire);
          console.log('✅ TEMP FINAL: Course added to questionnaire');
          
        } catch (error) {
          console.error('❌ Course generation failed:', error);
          throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Translate questionnaire metadata if needed
      if (currentLanguage !== 'en') {
        try {
          questionnaire.title = await LanguageService.translateContent(questionnaire.title, currentLanguage);
          questionnaire.description = await LanguageService.translateContent(questionnaire.description, currentLanguage);
        } catch (error) {
          console.error('⚠️ Metadata translation failed:', error);
        }
      }

      this.saveTempQuestionnaire(questionnaire);
      this.autoSaveQuestionnaire(questionnaire);

      console.log('✅ STRICT QUESTIONNAIRE SUCCESS:', {
        id: questionnaire.id,
        questionsGenerated: questionnaire.questions.length,
        questionsRequested: options.numberOfQuestions,
        exactMatch: questionnaire.questions.length === options.numberOfQuestions,
        hasCourse: !!questionnaire.course,
        setNumber: questionnaire.setNumber,
        totalSets: questionnaire.totalSets,
        language: currentLanguage,
        isFileContentBased: fileContent.length > 0
      });

      return questionnaire;
    } catch (error) {
      console.error('❌ QUESTIONNAIRE GENERATION FAILURE:', error);
      throw error;
    }
  }

  private saveTempQuestionnaire(questionnaire: Questionnaire): void {
    try {
      localStorage.setItem(this.TEMP_STORAGE_KEY, JSON.stringify(questionnaire));
      console.log('✅ Questionnaire saved to temp storage:', questionnaire.id);
    } catch (error) {
      console.error('❌ Failed to save to temp storage:', error);
    }
  }

  public autoSaveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      console.log('🔄 Auto-saving questionnaire:', questionnaire.id);
      
      questionnaire.isSaved = true;
      
      const questionnaires = this.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== questionnaire.id);
      filteredQuestionnaires.push(questionnaire);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      console.log('✅ Questionnaire auto-saved successfully:', questionnaire.id);
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }

  getTempQuestionnaire(): Questionnaire | null {
    try {
      const stored = localStorage.getItem(this.TEMP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Failed to recover temp questionnaire:', error);
      return null;
    }
  }

  clearTempQuestionnaire(): void {
    try {
      localStorage.removeItem(this.TEMP_STORAGE_KEY);
      console.log('✅ Temp questionnaire cleared');
    } catch (error) {
      console.error('❌ Failed to clear temp questionnaire:', error);
    }
  }

  saveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      console.log('💾 Saving questionnaire:', questionnaire.id);
      
      questionnaire.isSaved = true;
      
      const questionnaires = this.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== questionnaire.id);
      filteredQuestionnaires.push(questionnaire);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      if (questionnaire.isActive) {
        const activeQuestionnaires = this.getActiveQuestionnaires();
        const filteredActive = activeQuestionnaires.filter(q => q.id !== questionnaire.id);
        filteredActive.push(questionnaire);
        localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      }
      
      this.clearTempQuestionnaire();
      
      console.log('✅ Questionnaire saved successfully:', questionnaire.id);
    } catch (error) {
      console.error('❌ Error saving questionnaire:', error);
      throw new Error('Failed to save questionnaire');
    }
  }

  getAllQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const questionnaires = stored ? JSON.parse(stored) : [];
      return Array.isArray(questionnaires) ? questionnaires : [];
    } catch (error) {
      console.error('❌ Error loading questionnaires:', error);
      return [];
    }
  }

  getActiveQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem(this.ACTIVE_STORAGE_KEY);
      const questionnaires = stored ? JSON.parse(stored) : [];
      return Array.isArray(questionnaires) ? questionnaires : [];
    } catch (error) {
      console.error('❌ Error loading active questionnaires:', error);
      return [];
    }
  }

  getQuestionnaireById(id: string): Questionnaire | null {
    const questionnaires = this.getAllQuestionnaires();
    return questionnaires.find(q => q.id === id) || null;
  }

  deleteQuestionnaire(id: string): void {
    try {
      console.log('🗑️ Deleting questionnaire:', id);
      
      const questionnaires = this.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      const activeQuestionnaires = this.getActiveQuestionnaires();
      const filteredActive = activeQuestionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      
      console.log('✅ Questionnaire deleted successfully:', id);
    } catch (error) {
      console.error('❌ Error deleting questionnaire:', error);
      throw new Error('Failed to delete questionnaire');
    }
  }

  activateQuestionnaire(id: string): void {
    try {
      console.log('🔄 Activating questionnaire:', id);
      
      const questionnaire = this.getQuestionnaireById(id);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }
      
      questionnaire.isActive = true;
      this.saveQuestionnaire(questionnaire);
      
      console.log('✅ Questionnaire activated successfully:', id);
    } catch (error) {
      console.error('❌ Error activating questionnaire:', error);
      throw new Error('Failed to activate questionnaire');
    }
  }

  deactivateQuestionnaire(id: string): void {
    try {
      console.log('🔄 Deactivating questionnaire:', id);
      
      const questionnaire = this.getQuestionnaireById(id);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }
      
      questionnaire.isActive = false;
      this.saveQuestionnaire(questionnaire);
      
      const activeQuestionnaires = this.getActiveQuestionnaires();
      const filteredActive = activeQuestionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      
      console.log('✅ Questionnaire deactivated successfully:', id);
    } catch (error) {
      console.error('❌ Error deactivating questionnaire:', error);
      throw new Error('Failed to deactivate questionnaire');
    }
  }

  private generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }
}

export const QuestionnaireService = new QuestionnaireServiceClass();
