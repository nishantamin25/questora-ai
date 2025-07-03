
export interface Question {
  id: string;
  text: string;
  type: 'multiple-choice' | 'text' | 'boolean';
  options?: string[];
  correctAnswer?: number;
  adminSelectedAnswer?: number;
  explanation?: string;
}

export interface Course {
  id: string;
  title: string;
  content: string;
  sections: CourseSection[];
  createdAt: string;
}

export interface CourseSection {
  id: string;
  title: string;
  content: string;
  order: number;
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  testName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  timeframe?: number;
  questions: Question[];
  course?: Course;
  createdAt: string;
  isActive?: boolean;
  isSaved?: boolean;
  setNumber?: number;
  totalSets?: number;
  language?: string;
}

export interface TestOptions {
  testName: string;
  difficulty: 'easy' | 'medium' | 'hard';
  numberOfQuestions: number;
  timeframe: number;
  includeCourse: boolean;
  includeQuestionnaire: boolean;
  numberOfSets: number;
}
