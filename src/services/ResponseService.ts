
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
  }>;
  submittedAt: string;
}

class ResponseServiceClass {
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

  getResponseStats(questionnaireId: string) {
    const responses = this.getResponsesByQuestionnaire(questionnaireId);
    const totalResponses = responses.length;
    
    if (totalResponses === 0) {
      return { totalResponses: 0, questionStats: [] };
    }

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
      questionStats
    };
  }

  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

export const ResponseService = new ResponseServiceClass();
