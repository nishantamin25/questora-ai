
import { QuestionnaireManager } from './questionnaire/QuestionnaireManager';
import { QuestionnaireGenerator } from './questionnaire/QuestionnaireGenerator';
import { Questionnaire, TestOptions } from './questionnaire/QuestionnaireTypes';

export class QuestionnaireService {
  // Generator methods
  static async generateQuestionnaire(
    prompt: string, 
    options: TestOptions, 
    fileContent: string = '',
    setNumber: number = 1,
    totalSets: number = 1
  ): Promise<Questionnaire> {
    return QuestionnaireGenerator.generateQuestionnaire(prompt, options, fileContent, setNumber, totalSets);
  }

  static autoSaveQuestionnaire(questionnaire: Questionnaire): void {
    QuestionnaireGenerator.autoSaveQuestionnaire(questionnaire);
  }

  // Manager methods
  static saveQuestionnaire(questionnaire: Questionnaire): void {
    QuestionnaireManager.saveQuestionnaire(questionnaire);
  }

  static getAllQuestionnaires(): Questionnaire[] {
    return QuestionnaireManager.getAllQuestionnaires();
  }

  static getActiveQuestionnaires(): Questionnaire[] {
    return QuestionnaireManager.getActiveQuestionnaires();
  }

  static getQuestionnaireById(id: string): Questionnaire | null {
    return QuestionnaireManager.getQuestionnaireById(id);
  }

  static deleteQuestionnaire(id: string): void {
    QuestionnaireManager.deleteQuestionnaire(id);
  }

  static activateQuestionnaire(id: string): void {
    QuestionnaireManager.activateQuestionnaire(id);
  }

  static deactivateQuestionnaire(id: string): void {
    QuestionnaireManager.deactivateQuestionnaire(id);
  }

  static getTempQuestionnaire(): Questionnaire | null {
    return QuestionnaireManager.getTempQuestionnaire();
  }

  static clearTempQuestionnaire(): void {
    QuestionnaireManager.clearTempQuestionnaire();
  }
}
