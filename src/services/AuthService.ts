
interface User {
  username: string;
  role: 'admin' | 'guest';
  token: string;
}

class AuthServiceClass {
  private currentUser: User | null = null;
  
  private credentials = {
    admin: { username: 'admin', password: 'admin123', role: 'admin' as const }
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
    
    // Handle admin login - requires correct credentials
    if (role === 'admin') {
      const cred = this.credentials.admin;
      
      if (cred && cred.username === username && cred.password === password) {
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
