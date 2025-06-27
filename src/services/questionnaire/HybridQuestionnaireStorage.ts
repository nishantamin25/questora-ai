
import { Questionnaire } from './QuestionnaireTypes';
import { QuestionnaireStorage } from './QuestionnaireStorage';
import { SupabaseQuestionnaireService } from '../supabase/SupabaseQuestionnaireService';
import { supabase } from '@/integrations/supabase/client';

export class HybridQuestionnaireStorage {
  private static isOnline(): boolean {
    return navigator.onLine;
  }

  private static async isAuthenticated(): Promise<boolean> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      return !error && !!user;
    } catch {
      return false;
    }
  }

  static async saveQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    try {
      console.log('💾 Saving questionnaire with hybrid approach:', questionnaire.id);
      
      // Always save to local storage first for offline access
      QuestionnaireStorage.saveQuestionnaire(questionnaire);
      
      // Try to save to Supabase if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          await SupabaseQuestionnaireService.saveQuestionnaire(questionnaire);
          console.log('✅ Questionnaire saved to both local and Supabase');
        } catch (error) {
          console.warn('⚠️ Failed to save to Supabase, saved locally only:', error);
        }
      } else {
        console.log('📴 Offline or not authenticated, saved locally only');
      }
    } catch (error) {
      console.error('❌ Failed to save questionnaire:', error);
      throw error;
    }
  }

  static async getAllQuestionnaires(): Promise<Questionnaire[]> {
    try {
      let questionnaires: Questionnaire[] = [];
      
      // Try to load from Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          const supabaseQuestionnaires = await SupabaseQuestionnaireService.getAllQuestionnaires();
          questionnaires = supabaseQuestionnaires;
          console.log('✅ Loaded questionnaires from Supabase:', questionnaires.length);
        } catch (error) {
          console.warn('⚠️ Failed to load from Supabase, falling back to local storage:', error);
        }
      }
      
      // If no questionnaires from Supabase or offline, load from local storage
      if (questionnaires.length === 0) {
        questionnaires = QuestionnaireStorage.getAllQuestionnaires();
        console.log('📁 Loaded questionnaires from local storage:', questionnaires.length);
      }
      
      return questionnaires;
    } catch (error) {
      console.error('❌ Failed to load questionnaires:', error);
      return [];
    }
  }

  static async getQuestionnaireById(id: string): Promise<Questionnaire | null> {
    try {
      // Try Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          const questionnaire = await SupabaseQuestionnaireService.getQuestionnaire(id);
          if (questionnaire) {
            console.log('✅ Loaded questionnaire from Supabase:', id);
            return questionnaire;
          }
        } catch (error) {
          console.warn('⚠️ Failed to load from Supabase, trying local storage:', error);
        }
      }
      
      // Fallback to local storage
      const questionnaire = QuestionnaireStorage.getQuestionnaireById(id);
      if (questionnaire) {
        console.log('📁 Loaded questionnaire from local storage:', id);
      }
      
      return questionnaire;
    } catch (error) {
      console.error('❌ Failed to load questionnaire:', error);
      return null;
    }
  }

  static async deleteQuestionnaire(id: string): Promise<void> {
    try {
      console.log('🗑️ Deleting questionnaire with hybrid approach:', id);
      
      // Delete from local storage
      QuestionnaireStorage.deleteQuestionnaire(id);
      
      // Try to delete from Supabase if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          await SupabaseQuestionnaireService.deleteQuestionnaire(id);
          console.log('✅ Questionnaire deleted from both local and Supabase');
        } catch (error) {
          console.warn('⚠️ Failed to delete from Supabase, deleted locally only:', error);
        }
      } else {
        console.log('📴 Offline or not authenticated, deleted locally only');
      }
    } catch (error) {
      console.error('❌ Failed to delete questionnaire:', error);
      throw error;
    }
  }

  static async syncToSupabase(): Promise<void> {
    try {
      if (!this.isOnline() || !await this.isAuthenticated()) {
        console.log('📴 Cannot sync: offline or not authenticated');
        return;
      }

      console.log('🔄 Syncing local questionnaires to Supabase...');
      
      const localQuestionnaires = QuestionnaireStorage.getAllQuestionnaires();
      
      for (const questionnaire of localQuestionnaires) {
        if (questionnaire.isSaved) {
          try {
            await SupabaseQuestionnaireService.saveQuestionnaire(questionnaire);
            console.log('✅ Synced questionnaire to Supabase:', questionnaire.id);
          } catch (error) {
            console.warn('⚠️ Failed to sync questionnaire:', questionnaire.id, error);
          }
        }
      }
      
      console.log('🔄 Sync completed');
    } catch (error) {
      console.error('❌ Failed to sync to Supabase:', error);
    }
  }

  // Temporary storage methods (delegate to local storage)
  static saveTempQuestionnaire(questionnaire: Questionnaire): void {
    QuestionnaireStorage.saveTempQuestionnaire(questionnaire);
  }

  static getTempQuestionnaire(): Questionnaire | null {
    return QuestionnaireStorage.getTempQuestionnaire();
  }

  static clearTempQuestionnaire(): void {
    QuestionnaireStorage.clearTempQuestionnaire();
  }

  // Persistent state methods (delegate to local storage)
  static savePersistentState(data: any): void {
    QuestionnaireStorage.savePersistentState(data);
  }

  static getPersistentState(): any | null {
    return QuestionnaireStorage.getPersistentState();
  }

  static clearPersistentState(): void {
    QuestionnaireStorage.clearPersistentState();
  }
}
