
export class GuestFilterService {
  private static COMPLETED_QUESTIONNAIRES_KEY = 'guestCompletedQuestionnaires';

  static markQuestionnaireAsCompleted(questionnaireId: string, guestUsername: string): void {
    try {
      const completedData = this.getCompletedQuestionnaires();
      
      if (!completedData[guestUsername]) {
        completedData[guestUsername] = [];
      }
      
      if (!completedData[guestUsername].includes(questionnaireId)) {
        completedData[guestUsername].push(questionnaireId);
        localStorage.setItem(this.COMPLETED_QUESTIONNAIRES_KEY, JSON.stringify(completedData));
        console.log(`✅ Marked questionnaire ${questionnaireId} as completed for guest ${guestUsername}`);
      }
    } catch (error) {
      console.error('Error marking questionnaire as completed for guest:', error);
    }
  }

  static isQuestionnaireCompletedByGuest(questionnaireId: string, guestUsername: string): boolean {
    try {
      const completedData = this.getCompletedQuestionnaires();
      return completedData[guestUsername]?.includes(questionnaireId) || false;
    } catch (error) {
      console.error('Error checking if questionnaire is completed by guest:', error);
      return false;
    }
  }

  static filterCompletedQuestionnaires(questionnaires: any[], currentUser: any): any[] {
    if (!currentUser || currentUser.role !== 'guest') {
      return questionnaires;
    }

    const guestUsername = currentUser.username;
    return questionnaires.filter(questionnaire => 
      !this.isQuestionnaireCompletedByGuest(questionnaire.id, guestUsername)
    );
  }

  private static getCompletedQuestionnaires(): Record<string, string[]> {
    try {
      const stored = localStorage.getItem(this.COMPLETED_QUESTIONNAIRES_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Error reading completed questionnaires:', error);
      return {};
    }
  }

  static clearCompletedForGuest(guestUsername: string): void {
    try {
      const completedData = this.getCompletedQuestionnaires();
      delete completedData[guestUsername];
      localStorage.setItem(this.COMPLETED_QUESTIONNAIRES_KEY, JSON.stringify(completedData));
      console.log(`🧹 Cleared completed questionnaires for guest ${guestUsername}`);
    } catch (error) {
      console.error('Error clearing completed questionnaires for guest:', error);
    }
  }
}
