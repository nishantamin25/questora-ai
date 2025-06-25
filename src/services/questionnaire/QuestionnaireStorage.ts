
import { Questionnaire } from './QuestionnaireTypes';

export class QuestionnaireStorage {
  private static readonly STORAGE_KEY = 'questionnaires';
  private static readonly ACTIVE_STORAGE_KEY = 'active_questionnaires';
  private static readonly TEMP_STORAGE_KEY = 'temp_questionnaire';

  static saveTempQuestionnaire(questionnaire: Questionnaire): void {
    try {
      localStorage.setItem(this.TEMP_STORAGE_KEY, JSON.stringify(questionnaire));
      console.log('✅ Questionnaire saved to temp storage:', questionnaire.id);
    } catch (error) {
      console.error('❌ Failed to save to temp storage:', error);
    }
  }

  static getTempQuestionnaire(): Questionnaire | null {
    try {
      const stored = localStorage.getItem(this.TEMP_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('❌ Failed to recover temp questionnaire:', error);
      return null;
    }
  }

  static clearTempQuestionnaire(): void {
    try {
      localStorage.removeItem(this.TEMP_STORAGE_KEY);
      console.log('✅ Temp questionnaire cleared');
    } catch (error) {
      console.error('❌ Failed to clear temp questionnaire:', error);
    }
  }

  static saveQuestionnaire(questionnaire: Questionnaire): void {
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

  static getAllQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      const questionnaires = stored ? JSON.parse(stored) : [];
      return Array.isArray(questionnaires) ? questionnaires : [];
    } catch (error) {
      console.error('❌ Error loading questionnaires:', error);
      return [];
    }
  }

  static getActiveQuestionnaires(): Questionnaire[] {
    try {
      const stored = localStorage.getItem(this.ACTIVE_STORAGE_KEY);
      const questionnaires = stored ? JSON.parse(stored) : [];
      return Array.isArray(questionnaires) ? questionnaires : [];
    } catch (error) {
      console.error('❌ Error loading active questionnaires:', error);
      return [];
    }
  }

  static getQuestionnaireById(id: string): Questionnaire | null {
    const questionnaires = this.getAllQuestionnaires();
    return questionnaires.find(q => q.id === id) || null;
  }

  static deleteQuestionnaire(id: string): void {
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

  static updateQuestionnaireActiveStatus(id: string, isActive: boolean): void {
    try {
      const questionnaire = this.getQuestionnaireById(id);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }
      
      questionnaire.isActive = isActive;
      this.saveQuestionnaire(questionnaire);
      
      if (!isActive) {
        const activeQuestionnaires = this.getActiveQuestionnaires();
        const filteredActive = activeQuestionnaires.filter(q => q.id !== id);
        localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      }
      
      console.log(`✅ Questionnaire ${isActive ? 'activated' : 'deactivated'} successfully:`, id);
    } catch (error) {
      console.error(`❌ Error ${isActive ? 'activating' : 'deactivating'} questionnaire:`, error);
      throw new Error(`Failed to ${isActive ? 'activate' : 'deactivate'} questionnaire`);
    }
  }
}
