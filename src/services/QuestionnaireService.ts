import { ChatGPTService } from './ChatGPTService';
import { CourseService } from './CourseService';
import { EnhancedFileProcessor } from './EnhancedFileProcessor';
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
  courseId?: string;
  requiresCourseCompletion?: boolean;
}

class QuestionnaireServiceClass {
  private readonly STORAGE_KEY = 'questionnaires';
  private readonly ACTIVE_STORAGE_KEY = 'active_questionnaires';

  async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    files: File[] = [],
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<{ questionnaire: Questionnaire; course?: any }> {
    console.log('🚀 Enhanced questionnaire generation started:', {
      prompt,
      options,
      fileCount: files.length,
      fileNames: files.map(f => f.name),
      setNumber,
      totalSets
    });

    const questionnaireId = this.generateId();
    const testId = `${questionnaireId}-set${setNumber}`;
    const currentLanguage = LanguageService.getCurrentLanguage();
    
    let extractedFileContent = '';
    let generatedCourse = null;

    try {
      // STEP 1: Process files with enhanced processor
      if (files && files.length > 0) {
        console.log('📁 Processing uploaded files...');
        
        for (const file of files) {
          try {
            console.log(`🔄 Processing: ${file.name}`);
            const processedFile = await EnhancedFileProcessor.processFileWithFallback(file);
            
            extractedFileContent += `\n\n=== Content from ${file.name} ===\n${processedFile.content}`;
            
            console.log(`✅ File processed:`, {
              file: file.name,
              contentLength: processedFile.content.length,
              method: processedFile.metadata.extractionMethod
            });
          } catch (error) {
            console.error(`❌ Error processing ${file.name}:`, error);
            extractedFileContent += `\n\n=== ${file.name} ===\nFile uploaded successfully. Content suitable for educational assessment.`;
          }
        }
        
        console.log(`📊 Total extracted content: ${extractedFileContent.length} characters`);
      }

      // STEP 2: Generate course if requested
      if (options.includeCourse) {
        console.log('📚 Generating course...');
        
        if (extractedFileContent.length < 50 && (!prompt || prompt.length < 50)) {
          throw new Error('Course generation requires either uploaded files with content or a detailed prompt. Please provide sufficient material for course creation.');
        }

        try {
          generatedCourse = await CourseService.generateCourse(prompt, files, extractedFileContent);
          console.log('✅ Course generated successfully:', generatedCourse.id);
        } catch (error) {
          console.error('❌ Course generation failed:', error);
          throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // STEP 3: Create questionnaire
      let questionnaire: Questionnaire = {
        id: testId,
        title: `${options.testName}${totalSets > 1 ? ` - Set ${setNumber}` : ''}`,
        description: `Assessment test for: "${prompt}"${files.length > 0 ? ` (Based on uploaded files: ${files.map(f => f.name).join(', ')})` : ''}${totalSets > 1 ? ` - Set ${setNumber} of ${totalSets}` : ''}`,
        questions: [],
        createdAt: new Date().toISOString(),
        isActive: false,
        testName: options.testName,
        difficulty: options.difficulty,
        isSaved: false,
        timeframe: options.timeframe,
        setNumber,
        totalSets,
        courseId: generatedCourse?.id,
        requiresCourseCompletion: !!generatedCourse
      };

      // STEP 4: Generate questions if requested
      if (options.includeQuestionnaire) {
        console.log('❓ Generating questions...');
        
        if (extractedFileContent.length < 50 && (!prompt || prompt.length < 50)) {
          throw new Error('Question generation requires either uploaded files with content or a detailed prompt. Please provide material for question creation.');
        }

        try {
          const chatGPTQuestions = await ChatGPTService.generateQuestions(
            prompt,
            options.numberOfQuestions,
            options.difficulty,
            extractedFileContent,
            setNumber,
            totalSets
          );

          console.log(`✅ Generated ${chatGPTQuestions.length} questions`);

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
            console.log(`🌍 Translating to ${currentLanguage}...`);
            try {
              formattedQuestions = await LanguageService.translateQuestions(formattedQuestions, currentLanguage);
              questionnaire.title = await LanguageService.translateContent(questionnaire.title, currentLanguage);
              questionnaire.description = await LanguageService.translateContent(questionnaire.description, currentLanguage);
            } catch (error) {
              console.error('Translation failed, using English:', error);
            }
          }

          questionnaire.questions = formattedQuestions;
        } catch (error) {
          console.error('❌ Question generation failed:', error);
          throw new Error(`Question generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      console.log('🎉 Generation completed successfully:', {
        questionnaireId: questionnaire.id,
        questionsCount: questionnaire.questions.length,
        courseGenerated: !!generatedCourse,
        courseId: generatedCourse?.id,
        requiresCourseCompletion: questionnaire.requiresCourseCompletion
      });

      return { questionnaire, course: generatedCourse };
    } catch (error) {
      console.error('💥 Critical error in questionnaire generation:', error);
      throw error;
    }
  }

  // Check if user can access questionnaire (course completion requirement)
  canAccessQuestionnaire(questionnaireId: string, userRole: string = 'guest'): { canAccess: boolean; reason?: string } {
    try {
      const questionnaire = this.getQuestionnaireById(questionnaireId);
      
      if (!questionnaire) {
        return { canAccess: false, reason: 'Questionnaire not found' };
      }

      // Admins can always access
      if (userRole === 'admin') {
        return { canAccess: true };
      }

      // Check if course completion is required
      if (questionnaire.requiresCourseCompletion && questionnaire.courseId) {
        const courseCompleted = CourseService.isCourseCompleted(questionnaire.courseId);
        
        if (!courseCompleted) {
          return { 
            canAccess: false, 
            reason: 'You must complete the course before taking this test. Please complete the course materials first.' 
          };
        }
      }

      return { canAccess: true };
    } catch (error) {
      console.error('Error checking questionnaire access:', error);
      return { canAccess: false, reason: 'Error checking access permissions' };
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
      
      console.log('✅ Questionnaire saved successfully');
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
      console.log('🗑️ Deleting questionnaire:', id);
      
      const questionnaires = this.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      const activeQuestionnaires = this.getActiveQuestionnaires();
      const filteredActive = activeQuestionnaires.filter(q => q.id !== id);
      localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      
      console.log('✅ Questionnaire deleted successfully');
    } catch (error) {
      console.error('Error deleting questionnaire:', error);
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
      
      console.log('✅ Questionnaire activated successfully');
    } catch (error) {
      console.error('Error activating questionnaire:', error);
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
      
      console.log('✅ Questionnaire deactivated successfully');
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
