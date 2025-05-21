
import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { listFolderContents } from "@/utils/google-api";

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
  selectFolders?: boolean;
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

  // Open the Google Drive Picker for files
  const openPicker = useCallback(
    (
      { multiple = true, selectFolders = false }: PickerOptions = {},
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
          .setSelectFolderEnabled(false); // Don't allow selecting folders in this view

        // Create a dedicated folder view for selecting folders
        const folderView = new window.google.picker.DocsView(
          window.google.picker.ViewId.FOLDERS
        )
          .setIncludeFolders(true)
          .setSelectFolderEnabled(true); // Always enable folder selection in folder view

        // Create a "My Drive" view as the starting point
        const myDriveView = new window.google.picker.DocsView();

        // Build and display the picker
        const picker = new window.google.picker.PickerBuilder()
          .setOAuthToken(accessToken)
          .enableFeature(window.google.picker.Feature.MULTISELECT_ENABLED)
          .setTitle(selectFolders ? "Select a Folder" : "Select Files from Google Drive");
          
        // If selecting folders, only show the folder view and My Drive
        if (selectFolders) {
          picker.addView(folderView);
          picker.addView(myDriveView);
        } else {
          // If selecting files, show all views
          picker.addView(myDriveView);
          picker.addView(docsView);
          picker.addView(folderView);
        }
        
        picker.setCallback((data: GooglePickerResponse) => {
          if (data.action === window.google.picker.Action.PICKED) {
            if (selectFolders) {
              // Handle folder selection
              const folders = data.docs.filter(
                (doc) => doc.mimeType === "application/vnd.google-apps.folder"
              );
              
              if (folders.length > 0) {
                const folder = folders[0]; // Select the first folder if multiple were somehow selected
                toast.info(`Selected folder: ${folder.name} (${folder.id})`);
                
                // Convert to our GoogleFile format
                const folderFile: GoogleFile = {
                  id: folder.id,
                  name: folder.name,
                  mimeType: folder.mimeType,
                  iconUrl: folder.iconUrl,
                  description: folder.description,
                  parentId: folder.parentId,
                };
                
                callback([folderFile]);
              } else {
                toast.info("No folder was selected. Please select a folder.");
              }
            } else {
              // Filter out any folders from the selection - we only want files when not in folder selection mode
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
  
  // Function to specifically open a folder picker
  const openFolderPicker = useCallback(
    (callback: (folder: GoogleFile) => void) => {
      openPicker({ multiple: false, selectFolders: true }, (files) => {
        if (files.length > 0 && files[0].mimeType === "application/vnd.google-apps.folder") {
          callback(files[0]);
        }
      });
    },
    [openPicker]
  );
  
  // Function to list files in a folder
  const listFilesInFolder = useCallback(
    async (folderId: string, includeSubfolders: boolean = false, maxFiles: number = 20) => {
      if (!accessToken) {
        toast.error("Please sign in to access Google Drive");
        return [];
      }
      
      try {
        console.log(`Requesting files from folder ID: ${folderId}`);
        console.log(`Include subfolders: ${includeSubfolders}, Max files: ${maxFiles}`);
        
        const files = await listFolderContents(folderId, accessToken, includeSubfolders, maxFiles);
        console.log(`Retrieved ${files.length} files from folder`);
        
        // Filter to only the supported file types
        const supportedFiles = files.filter(file => 
          file.mimeType === "application/vnd.google-apps.document" ||
          file.mimeType === "application/vnd.google-apps.spreadsheet" ||
          file.mimeType === "application/vnd.google-apps.presentation" ||
          file.mimeType === "application/pdf"
        );
        
        console.log(`After filtering, ${supportedFiles.length} supported files found`);
        
        // Limit to max number of files and return
        return supportedFiles.slice(0, maxFiles);
      } catch (error) {
        console.error("Error listing folder contents:", error);
        toast.error(`Failed to list folder contents: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return [];
      }
    },
    [accessToken]
  );

  // Check if the picker is ready to use
  const isReady = pickerInitialized && !!accessToken;

  return {
    openPicker,
    openFolderPicker,
    listFilesInFolder,
    isReady,
  };
}
