
interface Config {
  defaultQuestionType: string;
  numberOfQuestions: number;
  multipleChoiceOptions: string;
}

class ConfigServiceClass {
  private defaultConfig: Config = {
    defaultQuestionType: 'multiple-choice',
    numberOfQuestions: 5,
    multipleChoiceOptions: 'Strongly Disagree, Disagree, Neutral, Agree, Strongly Agree'
  };

  getConfig(): Config {
    const stored = localStorage.getItem('adminConfig');
    if (stored) {
      return { ...this.defaultConfig, ...JSON.parse(stored) };
    }
    return this.defaultConfig;
  }

  saveConfig(config: Config): void {
    localStorage.setItem('adminConfig', JSON.stringify(config));
  }

  getDefaultConfig(): Config {
    return { ...this.defaultConfig };
  }
}

export const ConfigService = new ConfigServiceClass();
