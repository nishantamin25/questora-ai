
import { supabase } from '@/integrations/supabase/client';

interface GuestAssignment {
  guestName: string;
  testId: string;
  setNumber: number;
  assignedAt: string;
}

export class SupabaseGuestAssignmentService {
  static async getGuestSetNumber(guestName: string, testId: string, totalSets: number): Promise<number> {
    try {
      // For now, we'll use localStorage as the guest_assignments table doesn't exist in schema
      // In a real implementation, you would create a guest_assignments table
      const assignments = this.getAssignmentsFromLocalStorage();
      
      // Check if this guest already has an assignment for this test
      const existingAssignment = assignments.find(
        a => a.guestName === guestName && a.testId === testId
      );
      
      if (existingAssignment) {
        return existingAssignment.setNumber;
      }

      // Find the next available set number for this test
      const testAssignments = assignments.filter(a => a.testId === testId);
      const usedSets = testAssignments.map(a => a.setNumber);
      
      let nextSetNumber = 1;
      for (let i = 1; i <= totalSets; i++) {
        if (!usedSets.includes(i)) {
          nextSetNumber = i;
          break;
        }
      }
      
      // If all sets are assigned, cycle back to set 1
      if (usedSets.length >= totalSets) {
        nextSetNumber = (testAssignments.length % totalSets) + 1;
      }

      // Create new assignment
      const newAssignment: GuestAssignment = {
        guestName,
        testId,
        setNumber: nextSetNumber,
        assignedAt: new Date().toISOString()
      };

      assignments.push(newAssignment);
      this.saveAssignmentsToLocalStorage(assignments);

      return nextSetNumber;
    } catch (error) {
      console.error('❌ Failed to get guest set number:', error);
      return 1; // Default to set 1 if there's an error
    }
  }

  static async cleanupOldAssignments(): Promise<void> {
    try {
      // For now, we'll use localStorage cleanup
      // In a real implementation, you would clean up a guest_assignments table
      const assignments = this.getAssignmentsFromLocalStorage();
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentAssignments = assignments.filter(
        a => new Date(a.assignedAt) > thirtyDaysAgo
      );

      this.saveAssignmentsToLocalStorage(recentAssignments);
      console.log('✅ Cleaned up old guest assignments');
    } catch (error) {
      console.error('❌ Failed to cleanup old assignments:', error);
    }
  }

  private static getAssignmentsFromLocalStorage(): GuestAssignment[] {
    try {
      const stored = localStorage.getItem('guestAssignments');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading guest assignments:', error);
      return [];
    }
  }

  private static saveAssignmentsToLocalStorage(assignments: GuestAssignment[]): void {
    try {
      localStorage.setItem('guestAssignments', JSON.stringify(assignments));
    } catch (error) {
      console.error('Error saving guest assignments:', error);
    }
  }
}
