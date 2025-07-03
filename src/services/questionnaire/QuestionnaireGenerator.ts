
import { ChatGPTService } from '../ChatGPTService';
import { CourseService } from '../CourseService';
import { LanguageService } from '../LanguageService';
import { Questionnaire, TestOptions, Question } from './QuestionnaireTypes';
import { QuestionnaireStorage } from './QuestionnaireStorage';

export class QuestionnaireGenerator {
  static async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<Questionnaire> {
    console.log('🔍 PRODUCTION QUESTIONNAIRE GENERATION: Starting with persistence and multilingual support:', {
      prompt,
      options,
      requestedQuestions: options.numberOfQuestions,
      hasFileContent: !!fileContent,
      fileContentLength: fileContent.length,
      setNumber,
      totalSets,
      currentLanguage: LanguageService.getCurrentLanguage()
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
        totalSets,
        language: currentLanguage // Store original language
      };

      // PRODUCTION: Immediate persistent state save to prevent data loss
      QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
      QuestionnaireStorage.savePersistentState({ 
        questionnaire, 
        type: 'generation_in_progress',
        step: 'initialized',
        timestamp: new Date().toISOString()
      });
      console.log('✅ PERSISTENT SAVE: Initial questionnaire state saved');

      // Generate questions if requested
      if (options.includeQuestionnaire) {
        console.log('🔍 Generating questions with multilingual support...');
        questionnaire.questions = await this.generateQuestions(
          prompt, 
          options, 
          fileContent, 
          setNumber, 
          totalSets, 
          currentLanguage
        );
        
        // Save after questions generation
        QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
        QuestionnaireStorage.savePersistentState({ 
          questionnaire, 
          type: 'generation_in_progress',
          step: 'questions_generated',
          timestamp: new Date().toISOString()
        });
        console.log('✅ PERSISTENT SAVE: Questions generated and saved');
      }

      // Generate course if requested
      if (options.includeCourse) {
        console.log('🔍 Generating course with multilingual support...');
        questionnaire.course = await this.generateCourse(
          prompt, 
          fileContent, 
          currentLanguage
        );
        
        // Save after course generation
        QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
        QuestionnaireStorage.savePersistentState({ 
          questionnaire, 
          type: 'generation_in_progress',
          step: 'course_generated',
          timestamp: new Date().toISOString()
        });
        console.log('✅ PERSISTENT SAVE: Course generated and saved');
      }

      // PRODUCTION: Multilingual support - translate metadata if needed
      if (currentLanguage !== 'en') {
        console.log(`🌐 Translating questionnaire metadata to ${currentLanguage}...`);
        try {
          const [translatedTitle, translatedDescription] = await Promise.all([
            LanguageService.translateContent(questionnaire.title, currentLanguage),
            LanguageService.translateContent(questionnaire.description, currentLanguage)
          ]);
          
          questionnaire.title = translatedTitle;
          questionnaire.description = translatedDescription;
          
          console.log('✅ Metadata translation completed successfully');
        } catch (error) {
          console.error('⚠️ Metadata translation failed, continuing with English:', error);
        }
      }

      // Final persistent save
      QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
      QuestionnaireStorage.savePersistentState({ 
        questionnaire, 
        type: 'generation_completed',
        step: 'finalized',
        timestamp: new Date().toISOString()
      });
      this.autoSaveQuestionnaire(questionnaire);

      console.log('✅ PRODUCTION QUESTIONNAIRE SUCCESS with full persistence:', {
        id: questionnaire.id,
        questionsGenerated: questionnaire.questions.length,
        questionsRequested: options.numberOfQuestions,
        exactMatch: questionnaire.questions.length === options.numberOfQuestions,
        hasCourse: !!questionnaire.course,
        setNumber: questionnaire.setNumber,
        totalSets: questionnaire.totalSets,
        language: questionnaire.language,
        currentUILanguage: currentLanguage,
        isFileContentBased: fileContent.length > 0,
        persistentStateSaved: true
      });

      return questionnaire;
    } catch (error) {
      console.error('❌ QUESTIONNAIRE GENERATION FAILURE:', error);
      
      // Save error state for recovery
      QuestionnaireStorage.savePersistentState({ 
        error: error instanceof Error ? error.message : 'Unknown error',
        type: 'generation_failed',
        step: 'error',
        timestamp: new Date().toISOString(),
        prompt,
        options,
        fileContent: fileContent.substring(0, 200) + '...'
      });
      
      throw error;
    }
  }

  // PRODUCTION: Enhanced recovery method for persistent state
  static recoverQuestionnaire(): Questionnaire | null {
    try {
      const persistentState = QuestionnaireStorage.getPersistentState();
      if (persistentState && persistentState.questionnaire) {
        console.log('🔄 RECOVERY: Questionnaire recovered from persistent state:', {
          id: persistentState.questionnaire.id,
          step: persistentState.step,
          type: persistentState.type,
          language: persistentState.questionnaire.language
        });
        
        return persistentState.questionnaire;
      }
      
      // Fallback to temp storage
      const tempQuestionnaire = QuestionnaireStorage.getTempQuestionnaire();
      if (tempQuestionnaire) {
        console.log('🔄 RECOVERY: Questionnaire recovered from temp storage:', tempQuestionnaire.id);
        return tempQuestionnaire;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Recovery failed:', error);
      return null;
    }
  }

  // PRODUCTION: Language-aware questionnaire adaptation
  static async adaptQuestionnaireToLanguage(questionnaire: Questionnaire, targetLanguage: string): Promise<Questionnaire> {
    if (!questionnaire || questionnaire.language === targetLanguage) {
      return questionnaire;
    }

    console.log(`🌐 ADAPTING questionnaire from ${questionnaire.language} to ${targetLanguage}...`);

    try {
      const adaptedQuestionnaire = { ...questionnaire };
      
      // Translate metadata
      if (targetLanguage !== 'en') {
        adaptedQuestionnaire.title = await LanguageService.translateContent(questionnaire.title, targetLanguage);
        adaptedQuestionnaire.description = await LanguageService.translateContent(questionnaire.description, targetLanguage);
      }
      
      // Translate questions
      if (questionnaire.questions && questionnaire.questions.length > 0) {
        adaptedQuestionnaire.questions = await LanguageService.translateQuestions(questionnaire.questions, targetLanguage);
      }
      
      // Translate course if present
      if (questionnaire.course) {
        const course = questionnaire.course;
        if (targetLanguage !== 'en') {
          // Use 'title' instead of 'name' for Course type
          if (course.title) {
            course.title = await LanguageService.translateContent(course.title, targetLanguage);
          }
          // Course type doesn't have 'description' property, so we skip this
          // Course type doesn't have 'materials' property, so we translate sections instead
          if (course.sections && Array.isArray(course.sections)) {
            course.sections = await Promise.all(
              course.sections.map(async (section: any) => ({
                ...section,
                title: section.title ? await LanguageService.translateContent(section.title, targetLanguage) : section.title,
                content: section.content ? await LanguageService.translateContent(section.content, targetLanguage) : section.content
              }))
            );
          }
        }
        adaptedQuestionnaire.course = course;
      }
      
      // Update language metadata
      adaptedQuestionnaire.language = targetLanguage;
      
      // Save adapted version persistently
      QuestionnaireStorage.savePersistentState({ 
        questionnaire: adaptedQuestionnaire, 
        type: 'language_adapted',
        originalLanguage: questionnaire.language,
        targetLanguage,
        timestamp: new Date().toISOString()
      });
      
      console.log(`✅ Questionnaire successfully adapted to ${targetLanguage}`);
      return adaptedQuestionnaire;
      
    } catch (error) {
      console.error('❌ Language adaptation failed:', error);
      return questionnaire; // Return original if adaptation fails
    }
  }

  private static async generateQuestions(
    prompt: string,
    options: TestOptions,
    fileContent: string,
    setNumber: number,
    totalSets: number,
    currentLanguage: string
  ): Promise<Question[]> {
    console.log('🔍 ENFORCING: Strict file content requirement for questions...');
    
    if (!fileContent || fileContent.length < 300) {
      console.error('❌ BLOCKED: Insufficient file content for questions');
      throw new Error(`Question generation requires substantial file content (minimum 300 characters). Current content: ${fileContent?.length || 0} characters. Upload files with readable text to generate accurate questions.`);
    }

    console.log('✅ PROCEEDING: File content validated for strict question generation');
    
    try {
      const chatGPTQuestions = await ChatGPTService.generateQuestions(
        prompt,
        options.numberOfQuestions,
        options.difficulty,
        fileContent,
        setNumber,
        totalSets
      );

      console.log(`✅ GENERATED: ${chatGPTQuestions.length} questions from file content (requested: ${options.numberOfQuestions})`);

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

      // PRODUCTION: Multilingual support - translate questions if needed
      if (currentLanguage !== 'en') {
        console.log(`🌐 Translating ${formattedQuestions.length} questions to ${currentLanguage}...`);
        try {
          formattedQuestions = await LanguageService.translateQuestions(formattedQuestions, currentLanguage);
          console.log('✅ Questions translated successfully');
        } catch (error) {
          console.error('⚠️ Translation failed, continuing with English:', error);
        }
      }

      return formattedQuestions;
    } catch (error) {
      console.error('❌ Question generation failed:', error);
      throw error;
    }
  }

  private static async generateCourse(
    prompt: string,
    fileContent: string,
    currentLanguage: string
  ): Promise<any> {
    console.log('🔍 ENFORCING: File content requirement for course...');
    
    if (!fileContent || fileContent.length < 200) {
      console.error('❌ BLOCKED: Insufficient file content for course');
      throw new Error(`Course generation requires substantial file content (minimum 200 characters). Current content: ${fileContent?.length || 0} characters.`);
    }

    try {
      let course = await CourseService.generateCourse(prompt, [], fileContent);
      
      // PRODUCTION: Multilingual support - translate course if needed
      if (currentLanguage !== 'en' && course) {
        try {
          console.log(`🌐 Translating course to ${currentLanguage}...`);
          
          // Use 'title' instead of 'name' for Course type
          if (course.title) {
            course.title = await LanguageService.translateContent(course.title, currentLanguage);
          }
          // Course type doesn't have 'description' property, so we translate 'content' instead
          if (course.content) {
            course.content = await LanguageService.translateContent(course.content, currentLanguage);
          }
          
          // Course type doesn't have 'materials' property, so we translate 'sections' instead
          if (course.sections && Array.isArray(course.sections)) {
            course.sections = await Promise.all(
              course.sections.map(async (section: any) => ({
                ...section,
                title: section.title ? await LanguageService.translateContent(section.title, currentLanguage) : section.title,
                content: section.content ? await LanguageService.translateContent(section.content, currentLanguage) : section.content
              }))
            );
          }
          
          console.log('✅ Course translated successfully');
        } catch (error) {
          console.error('⚠️ Course translation failed:', error);
        }
      }
      
      console.log('✅ Course generation completed with multilingual support');
      return course;
    } catch (error) {
      console.error('❌ Course generation failed:', error);
      throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static autoSaveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      console.log('🔄 Auto-saving questionnaire with persistence:', questionnaire.id);
      
      questionnaire.isSaved = true;
      
      const questionnaires = QuestionnaireStorage.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== questionnaire.id);
      filteredQuestionnaires.push(questionnaire);
      
      localStorage.setItem('questionnaires', JSON.stringify(filteredQuestionnaires));
      
      // Also save to persistent state
      QuestionnaireStorage.savePersistentState({ 
        questionnaire, 
        type: 'auto_saved',
        timestamp: new Date().toISOString()
      });
      
      console.log('✅ Questionnaire auto-saved successfully with persistence:', questionnaire.id);
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }
}
