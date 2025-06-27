
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

  // Manager methods - now properly async
  static async saveQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    return QuestionnaireManager.saveQuestionnaire(questionnaire);
  }

  static async getAllQuestionnaires(): Promise<Questionnaire[]> {
    return QuestionnaireManager.getAllQuestionnaires();
  }

  static async getActiveQuestionnaires(): Promise<Questionnaire[]> {
    return QuestionnaireManager.getActiveQuestionnaires();
  }

  static async getQuestionnaireById(id: string): Promise<Questionnaire | null> {
    return QuestionnaireManager.getQuestionnaireById(id);
  }

  static async deleteQuestionnaire(id: string): Promise<void> {
    return QuestionnaireManager.deleteQuestionnaire(id);
  }

  static async activateQuestionnaire(id: string): Promise<void> {
    return QuestionnaireManager.activateQuestionnaire(id);
  }

  static async deactivateQuestionnaire(id: string): Promise<void> {
    return QuestionnaireManager.deactivateQuestionnaire(id);
  }

  static getTempQuestionnaire(): Questionnaire | null {
    return QuestionnaireManager.getTempQuestionnaire();
  }

  static clearTempQuestionnaire(): void {
    QuestionnaireManager.clearTempQuestionnaire();
  }

  static async syncToSupabase(): Promise<void> {
    return QuestionnaireManager.syncToSupabase();
  }
}
