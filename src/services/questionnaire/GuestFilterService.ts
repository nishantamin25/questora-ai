
import { HybridResponseStorage } from '../response/HybridResponseStorage';
import { AuthService } from '../AuthService';

export class GuestFilterService {
  static async filterQuestionnairesForGuest(questionnaires: any[]): Promise<any[]> {
    const currentUser = AuthService.getCurrentUser();
    
    // If not a guest user, return all questionnaires
    if (!currentUser || currentUser.role !== 'guest') {
      return questionnaires;
    }
    
    const username = currentUser.username;
    
    // Filter out questionnaires that the guest has already completed
    const availableQuestionnaires = questionnaires.filter(questionnaire => {
      if (!questionnaire || !questionnaire.id) {
        return false;
      }
      
      // Check if this questionnaire has been completed by the current guest
      const isCompleted = HybridResponseStorage.isQuestionnaireCompletedByGuest(questionnaire.id, username);
      
      if (isCompleted) {
        console.log(`🚫 Filtering out completed questionnaire: ${questionnaire.title} for guest: ${username}`);
        return false;
      }
      
      return true;
    });
    
    console.log(`📋 Filtered questionnaires for guest ${username}: ${availableQuestionnaires.length}/${questionnaires.length} available`);
    
    return availableQuestionnaires;
  }
}
