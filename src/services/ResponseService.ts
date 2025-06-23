
interface QuestionnaireResponse {
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

interface SubmitResponseData {
  questionnaireId: string;
  responses: Record<string, string>;
  submittedAt: string;
}

class ResponseServiceClass {
  async submitResponse(responseData: SubmitResponseData): Promise<void> {
    // Convert the response data to our internal format
    const response: QuestionnaireResponse = {
      id: this.generateId(),
      questionnaireId: responseData.questionnaireId,
      questionnaireTitle: 'Questionnaire', // This could be enhanced to get actual title
      userId: 'anonymous', // This could be enhanced with actual user data
      username: 'Anonymous User',
      answers: Object.entries(responseData.responses).map(([questionId, selectedOption]) => ({
        questionId,
        questionText: '', // This could be enhanced to get actual question text
        selectedOption,
        selectedOptionIndex: 0, // This could be enhanced to get actual index
        isCorrect: undefined
      })),
      submittedAt: responseData.submittedAt
    };

    this.saveResponse(response);
  }

  saveResponse(response: QuestionnaireResponse): void {
    const existingResponses = this.getAllResponses();
    existingResponses.unshift(response);
    localStorage.setItem('questionnaireResponses', JSON.stringify(existingResponses));
  }

  getAllResponses(): QuestionnaireResponse[] {
    const stored = localStorage.getItem('questionnaireResponses');
    if (stored) {
      return JSON.parse(stored);
    }
    return [];
  }

  getResponsesByQuestionnaire(questionnaireId: string): QuestionnaireResponse[] {
    const allResponses = this.getAllResponses();
    return allResponses.filter(response => response.questionnaireId === questionnaireId);
  }

  calculateScore(userAnswers: Array<{questionId: string; selectedOptionIndex: number}>, questionnaire: any): { score: number; totalQuestions: number; answers: Array<any> } {
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

  getResponseStats(questionnaireId: string) {
    const responses = this.getResponsesByQuestionnaire(questionnaireId);
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

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const ResponseService = new ResponseServiceClass();
