
import { SupabaseConfigService } from './supabase/SupabaseConfigService';

interface Config {
  defaultQuestionType: string;
  numberOfQuestions: number;
  multipleChoiceOptions: string;
}

class ConfigServiceClass {
  async getConfig(): Promise<Config> {
    return SupabaseConfigService.getConfig();
  }

  async saveConfig(config: Config): Promise<void> {
    return SupabaseConfigService.saveConfig(config);
  }

  getDefaultConfig(): Config {
    return SupabaseConfigService.getDefaultConfig();
  }
}

export const ConfigService = new ConfigServiceClass();
