
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';

// Define the file types we want to support
export type GoogleFileType = 'document' | 'spreadsheet' | 'presentation' | 'pdf' | 'folder';

export interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  iconUrl?: string;
  description?: string;
  parentId?: string;
}

interface UseDrivePickerOptions {
  accessToken: string | null;
}

interface PickerOptions {
  pickFolder?: boolean;
  multiple?: boolean;
}

export function useDrivePicker({ accessToken }: UseDrivePickerOptions) {
  const [pickerApiLoaded, setPickerApiLoaded] = useState<boolean>(false);
  const [pickerInitialized, setPickerInitialized] = useState<boolean>(false);

  // Load the Google Picker API
  useEffect(() => {
    if (!window.google || pickerApiLoaded) return;

    // Create script element to load the Google Picker API
    const script = document.createElement('script');
    script.src = 'https://apis.google.com/js/api.js';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load('picker', () => {
        setPickerApiLoaded(true);
      });
    };
    script.onerror = () => {
      toast.error("Failed to load Google Picker API");
    };
    document.body.appendChild(script);

    return () => {
      // Cleanup script if component is unmounted
      document.body.removeChild(script);
    };
  }, [pickerApiLoaded]);

  // Check if both the access token and Picker API are available
  useEffect(() => {
    if (accessToken && pickerApiLoaded && !pickerInitialized) {
      setPickerInitialized(true);
    }
  }, [accessToken, pickerApiLoaded, pickerInitialized]);

  // Open the Google Drive Picker
  const openPicker = useCallback(
    ({ pickFolder = false, multiple = true }: PickerOptions = {}, callback: (files: GoogleFile[]) => void) => {
      if (!pickerInitialized || !accessToken) {
        if (!accessToken) {
          toast.error("Please sign in to access Google Drive");
        } else {
          toast.error("Google Picker API not initialized");
        }
        return;
      }

      try {
        // Create the Picker view depending on what we want to pick (files or folder)
        let view;
        if (pickFolder) {
          view = new google.picker.DocsView(google.picker.ViewId.FOLDERS)
            .setIncludeFolders(true)
            .setSelectFolderEnabled(true);
        } else {
          view = new google.picker.DocsView()
            .setMimeTypes([
              'application/vnd.google-apps.document',
              'application/vnd.google-apps.spreadsheet',
              'application/vnd.google-apps.presentation',
              'application/pdf'
            ].join(','))
            .setIncludeFolders(false);
        }

        // Build and display the picker
        const picker = new google.picker.PickerBuilder()
          .addView(view)
          .setOAuthToken(accessToken)
          .enableFeature(google.picker.Feature.NAV_HIDDEN)
          .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
          .setCallback((data: any) => {
            if (data.action === google.picker.Action.PICKED) {
              const files = data.docs.map((doc: any) => ({
                id: doc.id,
                name: doc.name,
                mimeType: doc.mimeType,
                iconUrl: doc.iconUrl,
                description: doc.description,
                parentId: doc.parentId
              }));
              callback(files);
            }
          })
          .build();

        picker.setVisible(true);
      } catch (error) {
        console.error('Error opening Google Drive Picker:', error);
        toast.error("Failed to open Google Drive Picker");
      }
    },
    [pickerInitialized, accessToken]
  );

  return {
    openPicker,
    isReady: pickerInitialized
  };
}
