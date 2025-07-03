
import { supabase } from '@/integrations/supabase/client';

export async function getUserInfo(): Promise<{ userId: string; username: string }> {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (!error && user) {
      const username = user.user_metadata?.username || user.email || 'Authenticated User';
      return { userId: user.id, username };
    }
  } catch (error) {
    console.log('Could not get authenticated user info:', error);
  }
  
  // For guests, check session storage first
  const currentGuestUsername = sessionStorage.getItem('currentGuestUsername');
  
  if (currentGuestUsername) {
    return {
      userId: 'anonymous',
      username: currentGuestUsername
    };
  }
  
  // Fallback to localStorage
  let guestUsername = localStorage.getItem('guestUsername');
  
  if (!guestUsername) {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[-:]/g, '').replace('T', '_');
    guestUsername = `Guest_${timestamp}`;
    localStorage.setItem('guestUsername', guestUsername);
  }
  
  return {
    userId: 'anonymous',
    username: guestUsername
  };
}
