
interface GuestAssignment {
  guestName: string;
  testId: string;
  setNumber: number;
  assignedAt: string;
}

class GuestAssignmentServiceClass {
  private storageKey = 'guestAssignments';

  private getAssignments(): GuestAssignment[] {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Error reading guest assignments:', error);
      return [];
    }
  }

  private saveAssignments(assignments: GuestAssignment[]): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(assignments));
    } catch (error) {
      console.error('Error saving guest assignments:', error);
    }
  }

  getGuestSetNumber(guestName: string, testId: string, totalSets: number): number {
    const assignments = this.getAssignments();
    
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
    this.saveAssignments(assignments);

    return nextSetNumber;
  }

  // Clean up old assignments (optional, for storage management)
  cleanupOldAssignments(): void {
    const assignments = this.getAssignments();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentAssignments = assignments.filter(
      a => new Date(a.assignedAt) > thirtyDaysAgo
    );

    this.saveAssignments(recentAssignments);
  }
}

export const GuestAssignmentService = new GuestAssignmentServiceClass();
