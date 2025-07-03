
import { QuestionnaireResponse, SubmitResponseData } from '../ResponseService';
import { SupabaseResponseService } from '../supabase/SupabaseResponseService';
import { QuestionnaireService } from '../QuestionnaireService';

export class HybridResponseStorage {
  static async submitResponse(responseData: SubmitResponseData): Promise<void> {
    try {
      console.log('📤 Processing response submission:', responseData.questionnaireId);
      
      // Get questionnaire with admin-selected answers
      const questionnaire = await QuestionnaireService.getQuestionnaireById(responseData.questionnaireId);
      if (!questionnaire) {
        throw new Error('Questionnaire not found');
      }

      // Convert responses to the expected format
      const userAnswers = Object.entries(responseData.responses).map(([questionId, selectedOption]) => {
        const question = questionnaire.questions.find(q => q.id === questionId);
        const selectedOptionIndex = question?.options?.indexOf(selectedOption) ?? -1;
        
        return {
          questionId,
          selectedOptionIndex: selectedOptionIndex >= 0 ? selectedOptionIndex : 0
        };
      });

      // Calculate score using admin-selected answers
      const { score, totalQuestions, answers } = this.calculateScore(userAnswers, questionnaire);

      // Create response object
      const response: QuestionnaireResponse = {
        id: this.generateId(),
        questionnaireId: responseData.questionnaireId,
        questionnaireTitle: questionnaire.title,
        userId: 'anonymous',
        username: 'Anonymous User',
        answers: answers,
        submittedAt: responseData.submittedAt,
        score: score,
        totalQuestions: totalQuestions
      };

      // Save to Supabase
      await SupabaseResponseService.saveResponse(response);
      
      console.log('✅ Response submitted successfully with score:', score, '/', totalQuestions);
    } catch (error) {
      console.error('❌ Failed to submit response:', error);
      throw error;
    }
  }

  static async saveResponse(response: QuestionnaireResponse): Promise<void> {
    return SupabaseResponseService.saveResponse(response);
  }

  static async getAllResponses(): Promise<QuestionnaireResponse[]> {
    return SupabaseResponseService.getAllResponses();
  }

  static async getResponsesByQuestionnaire(questionnaireId: string): Promise<QuestionnaireResponse[]> {
    return SupabaseResponseService.getResponsesByQuestionnaire(questionnaireId);
  }

  static calculateScore(
    userAnswers: Array<{questionId: string; selectedOptionIndex: number}>, 
    questionnaire: any
  ): { score: number; totalQuestions: number; answers: Array<any> } {
    console.log('🔢 Calculating score with admin-selected answers');
    
    let score = 0;
    const totalQuestions = userAnswers.length;
    
    const answers = userAnswers.map(userAnswer => {
      const question = questionnaire.questions.find((q: any) => q.id === userAnswer.questionId);
      if (!question) {
        console.warn('Question not found:', userAnswer.questionId);
        return {
          questionId: userAnswer.questionId,
          questionText: 'Question not found',
          selectedOption: 'Unknown',
          selectedOptionIndex: userAnswer.selectedOptionIndex,
          isCorrect: false
        };
      }

      const selectedOption = question.options?.[userAnswer.selectedOptionIndex] || 'Unknown';
      
      // Use admin-selected answer for comparison
      const adminSelectedAnswer = (question as any).adminSelectedAnswer ?? question.correctAnswer ?? 0;
      const isCorrect = userAnswer.selectedOptionIndex === adminSelectedAnswer;
      
      if (isCorrect) {
        score++;
      }

      console.log(`Question ${question.text}: User selected ${userAnswer.selectedOptionIndex}, Admin selected ${adminSelectedAnswer}, Correct: ${isCorrect}`);

      return {
        questionId: userAnswer.questionId,
        questionText: question.text,
        selectedOption: selectedOption,
        selectedOptionIndex: userAnswer.selectedOptionIndex,
        isCorrect: isCorrect
      };
    });

    console.log(`✅ Final Score: ${score}/${totalQuestions}`);
    
    return { score, totalQuestions, answers };
  }

  static async getResponseStats(questionnaireId: string) {
    try {
      const responses = await this.getResponsesByQuestionnaire(questionnaireId);
      
      if (responses.length === 0) {
        return {
          totalResponses: 0,
          averageScore: 0,
          questionStats: []
        };
      }

      const totalResponses = responses.length;
      const totalScore = responses.reduce((sum, response) => sum + (response.score || 0), 0);
      const averageScore = totalScore / totalResponses;

      // Get questionnaire to build question stats
      const questionnaire = await QuestionnaireService.getQuestionnaireById(questionnaireId);
      const questionStats = questionnaire?.questions.map(question => {
        const questionResponses = responses.map(r => 
          r.answers.find(a => a.questionId === question.id)
        ).filter(Boolean);

        const optionCounts: { [key: string]: number } = {};
        questionResponses.forEach(answer => {
          if (answer && answer.selectedOption) {
            optionCounts[answer.selectedOption] = (optionCounts[answer.selectedOption] || 0) + 1;
          }
        });

        return {
          questionId: question.id,
          questionText: question.text,
          totalAnswers: questionResponses.length,
          optionCounts
        };
      }) || [];

      return {
        totalResponses,
        averageScore,
        questionStats
      };
    } catch (error) {
      console.error('❌ Failed to get response stats:', error);
      return {
        totalResponses: 0,
        averageScore: 0,
        questionStats: []
      };
    }
  }

  private static generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
