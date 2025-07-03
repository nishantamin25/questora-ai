
interface User {
  username: string;
  role: 'admin' | 'guest';
  token: string;
}

class AuthServiceClass {
  private currentUser: User | null = null;
  
  private credentials = {
    salman: { username: 'salman', password: 'salman786', role: 'admin' as const },
    nishant: { username: 'nishant', password: 'nishant25', role: 'admin' as const }
  };

  async login(username: string, password: string, role: string): Promise<User | null> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Handle guest login - any name is allowed
    if (role === 'guest') {
      if (!username.trim()) {
        return null; // Username is required
      }
      
      const user: User = {
        username: username.trim(),
        role: 'guest',
        token: this.generateToken()
      };
      
      this.currentUser = user;
      localStorage.setItem('currentUser', JSON.stringify(user));
      return user;
    }
    
    // Handle admin login - requires correct credentials (case insensitive username)
    if (role === 'admin') {
      const normalizedUsername = username.toLowerCase();
      const cred = Object.values(this.credentials).find(
        c => c.username === normalizedUsername && c.password === password
      );
      
      if (cred) {
        const user: User = {
          username: cred.username,
          role: cred.role,
          token: this.generateToken()
        };
        
        this.currentUser = user;
        localStorage.setItem('currentUser', JSON.stringify(user));
        return user;
      }
    }
    
    return null;
  }

  logout(): void {
    this.currentUser = null;
    localStorage.removeItem('currentUser');
  }

  signOut(): void {
    this.logout();
  }

  getCurrentUser(): User | null {
    if (this.currentUser) {
      return this.currentUser;
    }
    
    const stored = localStorage.getItem('currentUser');
    if (stored) {
      this.currentUser = JSON.parse(stored);
      return this.currentUser;
    }
    
    return null;
  }

  private generateToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }
}

export const AuthService = new AuthServiceClass();
