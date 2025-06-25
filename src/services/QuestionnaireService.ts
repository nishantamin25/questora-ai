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
    console.log('🔍 CRITICAL: QuestionnaireService generation with MANDATORY file content:', {
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
    
    try {
      let questionnaire: Questionnaire = {
        id: testId,
        title: `${options.testName}${totalSets > 1 ? ` - Set ${setNumber}` : ''}`,
        description: `This questionnaire was generated based on: "${prompt}"${fileContent ? ' Questions are based strictly on the uploaded file content.' : ''}${totalSets > 1 ? ` This is set ${setNumber} of ${totalSets} with unique questions.` : ''}`,
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
      console.log('✅ TEMP SAVED: Questionnaire temporarily saved to prevent loss');

      // CRITICAL FIX: ABSOLUTELY REQUIRE FILE CONTENT FOR QUESTIONS
      if (options.includeQuestionnaire) {
        console.log('🔍 ENFORCING mandatory file content for question generation...');
        
        // CRITICAL: Block question generation without substantial file content
        if (!fileContent || fileContent.length < 300) {
          console.error('❌ BLOCKED: Question generation requires substantial file content');
          throw new Error('Question generation requires substantial file content (minimum 300 characters). Please upload files with readable text content to generate accurate questions based on the document.');
        }

        console.log('✅ PROCEEDING: File content validated for strict question generation');
        
        try {
          // CRITICAL: Direct ChatGPT call with strict file content validation
          const chatGPTQuestions = await ChatGPTService.generateQuestions(
            prompt,
            options.numberOfQuestions,
            options.difficulty,
            fileContent,
            setNumber,
            totalSets
          );

          console.log('✅ Questions generated successfully from file content:', chatGPTQuestions.length);

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
            console.log(`🌐 Translating questions to ${currentLanguage}...`);
            try {
              formattedQuestions = await LanguageService.translateQuestions(formattedQuestions, currentLanguage);
              console.log('✅ Questions translated successfully');
            } catch (error) {
              console.error('⚠️ Translation failed, continuing with English:', error);
            }
          }

          questionnaire.questions = formattedQuestions;
          this.saveTempQuestionnaire(questionnaire);
          console.log('✅ TEMP UPDATED: File-based questions added to temp storage');
          
        } catch (error) {
          console.error('❌ Error generating questions from file content:', error);
          throw error; // Re-throw to prevent fallback to fabricated content
        }
      }

      // Generate course if requested
      if (options.includeCourse) {
        console.log('🔍 ENFORCING file content requirement for course generation...');
        
        if (!fileContent || fileContent.length < 200) {
          console.error('❌ BLOCKED: Course generation requires substantial file content');
          throw new Error('Course generation requires substantial file content (minimum 200 characters). Please upload files with sufficient readable text content.');
        }

        try {
          let course = await CourseService.generateCourse(prompt, [], fileContent);
          
          // Translate course if needed
          if (currentLanguage !== 'en' && course) {
            try {
              console.log(`🌐 Translating course content to ${currentLanguage}...`);
              
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
              
              console.log('✅ Course content translated successfully');
            } catch (error) {
              console.error('⚠️ Course translation failed, continuing with English:', error);
            }
          }
          
          questionnaire.course = course;
          this.saveTempQuestionnaire(questionnaire);
          console.log('✅ TEMP FINAL: Complete questionnaire saved to temp storage');
          
        } catch (error) {
          console.error('❌ Error generating course:', error);
          throw new Error(`Failed to generate course: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Translate questionnaire metadata if needed
      if (currentLanguage !== 'en') {
        try {
          questionnaire.title = await LanguageService.translateContent(questionnaire.title, currentLanguage);
          questionnaire.description = await LanguageService.translateContent(questionnaire.description, currentLanguage);
        } catch (error) {
          console.error('⚠️ Questionnaire metadata translation failed:', error);
        }
      }

      this.saveTempQuestionnaire(questionnaire);
      this.autoSaveQuestionnaire(questionnaire);

      console.log('✅ QUESTIONNAIRE GENERATION SUCCESS:', {
        id: questionnaire.id,
        questionsCount: questionnaire.questions.length,
        hasCourse: !!questionnaire.course,
        setNumber: questionnaire.setNumber,
        totalSets: questionnaire.totalSets,
        language: currentLanguage,
        isAutoSaved: true,
        isFileContentBased: fileContent.length > 0
      });

      return questionnaire;
    } catch (error) {
      console.error('❌ CRITICAL QUESTIONNAIRE GENERATION FAILURE:', error);
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
