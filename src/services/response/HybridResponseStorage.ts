import { supabase } from '@/integrations/supabase/client';
import { SupabaseResponseService, QuestionnaireResponse, SubmitResponseData } from '../supabase/SupabaseResponseService';

export class HybridResponseStorage {
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

  private static async getUserInfo(): Promise<{ userId: string; username: string }> {
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      
      if (!error && user) {
        // For authenticated users, use their email or metadata username
        const username = user.user_metadata?.username || user.email || 'Authenticated User';
        return { userId: user.id, username };
      }
    } catch (error) {
      console.log('Could not get authenticated user info:', error);
    }
    
    // For guests or when authentication fails, try to get guest username from localStorage
    const guestUsername = localStorage.getItem('guestUsername');
    return {
      userId: 'anonymous',
      username: guestUsername || 'Anonymous User'
    };
  }

  static async saveResponse(response: QuestionnaireResponse): Promise<void> {
    try {
      console.log('💾 Saving response with hybrid approach:', response.id);
      
      // Always save to local storage first for offline access
      this.saveToLocalStorage(response);
      
      // Try to save to Supabase if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          await SupabaseResponseService.saveResponse(response);
          console.log('✅ Response saved to both local and Supabase');
        } catch (error) {
          console.warn('⚠️ Failed to save to Supabase, saved locally only:', error);
        }
      } else {
        console.log('📴 Offline or not authenticated, saved locally only');
      }
    } catch (error) {
      console.error('❌ Failed to save response:', error);
      throw error;
    }
  }

  static async getAllResponses(): Promise<QuestionnaireResponse[]> {
    try {
      let responses: QuestionnaireResponse[] = [];
      
      // Try to load from Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          const supabaseResponses = await SupabaseResponseService.getAllResponses();
          responses = supabaseResponses;
          console.log('✅ Loaded responses from Supabase:', responses.length);
        } catch (error) {
          console.warn('⚠️ Failed to load from Supabase, falling back to local storage:', error);
        }
      }
      
      // If no responses from Supabase or offline, load from local storage
      if (responses.length === 0) {
        responses = this.getFromLocalStorage();
        console.log('📁 Loaded responses from local storage:', responses.length);
      }
      
      return responses;
    } catch (error) {
      console.error('❌ Failed to load responses:', error);
      return [];
    }
  }

  static async getResponsesByQuestionnaire(questionnaireId: string): Promise<QuestionnaireResponse[]> {
    try {
      // Try Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          const responses = await SupabaseResponseService.getResponsesByQuestionnaire(questionnaireId);
          if (responses.length > 0) {
            console.log('✅ Loaded responses from Supabase for questionnaire:', questionnaireId);
            return responses;
          }
        } catch (error) {
          console.warn('⚠️ Failed to load from Supabase, trying local storage:', error);
        }
      }
      
      // Fallback to local storage
      const allResponses = this.getFromLocalStorage();
      const filteredResponses = allResponses.filter(response => response.questionnaireId === questionnaireId);
      
      if (filteredResponses.length > 0) {
        console.log('📁 Loaded responses from local storage for questionnaire:', questionnaireId);
      }
      
      return filteredResponses;
    } catch (error) {
      console.error('❌ Failed to load responses for questionnaire:', error);
      return [];
    }
  }

  static async submitResponse(responseData: SubmitResponseData): Promise<void> {
    try {
      console.log('📤 Submitting response:', responseData);
      
      // Get user info (authenticated user or guest)
      const { userId, username } = await this.getUserInfo();
      console.log('👤 User info for response:', { userId, username });
      
      // Try Supabase first if online and authenticated
      if (this.isOnline() && await this.isAuthenticated()) {
        try {
          await SupabaseResponseService.submitResponse(responseData);
          console.log('✅ Response submitted to Supabase');
          return;
        } catch (error) {
          console.warn('⚠️ Failed to submit to Supabase, falling back to local storage:', error);
        }
      }
      
      // Fallback to local storage
      const response: QuestionnaireResponse = {
        id: this.generateId(),
        questionnaireId: responseData.questionnaireId,
        questionnaireTitle: 'Questionnaire',
        userId,
        username,
        answers: Object.entries(responseData.responses).map(([questionId, selectedOption]) => ({
          questionId,
          questionText: '',
          selectedOption,
          selectedOptionIndex: 0,
          isCorrect: undefined
        })),
        submittedAt: responseData.submittedAt
      };

      this.saveToLocalStorage(response);
      console.log('📁 Response submitted to local storage with username:', username);
    } catch (error) {
      console.error('❌ Failed to submit response:', error);
      throw error;
    }
  }

  private static saveToLocalStorage(response: QuestionnaireResponse): void {
    try {
      const existingResponses = this.getFromLocalStorage();
      existingResponses.unshift(response);
      localStorage.setItem('questionnaireResponses', JSON.stringify(existingResponses));
    } catch (error) {
      console.error('Error saving to local storage:', error);
    }
  }

  private static getFromLocalStorage(): QuestionnaireResponse[] {
    try {
      const stored = localStorage.getItem('questionnaireResponses');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading from local storage:', error);
      return [];
    }
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  static calculateScore(userAnswers: Array<{questionId: string; selectedOptionIndex: number}>, questionnaire: any): { score: number; totalQuestions: number; answers: Array<any> } {
    let correctCount = 0;
    const totalQuestions = questionnaire.questions.length;
    
    const answersWithCorrectness = userAnswers.map(userAnswer => {
      const question = questionnaire.questions.find((q: any) => q.id === userAnswer.questionId);
      const isCorrect = question?.correctAnswer !== undefined && 
                       question.correctAnswer === userAnswer.selectedOptionIndex;
      
      if (isCorrect) {
        correctCount++;
      }
      
      return {
        ...userAnswer,
        questionText: question?.text || '',
        selectedOption: question?.options?.[userAnswer.selectedOptionIndex] || '',
        isCorrect
      };
    });

    return {
      score: correctCount,
      totalQuestions,
      answers: answersWithCorrectness
    };
  }

  static async getResponseStats(questionnaireId: string) {
    const responses = await this.getResponsesByQuestionnaire(questionnaireId);
    const totalResponses = responses.length;
    
    if (totalResponses === 0) {
      return { totalResponses: 0, questionStats: [], averageScore: 0 };
    }

    // Calculate average score
    const responsesWithScores = responses.filter(r => r.score !== undefined);
    const averageScore = responsesWithScores.length > 0 
      ? responsesWithScores.reduce((sum, r) => sum + (r.score || 0), 0) / responsesWithScores.length
      : 0;

    // Get the first response to determine question structure
    const firstResponse = responses[0];
    const questionStats = firstResponse.answers.map((answer, questionIndex) => {
      const questionResponses = responses.map(r => r.answers[questionIndex]);
      const optionCounts: { [key: string]: number } = {};
      
      questionResponses.forEach(qr => {
        if (qr && qr.selectedOption) {
          optionCounts[qr.selectedOption] = (optionCounts[qr.selectedOption] || 0) + 1;
        }
      });

      return {
        questionId: answer.questionId,
        questionText: answer.questionText,
        totalAnswers: questionResponses.length,
        optionCounts
      };
    });

    return {
      totalResponses,
      questionStats,
      averageScore
    };
  }
}
