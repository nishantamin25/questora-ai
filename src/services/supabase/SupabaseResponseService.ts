
import { supabase } from '@/integrations/supabase/client';
import { Database } from '@/integrations/supabase/types';

export type DbResponse = Database['public']['Tables']['responses']['Row'];

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

export class SupabaseResponseService {
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
      console.log('💾 Saving response to Supabase:', response.id);
      
      const { error } = await supabase
        .from('responses')
        .insert({
          id: response.id,
          questionnaire_id: response.questionnaireId,
          user_id: response.userId,
          username: response.username,
          answers: response.answers,
          score: response.score,
          total_questions: response.totalQuestions,
          submitted_at: response.submittedAt
        });

      if (error) {
        console.error('❌ Error saving response:', error);
        throw error;
      }

      console.log('✅ Response saved to Supabase successfully:', response.id);
    } catch (error) {
      console.error('❌ Failed to save response to Supabase:', error);
      throw error;
    }
  }

  static async getAllResponses(): Promise<QuestionnaireResponse[]> {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading responses:', error);
        throw error;
      }

      const responses: QuestionnaireResponse[] = (data || []).map(r => ({
        id: r.id,
        questionnaireId: r.questionnaire_id || '',
        questionnaireTitle: 'Questionnaire',
        userId: r.user_id || '',
        username: r.username,
        answers: Array.isArray(r.answers) ? r.answers as any[] : [],
        submittedAt: r.submitted_at || new Date().toISOString(),
        score: r.score || undefined,
        totalQuestions: r.total_questions || undefined
      }));

      console.log('✅ Loaded responses from Supabase:', responses.length);
      return responses;
    } catch (error) {
      console.error('❌ Failed to load responses from Supabase:', error);
      return [];
    }
  }

  static async getResponsesByQuestionnaire(questionnaireId: string): Promise<QuestionnaireResponse[]> {
    try {
      const { data, error } = await supabase
        .from('responses')
        .select('*')
        .eq('questionnaire_id', questionnaireId)
        .order('submitted_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading responses for questionnaire:', error);
        throw error;
      }

      const responses: QuestionnaireResponse[] = (data || []).map(r => ({
        id: r.id,
        questionnaireId: r.questionnaire_id || '',
        questionnaireTitle: 'Questionnaire',
        userId: r.user_id || '',
        username: r.username,
        answers: Array.isArray(r.answers) ? r.answers as any[] : [],
        submittedAt: r.submitted_at || new Date().toISOString(),
        score: r.score || undefined,
        totalQuestions: r.total_questions || undefined
      }));

      console.log('✅ Loaded responses for questionnaire from Supabase:', questionnaireId, responses.length);
      return responses;
    } catch (error) {
      console.error('❌ Failed to load responses for questionnaire from Supabase:', error);
      return [];
    }
  }

  static async submitResponse(responseData: SubmitResponseData): Promise<void> {
    try {
      console.log('📤 Submitting response to Supabase:', responseData);
      
      // Get user info (authenticated user or guest)
      const { userId, username } = await this.getUserInfo();
      console.log('👤 User info for Supabase response:', { userId, username });
      
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

      await this.saveResponse(response);
      console.log('✅ Response submitted to Supabase with username:', username);
    } catch (error) {
      console.error('❌ Failed to submit response to Supabase:', error);
      throw error;
    }
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
