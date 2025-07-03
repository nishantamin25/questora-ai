
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from "@/components/ui/use-toast"
import { GuestAssignmentService } from '@/services/GuestAssignmentService';

interface LoginPageProps {
  onLogin: (userData: any) => void;
}

const LoginPage = ({ onLogin }: LoginPageProps) => {
  const [guestUsername, setGuestUsername] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleGuestLogin = async () => {
    if (!guestUsername.trim()) {
      setError('Please enter a username');
      return;
    }

    try {
      setIsLoading(true);
      
      // Store the actual guest username using the service
      GuestAssignmentService.setGuestUsername(guestUsername.trim());
      
      // Also store in session for immediate use
      sessionStorage.setItem('currentGuestUsername', guestUsername.trim());
      
      console.log('🎯 Guest login successful:', guestUsername.trim());
      
      // Call the onLogin callback with user data
      onLogin({
        username: guestUsername.trim(),
        role: 'guest'
      });
      
    } catch (error) {
      console.error('Guest login failed:', error);
      setError('Login failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-gray-100">
      <Card className="w-full max-w-md bg-white shadow-md rounded-lg">
        <CardHeader className="flex flex-col items-center">
          <CardTitle className="text-2xl font-bold text-gray-800">Guest Login</CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          {error && <div className="text-red-500 mb-4">{error}</div>}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-gray-700">Username</Label>
              <Input
                id="username"
                placeholder="Enter your username"
                value={guestUsername}
                onChange={(e) => setGuestUsername(e.target.value)}
                className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <Button
              className="w-full bg-blue-500 text-white hover:bg-blue-700 focus:ring-blue-500"
              onClick={handleGuestLogin}
              disabled={isLoading}
            >
              {isLoading ? 'Logging in...' : 'Login as Guest'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LoginPage;
