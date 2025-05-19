
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// List of required API scopes for accessing Drive files
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/presentations.readonly'
].join(' ');

// Google OAuth client ID (this should come from env variables in production)
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export interface GoogleAuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
}

export function useGoogleAuth() {
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isSignedIn: false,
    accessToken: null,
    loading: true,
    error: null
  });

  // Initialize the Google API client
  const initializeGapi = useCallback(async () => {
    if (!CLIENT_ID) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Google Client ID is not set in environment variables' 
      }));
      return;
    }

    try {
      // Load the required Google API libraries
      await new Promise<void>((resolve, reject) => {
        // Load Google's client library
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load Google API client'));
        document.body.appendChild(script);
      });

      // Initialize the Google API client
      await new Promise<void>((resolve) => {
        if (window.google) {
          resolve();
        } else {
          // If google object isn't available, check again in a moment
          const checkGoogleExists = setInterval(() => {
            if (window.google) {
              clearInterval(checkGoogleExists);
              resolve();
            }
          }, 100);
        }
      });

      setAuthState(prev => ({ ...prev, loading: false }));
    } catch (error) {
      console.error('Error initializing Google API client:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to initialize Google API client' 
      }));
    }
  }, []);

  useEffect(() => {
    initializeGapi();
  }, [initializeGapi]);

  // Sign in with Google
  const signIn = useCallback(async () => {
    if (!window.google || !CLIENT_ID) {
      toast.error("Google API client not initialized or Client ID missing");
      return;
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true }));

      const client = google.accounts.oauth2.initTokenClient({
        client_id: CLIENT_ID,
        scope: SCOPES,
        callback: (response) => {
          if (response.error) {
            setAuthState({
              isSignedIn: false,
              accessToken: null,
              loading: false,
              error: response.error
            });
            toast.error(`Authentication failed: ${response.error}`);
            return;
          }

          setAuthState({
            isSignedIn: true,
            accessToken: response.access_token,
            loading: false,
            error: null
          });
          toast.success("Successfully signed in to Google");
        }
      });

      client.requestAccessToken();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setAuthState({
        isSignedIn: false,
        accessToken: null,
        loading: false,
        error: 'Failed to sign in with Google'
      });
      toast.error("Failed to sign in with Google");
    }
  }, []);

  // Sign out
  const signOut = useCallback(() => {
    if (!window.google) {
      console.error('Google API client not initialized');
      return;
    }

    google.accounts.oauth2.revoke(authState.accessToken || '', () => {
      setAuthState({
        isSignedIn: false,
        accessToken: null,
        loading: false,
        error: null
      });
      toast.info("Signed out from Google");
    });
  }, [authState.accessToken]);

  return {
    ...authState,
    signIn,
    signOut
  };
}
