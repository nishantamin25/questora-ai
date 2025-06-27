
import { Questionnaire } from './QuestionnaireTypes';
import { HybridQuestionnaireStorage } from './HybridQuestionnaireStorage';

export class QuestionnaireManager {
  static async saveQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    return HybridQuestionnaireStorage.saveQuestionnaire(questionnaire);
  }

  static async getAllQuestionnaires(): Promise<Questionnaire[]> {
    return HybridQuestionnaireStorage.getAllQuestionnaires();
  }

  static async getActiveQuestionnaires(): Promise<Questionnaire[]> {
    const allQuestionnaires = await this.getAllQuestionnaires();
    return allQuestionnaires.filter(q => q.isActive);
  }

  static async getQuestionnaireById(id: string): Promise<Questionnaire | null> {
    return HybridQuestionnaireStorage.getQuestionnaireById(id);
  }

  static async deleteQuestionnaire(id: string): Promise<void> {
    return HybridQuestionnaireStorage.deleteQuestionnaire(id);
  }

  static async activateQuestionnaire(id: string): Promise<void> {
    const questionnaire = await this.getQuestionnaireById(id);
    if (questionnaire) {
      questionnaire.isActive = true;
      await this.saveQuestionnaire(questionnaire);
    }
  }

  static async deactivateQuestionnaire(id: string): Promise<void> {
    const questionnaire = await this.getQuestionnaireById(id);
    if (questionnaire) {
      questionnaire.isActive = false;
      await this.saveQuestionnaire(questionnaire);
    }
  }

  static getTempQuestionnaire(): Questionnaire | null {
    return HybridQuestionnaireStorage.getTempQuestionnaire();
  }

  static clearTempQuestionnaire(): void {
    HybridQuestionnaireStorage.clearTempQuestionnaire();
  }

  static async syncToSupabase(): Promise<void> {
    return HybridQuestionnaireStorage.syncToSupabase();
  }
}
