
import { supabase } from '@/integrations/supabase/client';
import { SupabaseResponseService, QuestionnaireResponse, SubmitResponseData } from '../supabase/SupabaseResponseService';
import { QuestionnaireManager } from '../questionnaire/QuestionnaireManager';
import { ResponseScoring } from './ResponseScoring';
import { AuthService } from '../AuthService';

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
    
    // For guests, get the username from the current user session
    const currentUser = AuthService.getCurrentUser();
    if (currentUser && currentUser.role === 'guest') {
      return {
        userId: 'anonymous',
        username: currentUser.username
      };
    }
    
    // Fallback to stored username if available
    let guestUsername = sessionStorage.getItem('currentGuestUsername') || localStorage.getItem('guestUsername');
    
    // Only generate timestamp username as last resort
    if (!guestUsername) {
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
      guestUsername = `Guest_${timestamp}`;
      sessionStorage.setItem('currentGuestUsername', guestUsername);
      localStorage.setItem('guestUsername', guestUsername);
    }
    
    return {
      userId: 'anonymous',
      username: guestUsername
    };
  }

  // Track completed questionnaires for guest users
  private static markQuestionnaireCompleted(questionnaireId: string, username: string): void {
    try {
      const completedKey = `completed_questionnaires_${username}`;
      const existingCompleted = JSON.parse(sessionStorage.getItem(completedKey) || '[]');
      
      if (!existingCompleted.includes(questionnaireId)) {
        existingCompleted.push(questionnaireId);
        sessionStorage.setItem(completedKey, JSON.stringify(existingCompleted));
        console.log(`✅ Marked questionnaire ${questionnaireId} as completed for ${username}`);
      }
    } catch (error) {
      console.error('Error marking questionnaire as completed:', error);
    }
  }

  static isQuestionnaireCompletedByGuest(questionnaireId: string, username: string): boolean {
    try {
      const completedKey = `completed_questionnaires_${username}`;
      const existingCompleted = JSON.parse(sessionStorage.getItem(completedKey) || '[]');
      return existingCompleted.includes(questionnaireId);
    } catch (error) {
      console.error('Error checking completed questionnaires:', error);
      return false;
    }
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
      console.log('📤 Submitting response with admin-selected answer validation');
      
      // Get the questionnaire to access admin-selected correct answers
      const questionnaire = await QuestionnaireManager.getQuestionnaireById(responseData.questionnaireId);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }

      // Convert responses to the format expected by scoring
      const userAnswers = Object.entries(responseData.responses).map(([questionId, selectedOption]) => {
        const question = questionnaire.questions.find(q => q.id === questionId);
        const selectedOptionIndex = question?.options?.indexOf(selectedOption) ?? 0;
        return {
          questionId,
          selectedOptionIndex
        };
      });

      // Calculate score using admin-selected correct answers
      const scoringResult = ResponseScoring.calculateScore(userAnswers, questionnaire);
      
      // Get user info
      const { userId, username } = await this.getUserInfo();
      
      const response: QuestionnaireResponse = {
        id: this.generateId(),
        questionnaireId: responseData.questionnaireId,
        questionnaireTitle: questionnaire.title,
        userId,
        username,
        answers: scoringResult.answers,
        submittedAt: responseData.submittedAt,
        score: scoringResult.score,
        totalQuestions: scoringResult.totalQuestions
      };

      // Save to both localStorage and Supabase
      await this.saveResponse(response);
      
      // Mark questionnaire as completed for guest users
      if (userId === 'anonymous') {
        this.markQuestionnaireCompleted(responseData.questionnaireId, username);
      }
      
      console.log('✅ Response submitted successfully with calculated score:', scoringResult.score);
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

  static calculateScore(userAnswers: Array<{questionId: string; selectedOptionIndex: number}>, questionnaire: any) {
    return ResponseScoring.calculateScore(userAnswers, questionnaire);
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
