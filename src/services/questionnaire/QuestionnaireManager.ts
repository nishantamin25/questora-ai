
import { Questionnaire } from './QuestionnaireTypes';
import { QuestionnaireStorage } from './QuestionnaireStorage';

export class QuestionnaireManager {
  static saveQuestionnaire(questionnaire: Questionnaire): void {
    QuestionnaireStorage.saveQuestionnaire(questionnaire);
  }

  static getAllQuestionnaires(): Questionnaire[] {
    return QuestionnaireStorage.getAllQuestionnaires();
  }

  static getActiveQuestionnaires(): Questionnaire[] {
    return QuestionnaireStorage.getActiveQuestionnaires();
  }

  static getQuestionnaireById(id: string): Questionnaire | null {
    return QuestionnaireStorage.getQuestionnaireById(id);
  }

  static deleteQuestionnaire(id: string): void {
    QuestionnaireStorage.deleteQuestionnaire(id);
  }

  static activateQuestionnaire(id: string): void {
    QuestionnaireStorage.updateQuestionnaireActiveStatus(id, true);
  }

  static deactivateQuestionnaire(id: string): void {
    QuestionnaireStorage.updateQuestionnaireActiveStatus(id, false);
  }

  static getTempQuestionnaire(): Questionnaire | null {
    return QuestionnaireStorage.getTempQuestionnaire();
  }

  static clearTempQuestionnaire(): void {
    QuestionnaireStorage.clearTempQuestionnaire();
  }
}
