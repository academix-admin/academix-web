import { supabaseBrowser } from '@/lib/supabase/client';

export const refreshSessionIfNeeded = async (): Promise<boolean> => {
  try {
    const { data: { session } } = await supabaseBrowser.auth.getSession();
    
    if (!session) return false;

    const expiresAt = session.expires_at;
    if (!expiresAt) return true;

    const now = Math.floor(Date.now() / 1000);
    const timeUntilExpiry = expiresAt - now;
    const oneHour = 3600;

    // Refresh if less than 1 hour remaining
    if (timeUntilExpiry < oneHour) {
      const { data, error } = await supabaseBrowser.auth.refreshSession();
      if (error) {
        console.error('Session refresh failed:', error);
        return false;
      }
      return !!data.session;
    }

    return true;
  } catch (error) {
    console.error('Session check failed:', error);
    return false;
  }
};
