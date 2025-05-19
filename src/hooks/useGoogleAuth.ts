
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// List of required API scopes for accessing Drive files
const SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/documents.readonly',
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/presentations.readonly'
].join(' ');

export interface GoogleAuthState {
  isSignedIn: boolean;
  accessToken: string | null;
  loading: boolean;
  error: string | null;
  clientId: string;
}

export function useGoogleAuth() {
  // Get the client ID from localStorage or default to empty string
  const savedClientId = localStorage.getItem('googleClientId') || '';
  
  // Initialize auth state with stored values from localStorage if available
  const [authState, setAuthState] = useState<GoogleAuthState>({
    isSignedIn: localStorage.getItem('googleIsSignedIn') === 'true',
    accessToken: localStorage.getItem('googleAccessToken'),
    loading: false,
    error: null,
    clientId: savedClientId
  });

  // Function to set the client ID
  const setClientId = useCallback((newClientId: string) => {
    localStorage.setItem('googleClientId', newClientId);
    setAuthState(prev => ({ 
      ...prev, 
      clientId: newClientId,
      error: null
    }));
    // Reset auth state if client ID changes
    if (authState.isSignedIn && newClientId !== authState.clientId) {
      signOut();
    }
    toast.success("Google Client ID saved successfully");
  }, [authState.clientId, authState.isSignedIn]);

  // Initialize the Google API client
  const initializeGapi = useCallback(async () => {
    if (!authState.clientId) {
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Google Client ID is not set. Please add it in Settings.' 
      }));
      return;
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));
      
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

      // If we have an access token stored, check if it's still valid
      const storedToken = localStorage.getItem('googleAccessToken');
      if (storedToken) {
        // We can't directly check token validity without making an API call
        // The token will be used and if it fails, our error handling will clear it
        setAuthState(prev => ({ 
          ...prev, 
          loading: false, 
          isSignedIn: true,
          accessToken: storedToken
        }));
      } else {
        setAuthState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error initializing Google API client:', error);
      setAuthState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to initialize Google API client' 
      }));
    }
  }, [authState.clientId]);

  useEffect(() => {
    if (authState.clientId) {
      initializeGapi();
    }
  }, [initializeGapi, authState.clientId]);

  // Sign in with Google
  const signIn = useCallback(async () => {
    if (!window.google) {
      toast.error("Google API client not initialized");
      return;
    }
    
    if (!authState.clientId) {
      toast.error("Please set a Google Client ID in Settings first");
      return;
    }

    try {
      setAuthState(prev => ({ ...prev, loading: true, error: null }));

      const client = google.accounts.oauth2.initTokenClient({
        client_id: authState.clientId,
        scope: SCOPES,
        callback: (response: any) => {
          if (response.error) {
            setAuthState(prev => ({
              ...prev,
              isSignedIn: false,
              accessToken: null,
              loading: false,
              error: response.error
            }));
            // Clear storage in case of error
            localStorage.removeItem('googleIsSignedIn');
            localStorage.removeItem('googleAccessToken');
            toast.error(`Authentication failed: ${response.error}`);
            return;
          }

          // Store auth state in localStorage for persistence
          localStorage.setItem('googleIsSignedIn', 'true');
          localStorage.setItem('googleAccessToken', response.access_token);
          
          setAuthState(prev => ({
            ...prev,
            isSignedIn: true,
            accessToken: response.access_token,
            loading: false,
            error: null
          }));
          toast.success("Successfully signed in to Google");
        }
      });

      client.requestAccessToken();
    } catch (error) {
      console.error('Error signing in with Google:', error);
      setAuthState(prev => ({
        ...prev,
        isSignedIn: false,
        accessToken: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to sign in with Google'
      }));
      // Clear storage in case of error
      localStorage.removeItem('googleIsSignedIn');
      localStorage.removeItem('googleAccessToken');
      toast.error("Failed to sign in with Google");
    }
  }, [authState.clientId]);

  // Sign out
  const signOut = useCallback(() => {
    if (!window.google) {
      console.error('Google API client not initialized');
      return;
    }

    if (authState.accessToken) {
      google.accounts.oauth2.revoke(authState.accessToken, () => {
        // Clear storage
        localStorage.removeItem('googleIsSignedIn');
        localStorage.removeItem('googleAccessToken');
        
        setAuthState(prev => ({
          ...prev,
          isSignedIn: false,
          accessToken: null,
          loading: false,
          error: null
        }));
        toast.info("Signed out from Google");
      });
    }
  }, [authState.accessToken]);

  return {
    ...authState,
    signIn,
    signOut,
    setClientId
  };
}
