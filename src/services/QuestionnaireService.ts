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
  private readonly TEMP_STORAGE_KEY = 'temp_questionnaire'; // For immediate persistence

  async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<Questionnaire> {
    console.log('🔍 CRITICAL: QuestionnaireService generation starting with strict validation:', {
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

      // CRITICAL FIX: Immediate temp save to prevent data loss
      this.saveTempQuestionnaire(questionnaire);
      console.log('✅ TEMP SAVED: Questionnaire temporarily saved to prevent loss');

      // Generate questionnaire if requested
      if (options.includeQuestionnaire) {
        console.log('🔍 FORCING file content validation for question generation...');
        
        // CRITICAL: Validate file content is substantial for question generation
        if (!fileContent || fileContent.length < 200) {
          console.error('❌ CRITICAL: Insufficient file content for question generation');
          throw new Error('Question generation requires substantial file content (minimum 200 characters). Please upload files with sufficient readable text content.');
        }

        if (!this.validateFileContentForQuestions(fileContent)) {
          console.error('❌ CRITICAL: File content validation failed for questions');
          throw new Error('The provided file content is not suitable for question generation. Content appears to be corrupted or contains insufficient educational material.');
        }

        console.log('✅ VALIDATED: File content approved for question generation');
        
        try {
          const chatGPTQuestions = await ChatGPTService.generateQuestions(
            prompt,
            options.numberOfQuestions,
            options.difficulty,
            fileContent,
            setNumber,
            totalSets
          );

          console.log('✅ Questions generated successfully:', chatGPTQuestions.length);

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
          
          // CRITICAL: Immediate update to temp storage with questions
          this.saveTempQuestionnaire(questionnaire);
          console.log('✅ TEMP UPDATED: Questions added to temp storage');
          
        } catch (error) {
          console.error('❌ Error generating questions:', error);
          throw new Error(`Failed to generate questions: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }

      // Generate course if requested
      if (options.includeCourse) {
        console.log('🔍 FORCING course generation with validated content...');
        
        if (!fileContent || fileContent.length < 200) {
          console.error('❌ CRITICAL: Insufficient file content for course generation');
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
          
          // CRITICAL: Final temp save with course
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

      // CRITICAL: Final temp save and immediate auto-save
      this.saveTempQuestionnaire(questionnaire);
      this.autoSaveQuestionnaire(questionnaire);

      console.log('✅ QUESTIONNAIRE GENERATION SUCCESS:', {
        id: questionnaire.id,
        questionsCount: questionnaire.questions.length,
        hasCourse: !!questionnaire.course,
        setNumber: questionnaire.setNumber,
        totalSets: questionnaire.totalSets,
        language: currentLanguage,
        isAutoSaved: true
      });

      return questionnaire;
    } catch (error) {
      console.error('❌ CRITICAL QUESTIONNAIRE GENERATION FAILURE:', error);
      throw error;
    }
  }

  // CRITICAL: New method to validate file content for questions
  private validateFileContentForQuestions(fileContent: string): boolean {
    if (!fileContent || fileContent.length < 200) {
      return false;
    }

    // Check for educational content indicators
    const educationalTerms = (fileContent.match(/\b(?:chapter|section|introduction|conclusion|analysis|method|result|discussion|summary|overview|concept|principle|theory|practice|application|implementation|strategy|approach|technique|process|system|framework|model|design|development|research|study|data|information|knowledge|understanding|learning|education|training|course|lesson|topic|subject|content|material|resource|guide|manual|handbook|document|report|paper|article|book|text|definition|explanation|example|illustration|demonstration|case|scenario|problem|solution|question|answer|issue|challenge|opportunity|benefit|advantage|requirement|standard|criteria|guideline|recommendation|best|practices|methodology|procedure|step|stage|phase|level|degree|scope|range|scale|measure|metric|indicator|factor|element|component|aspect|feature|characteristic|property|quality|performance|effectiveness|efficiency|improvement|optimization|enhancement|innovation|technology|digital|platform|service|business|management|organization|operation|function|capability|capacity|resource|tool|equipment|facility|environment|condition|situation|context|background|history|evolution|development|progress|advancement|achievement|success|accomplishment|goal|objective|purpose|aim|target|mission|vision|value|benefit|impact|effect|influence|change|transformation|growth|expansion|increase|improvement|enhancement|optimization|innovation)+\b/gi) || []).length;
    
    return educationalTerms >= 5;
  }

  // CRITICAL: New method for temporary storage
  private saveTempQuestionnaire(questionnaire: Questionnaire): void {
    try {
      localStorage.setItem(this.TEMP_STORAGE_KEY, JSON.stringify(questionnaire));
      console.log('✅ Questionnaire saved to temp storage:', questionnaire.id);
    } catch (error) {
      console.error('❌ Failed to save to temp storage:', error);
    }
  }

  // CRITICAL: New method for auto-save
  private autoSaveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      console.log('🔄 Auto-saving questionnaire:', questionnaire.id);
      
      // Mark as saved and save to main storage
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

  // CRITICAL: Method to recover from temp storage
  getTempQuestionnaire(): Questionnaire | null {
    try {
      const stored = localStorage.getItem(this.TEMP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Failed to recover temp questionnaire:', error);
      return null;
    }
  }

  // CRITICAL: Method to clear temp storage
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
      
      // Clear temp storage after successful save
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
