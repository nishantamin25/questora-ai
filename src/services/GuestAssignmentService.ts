
import { SupabaseGuestAssignmentService } from './supabase/SupabaseGuestAssignmentService';

class GuestAssignmentServiceClass {
  async getGuestSetNumber(guestName: string, testId: string, totalSets: number): Promise<number> {
    return SupabaseGuestAssignmentService.getGuestSetNumber(guestName, testId, totalSets);
  }

  async cleanupOldAssignments(): Promise<void> {
    return SupabaseGuestAssignmentService.cleanupOldAssignments();
  }
}

export const GuestAssignmentService = new GuestAssignmentServiceClass();
