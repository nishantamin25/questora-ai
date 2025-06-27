import { Questionnaire } from './QuestionnaireTypes';

export class QuestionnaireStorage {
  private static readonly STORAGE_KEY = 'questionnaires';
  private static readonly ACTIVE_STORAGE_KEY = 'active_questionnaires';
  private static readonly TEMP_STORAGE_KEY = 'temp_questionnaire';
  private static readonly PERSISTENT_STATE_KEY = 'persistent_questionnaire_state';
  private static readonly QUESTION_HASH_KEY = 'question_hashes';

  // PRODUCTION: Persistent state management to prevent content loss
  static savePersistentState(data: any): void {
    try {
      const stateData = {
        ...data,
        timestamp: new Date().toISOString(),
        language: localStorage.getItem('selectedLanguage') || 'en'
      };
      localStorage.setItem(this.PERSISTENT_STATE_KEY, JSON.stringify(stateData));
      console.log('✅ Persistent state saved to prevent content loss');
    } catch (error) {
      console.error('❌ Failed to save persistent state:', error);
    }
  }

  static getPersistentState(): any | null {
    try {
      const stored = localStorage.getItem(this.PERSISTENT_STATE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        console.log('🔄 Persistent state recovered:', { timestamp: data.timestamp, language: data.language });
        return data;
      }
      return null;
    } catch (error) {
      console.error('❌ Failed to recover persistent state:', error);
      return null;
    }
  }

  static clearPersistentState(): void {
    try {
      localStorage.removeItem(this.PERSISTENT_STATE_KEY);
      console.log('✅ Persistent state cleared');
    } catch (error) {
      console.error('❌ Failed to clear persistent state:', error);
    }
  }

  // PRODUCTION: Cross-test deduplication system
  static saveQuestionHash(questionText: string, topic: string): void {
    try {
      const hashes = this.getQuestionHashes();
      const questionHash = this.generateQuestionHash(questionText);
      
      if (!hashes[topic]) {
        hashes[topic] = [];
      }
      
      if (!hashes[topic].includes(questionHash)) {
        hashes[topic].push(questionHash);
        localStorage.setItem(this.QUESTION_HASH_KEY, JSON.stringify(hashes));
        console.log('✅ Question hash saved for deduplication');
      }
    } catch (error) {
      console.error('❌ Failed to save question hash:', error);
    }
  }

  static checkQuestionDuplicate(questionText: string, topic: string): boolean {
    try {
      const hashes = this.getQuestionHashes();
      const questionHash = this.generateQuestionHash(questionText);
      
      return hashes[topic]?.includes(questionHash) || false;
    } catch (error) {
      console.error('❌ Failed to check question duplicate:', error);
      return false;
    }
  }

  private static getQuestionHashes(): Record<string, string[]> {
    try {
      const stored = localStorage.getItem(this.QUESTION_HASH_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('❌ Failed to get question hashes:', error);
      return {};
    }
  }

  private static generateQuestionHash(questionText: string): string {
    // Simple hash function for question deduplication
    const normalized = questionText.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  static saveTempQuestionnaire(questionnaire: Questionnaire): void {
    try {
      localStorage.setItem(this.TEMP_STORAGE_KEY, JSON.stringify(questionnaire));
      // Also save to persistent state to prevent loss
      this.savePersistentState({ questionnaire, type: 'temp' });
      console.log('✅ Questionnaire saved to temp storage with persistence backup:', questionnaire.id);
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
      console.log('💾 Saving questionnaire with persistence:', questionnaire.id);
      
      questionnaire.isSaved = true;
      
      const questionnaires = this.getAllQuestionnaires();
      const filteredQuestionnaires = questionnaires.filter(q => q.id !== questionnaire.id);
      filteredQuestionnaires.push(questionnaire);
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredQuestionnaires));
      
      // Save question hashes for deduplication
      if (questionnaire.questions) {
        const topic = questionnaire.title || questionnaire.testName || 'general';
        questionnaire.questions.forEach(q => {
          this.saveQuestionHash(q.text, topic);
        });
      }
      
      if (questionnaire.isActive) {
        const activeQuestionnaires = this.getActiveQuestionnaires();
        const filteredActive = activeQuestionnaires.filter(q => q.id !== questionnaire.id);
        filteredActive.push(questionnaire);
        localStorage.setItem(this.ACTIVE_STORAGE_KEY, JSON.stringify(filteredActive));
      }
      
      // Save to persistent state
      this.savePersistentState({ questionnaire, type: 'saved' });
      this.clearTempQuestionnaire();
      
      console.log('✅ Questionnaire saved successfully with full persistence:', questionnaire.id);
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
