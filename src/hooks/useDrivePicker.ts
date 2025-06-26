
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

// Types for Google Picker API
interface GooglePickerDoc {
  id: string;
  name: string;
  mimeType: string;
  iconUrl?: string;
  description?: string;
  parentId?: string;
  modifiedTime?: number;
}

interface GooglePickerResponse {
  action: string;
  docs: GooglePickerDoc[];
  viewToken?: string;
}

// Define the file types we want to support
export type GoogleFileType =
  | "document"
  | "spreadsheet"
  | "presentation"
  | "pdf"
  | "folder";

export interface GoogleFile {
  id: string;
  name: string;
  mimeType: string;
  iconUrl?: string;
  description?: string;
  parentId?: string;
  modifiedTime?: number;
}

interface UseDrivePickerOptions {
  accessToken: string | null;
}

interface PickerOptions {
  multiple?: boolean;
}

export function useDrivePicker({ accessToken }: UseDrivePickerOptions) {
  const [pickerApiLoaded, setPickerApiLoaded] = useState<boolean>(false);
  const [pickerInitialized, setPickerInitialized] = useState<boolean>(false);

  // Load the Google Picker API
  useEffect(() => {
    if (!window.google || pickerApiLoaded) return;

    // Create script element to load the Google Picker API
    const script = document.createElement("script");
    script.src = "https://apis.google.com/js/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.gapi.load("picker", () => {
        setPickerApiLoaded(true);
      }, (error: any) => {
        console.error("Failed to load Google Picker API:", error);
        toast.error("Failed to load Google Picker API");
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
    } else if (!accessToken && pickerInitialized) {
      // Reset when token becomes unavailable
      setPickerInitialized(false);
    }
  }, [accessToken, pickerApiLoaded, pickerInitialized]);

  // Open the Google Drive Picker
  const openPicker = useCallback(
    (
      { multiple = true }: PickerOptions = {},
      callback: (files: GoogleFile[]) => void
    ) => {
      if (!pickerInitialized || !accessToken) {
        if (!accessToken) {
          toast.error("Please sign in to access Google Drive");
        } else {
          toast.error("Google Picker API not initialized");
        }
        return;
      }

      try {
        // Define the supported MIME types for documents
        const supportedMimeTypes = [
          "application/vnd.google-apps.document",
          "application/vnd.google-apps.spreadsheet",
          "application/vnd.google-apps.presentation",
          "application/pdf",
        ].join(",");

        // Create a view that shows documents with supported mime types
        const docsView = new window.google.picker.DocsView()
          .setMimeTypes(supportedMimeTypes)
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false); // Don't allow selecting folders, only navigate into them

        // Create a folder view for easier folder navigation
        const folderView = new window.google.picker.DocsView(
          window.google.picker.ViewId.FOLDERS
        )
          .setIncludeFolders(true)
          .setSelectFolderEnabled(false);

        // Create a "My Drive" view as the starting point
        const myDriveView = new window.google.picker.DocsView();

        // Build and display the picker
        const picker = new window.google.picker.PickerBuilder()
          .addView(folderView)
          .addView(myDriveView)
          .addView(docsView)
          .setOAuthToken(accessToken)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setTitle("Select Files from Google Drive")
          .setCallback((data: GooglePickerResponse) => {
            if (data.action === window.google.picker.Action.PICKED) {
              // Filter out any folders from the selection - we only want files
              const files = data.docs
                .filter(
                  (doc) => doc.mimeType !== "application/vnd.google-apps.folder"
                )
                .map((doc) => ({
                  id: doc.id,
                  name: doc.name,
                  mimeType: doc.mimeType,
                  iconUrl: doc.iconUrl,
                  description: doc.description,
                  parentId: doc.parentId,
                }));

              if (files.length > 0) {
                callback(files);
              } else {
                toast.info(
                  "No files were selected. Please select one or more documents, spreadsheets, presentations, or PDFs."
                );
              }
            }
          })
          .build();

        picker.setVisible(true);
      } catch (error) {
        console.error("Error opening Google Drive Picker:", error);
        toast.error("Failed to open Google Drive Picker");
      }
    },
    [pickerInitialized, accessToken]
  );

  // Check if the picker is ready to use
  const isReady = pickerInitialized && !!accessToken;

  return {
    openPicker,
    isReady,
  };
}
