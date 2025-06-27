
import { supabase } from '@/integrations/supabase/client';
import { Questionnaire, Question } from '../questionnaire/QuestionnaireTypes';
import { Database } from '@/integrations/supabase/types';

export type DbQuestionnaire = Database['public']['Tables']['questionnaires']['Row'];
export type DbQuestion = Database['public']['Tables']['questions']['Row'];

export class SupabaseQuestionnaireService {
  static async saveQuestionnaire(questionnaire: Questionnaire): Promise<void> {
    try {
      console.log('💾 Saving questionnaire to Supabase:', questionnaire.id);
      
      // Save questionnaire metadata
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('questionnaires')
        .upsert({
          id: questionnaire.id,
          title: questionnaire.title,
          description: questionnaire.description,
          test_name: questionnaire.testName,
          difficulty: questionnaire.difficulty,
          number_of_questions: questionnaire.questions.length,
          timeframe: questionnaire.timeframe,
          include_course: questionnaire.course ? true : false,
          include_questionnaire: true,
          is_active: questionnaire.isActive,
          is_saved: questionnaire.isSaved,
          set_number: questionnaire.setNumber,
          total_sets: questionnaire.totalSets,
          language: questionnaire.language || 'en',
          created_by: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single();

      if (questionnaireError) {
        console.error('❌ Error saving questionnaire:', questionnaireError);
        throw questionnaireError;
      }

      // Delete existing questions for this questionnaire
      const { error: deleteError } = await supabase
        .from('questions')
        .delete()
        .eq('questionnaire_id', questionnaire.id);

      if (deleteError) {
        console.error('❌ Error deleting old questions:', deleteError);
        throw deleteError;
      }

      // Save questions
      if (questionnaire.questions && questionnaire.questions.length > 0) {
        const questionsToInsert = questionnaire.questions.map(question => ({
          id: question.id,
          questionnaire_id: questionnaire.id,
          text: question.text,
          type: question.type as 'multiple-choice' | 'text' | 'boolean',
          options: question.options || [],
          correct_answer: question.correctAnswer,
          explanation: question.explanation
        }));

        const { error: questionsError } = await supabase
          .from('questions')
          .insert(questionsToInsert);

        if (questionsError) {
          console.error('❌ Error saving questions:', questionsError);
          throw questionsError;
        }
      }

      console.log('✅ Questionnaire saved to Supabase successfully:', questionnaire.id);
    } catch (error) {
      console.error('❌ Failed to save questionnaire to Supabase:', error);
      throw error;
    }
  }

  static async getQuestionnaire(id: string): Promise<Questionnaire | null> {
    try {
      const { data: questionnaireData, error: questionnaireError } = await supabase
        .from('questionnaires')
        .select('*')
        .eq('id', id)
        .single();

      if (questionnaireError || !questionnaireData) {
        console.log('❌ Questionnaire not found in Supabase:', id);
        return null;
      }

      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('questionnaire_id', id)
        .order('created_at');

      if (questionsError) {
        console.error('❌ Error loading questions:', questionsError);
        throw questionsError;
      }

      // Transform database data to application format
      const questions: Question[] = (questionsData || []).map(q => ({
        id: q.id,
        text: q.text,
        type: q.type as 'multiple-choice' | 'text' | 'boolean',
        options: Array.isArray(q.options) ? q.options as string[] : [],
        correctAnswer: q.correct_answer || 0,
        explanation: q.explanation || ''
      }));

      const questionnaire: Questionnaire = {
        id: questionnaireData.id,
        title: questionnaireData.title,
        description: questionnaireData.description || '',
        testName: questionnaireData.test_name,
        difficulty: questionnaireData.difficulty as 'easy' | 'medium' | 'hard',
        timeframe: questionnaireData.timeframe,
        questions: questions,
        createdAt: questionnaireData.created_at || new Date().toISOString(),
        isActive: questionnaireData.is_active || false,
        isSaved: questionnaireData.is_saved || false,
        setNumber: questionnaireData.set_number,
        totalSets: questionnaireData.total_sets,
        language: questionnaireData.language || 'en'
      };

      console.log('✅ Questionnaire loaded from Supabase:', questionnaire.id);
      return questionnaire;
    } catch (error) {
      console.error('❌ Failed to load questionnaire from Supabase:', error);
      return null;
    }
  }

  static async getAllQuestionnaires(): Promise<Questionnaire[]> {
    try {
      const { data: questionnairesData, error } = await supabase
        .from('questionnaires')
        .select(`
          *,
          questions (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error loading questionnaires:', error);
        throw error;
      }

      const questionnaires: Questionnaire[] = questionnairesData.map(q => {
        const questions: Question[] = (q.questions || []).map((question: any) => ({
          id: question.id,
          text: question.text,
          type: question.type as 'multiple-choice' | 'text' | 'boolean',
          options: Array.isArray(question.options) ? question.options as string[] : [],
          correctAnswer: question.correct_answer || 0,
          explanation: question.explanation || ''
        }));

        return {
          id: q.id,
          title: q.title,
          description: q.description || '',
          testName: q.test_name,
          difficulty: q.difficulty as 'easy' | 'medium' | 'hard',
          timeframe: q.timeframe,
          questions: questions,
          createdAt: q.created_at || new Date().toISOString(),
          isActive: q.is_active || false,
          isSaved: q.is_saved || false,
          setNumber: q.set_number,
          totalSets: q.total_sets,
          language: q.language || 'en'
        };
      });

      console.log('✅ Loaded questionnaires from Supabase:', questionnaires.length);
      return questionnaires;
    } catch (error) {
      console.error('❌ Failed to load questionnaires from Supabase:', error);
      return [];
    }
  }

  static async deleteQuestionnaire(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('questionnaires')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('❌ Error deleting questionnaire:', error);
        throw error;
      }

      console.log('✅ Questionnaire deleted from Supabase:', id);
    } catch (error) {
      console.error('❌ Failed to delete questionnaire from Supabase:', error);
      throw error;
    }
  }
}
