
export interface Question {
  id: string;
  text: string;
  type: string;
  options?: string[];
}

export interface Questionnaire {
  id: string;
  title: string;
  description: string;
  questions: Question[];
  createdAt: string;
  isActive?: boolean;
  testName?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  isSaved?: boolean;
  timeframe?: number;
  setNumber?: number;
  totalSets?: number;
  courseContent?: any;
}

export interface SaveTestDialogProps {
  questionnaire: Questionnaire;
  onSave: (savedQuestionnaire: Questionnaire) => void;
  onCancel: () => void;
}
