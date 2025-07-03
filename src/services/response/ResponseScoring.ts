
import { Question } from '../questionnaire/QuestionnaireTypes';

export interface ScoringResult {
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    questionText: string;
    selectedOption: string;
    selectedOptionIndex: number;
    isCorrect: boolean;
    correctAnswer: string;
    correctAnswerIndex: number;
  }>;
}

export class ResponseScoring {
  static calculateScore(
    userAnswers: Array<{questionId: string; selectedOptionIndex: number}>, 
    questionnaire: any
  ): ScoringResult {
    console.log('🎯 Calculating score with admin-selected correct answers');
    
    let correctCount = 0;
    const detailedAnswers = userAnswers.map(userAnswer => {
      const question = questionnaire.questions.find((q: any) => q.id === userAnswer.questionId);
      
      if (!question) {
        console.warn(`Question not found: ${userAnswer.questionId}`);
        return {
          questionId: userAnswer.questionId,
          questionText: 'Question not found',
          selectedOption: 'Unknown',
          selectedOptionIndex: userAnswer.selectedOptionIndex,
          isCorrect: false,
          correctAnswer: 'Unknown',
          correctAnswerIndex: 0
        };
      }

      // Use admin-selected correct answer (this is the definitive answer key)
      const adminCorrectAnswer = question.correctAnswer ?? 0;
      const isCorrect = userAnswer.selectedOptionIndex === adminCorrectAnswer;
      
      if (isCorrect) {
        correctCount++;
      }

      const selectedOption = question.options?.[userAnswer.selectedOptionIndex] || 'Unknown';
      const correctOption = question.options?.[adminCorrectAnswer] || 'Unknown';

      console.log(`Question: ${question.text.substring(0, 50)}...`);
      console.log(`  User selected: ${String.fromCharCode(65 + userAnswer.selectedOptionIndex)} (${selectedOption})`);
      console.log(`  Admin correct answer: ${String.fromCharCode(65 + adminCorrectAnswer)} (${correctOption})`);
      console.log(`  Result: ${isCorrect ? '✅ Correct' : '❌ Incorrect'}`);

      return {
        questionId: userAnswer.questionId,
        questionText: question.text,
        selectedOption,
        selectedOptionIndex: userAnswer.selectedOptionIndex,
        isCorrect,
        correctAnswer: correctOption,
        correctAnswerIndex: adminCorrectAnswer
      };
    });

    const score = questionnaire.questions.length > 0 
      ? Math.round((correctCount / questionnaire.questions.length) * 100)
      : 0;

    console.log(`📊 Final Score: ${correctCount}/${questionnaire.questions.length} = ${score}%`);

    return {
      score,
      totalQuestions: questionnaire.questions.length,
      answers: detailedAnswers
    };
  }
}
