
import { supabase } from '@/integrations/supabase/client';

interface Config {
  defaultQuestionType: string;
  numberOfQuestions: number;
  multipleChoiceOptions: string;
}

export class SupabaseConfigService {
  private static readonly CONFIG_TABLE = 'user_configs';
  
  private static defaultConfig: Config = {
    defaultQuestionType: 'multiple-choice',
    numberOfQuestions: 5,
    multipleChoiceOptions: 'Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree'
  };

  static async getConfig(): Promise<Config> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.log('📁 No user authenticated, using default config');
        return this.defaultConfig;
      }

      // For now, we'll use localStorage as the config table doesn't exist in schema
      // In a real implementation, you would create a user_configs table
      const stored = localStorage.getItem('adminConfig');
      if (stored) {
        return { ...this.defaultConfig, ...JSON.parse(stored) };
      }
      
      return this.defaultConfig;
    } catch (error) {
      console.error('❌ Failed to load config:', error);
      return this.defaultConfig;
    }
  }

  static async saveConfig(config: Config): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.warn('⚠️ No user authenticated, saving config locally');
        localStorage.setItem('adminConfig', JSON.stringify(config));
        return;
      }

      // For now, we'll use localStorage as the config table doesn't exist in schema
      // In a real implementation, you would save to a user_configs table
      localStorage.setItem('adminConfig', JSON.stringify(config));
      console.log('✅ Config saved successfully');
    } catch (error) {
      console.error('❌ Failed to save config:', error);
      throw error;
    }
  }

  static getDefaultConfig(): Config {
    return { ...this.defaultConfig };
  }
}
