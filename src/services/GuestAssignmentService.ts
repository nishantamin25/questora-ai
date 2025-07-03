
class GuestAssignmentServiceClass {
  private guestUsername: string | null = null;

  setGuestUsername(username: string): void {
    this.guestUsername = username;
    // Store the actual guest username in localStorage so it persists
    localStorage.setItem('actualGuestUsername', username);
    console.log(`👤 Guest username set to: ${username}`);
  }

  getGuestUsername(): string | null {
    // First try to get from memory
    if (this.guestUsername) {
      return this.guestUsername;
    }
    
    // Then try to get from localStorage
    const storedUsername = localStorage.getItem('actualGuestUsername');
    if (storedUsername) {
      this.guestUsername = storedUsername;
      return storedUsername;
    }
    
    return null;
  }

  clearGuestUsername(): void {
    this.guestUsername = null;
    localStorage.removeItem('actualGuestUsername');
    console.log('🗑️ Guest username cleared');
  }

  // Check if a guest user is logged in
  isGuestLoggedIn(): boolean {
    return this.getGuestUsername() !== null;
  }
}

export const GuestAssignmentService = new GuestAssignmentServiceClass();
