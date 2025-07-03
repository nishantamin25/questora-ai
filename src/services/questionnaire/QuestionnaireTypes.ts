
export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'boolean';
  options: string[];
  correctAnswer: number;
  explanation?: string;
}

export interface TestOptions {
  testName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  timeframe: number;
  includeCourse: boolean;
  includeQuestionnaire: boolean;
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive: boolean;
  testName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  isSaved: boolean;
  timeframe: number;
  setNumber?: number;
  totalSets?: number;
  course?: any;
  language?: string;
}
