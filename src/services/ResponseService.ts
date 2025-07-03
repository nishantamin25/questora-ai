
import { HybridResponseStorage } from './response/HybridResponseStorage';

export interface QuestionnaireResponse {
  id: string;
  questionnaireId: string;
  questionnaireTitle: string;
  userId: string;
  username: string;
  answers: Array<{
    questionId: string;
    questionText: string;
    selectedOption: string;
    selectedOptionIndex: number;
    isCorrect?: boolean;
  }>;
  submittedAt: string;
  score?: number;
  totalQuestions?: number;
}

export interface SubmitResponseData {
  questionnaireId: string;
  responses: Record<string, string>;
  submittedAt: string;
}

class ResponseServiceClass {
  async submitResponse(responseData: SubmitResponseData): Promise<void> {
    return HybridResponseStorage.submitResponse(responseData);
  }

  async saveResponse(response: QuestionnaireResponse): Promise<void> {
    return HybridResponseStorage.saveResponse(response);
  }

  async getAllResponses(): Promise<QuestionnaireResponse[]> {
    return HybridResponseStorage.getAllResponses();
  }

  async getResponsesByQuestionnaire(questionnaireId: string): Promise<QuestionnaireResponse[]> {
    return HybridResponseStorage.getResponsesByQuestionnaire(questionnaireId);
  }

  calculateScore(userAnswers: Array<{questionId: string; selectedOptionIndex: number}>, questionnaire: any): { score: number; totalQuestions: number; answers: Array<any> } {
    return HybridResponseStorage.calculateScore(userAnswers, questionnaire);
  }

  async getResponseStats(questionnaireId: string) {
    return HybridResponseStorage.getResponseStats(questionnaireId);
  }

  generateUUID(): string {
    return crypto.randomUUID();
  }
}

export const ResponseService = new ResponseServiceClass();
