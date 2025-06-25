
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

      QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
      console.log('✅ TEMP SAVED: Questionnaire saved to prevent loss');

      // Generate questions if requested
      if (options.includeQuestionnaire) {
        questionnaire.questions = await this.generateQuestions(
          prompt, 
          options, 
          fileContent, 
          setNumber, 
          totalSets, 
          currentLanguage
        );
        QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
      }

      // Generate course if requested
      if (options.includeCourse) {
        questionnaire.course = await this.generateCourse(
          prompt, 
          fileContent, 
          currentLanguage
        );
        QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
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

      QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
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
      
      console.log('✅ TEMP FINAL: Course added to questionnaire');
      return course;
    } catch (error) {
      console.error('❌ Course generation failed:', error);
      throw new Error(`Course generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  static autoSaveQuestionnaire(questionnaire: Questionnaire): void {
    try {
      console.log('🔄 Auto-saving questionnaire:', questionnaire.id);
      
      questionnaire.isSaved = true;
      
      const questionnaires = QuestionnaireStorage.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== questionnaire.id);
      filteredQuestionnaires.push(questionnaire);
      
      localStorage.setItem('questionnaires', JSON.stringify(filteredQuestionnaires));
      
      console.log('✅ Questionnaire auto-saved successfully:', questionnaire.id);
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    }
  }

  private static generateId(): string {
    return Math.random().toString(36).substr(2, 15);
  }
}
