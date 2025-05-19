
// Global type definitions for the application

// Google API type definitions
interface Window {
  google?: {
    accounts: {
      oauth2: {
        initTokenClient: (config: any) => {
          requestAccessToken: (options?: any) => void;
        };
        revoke: (token: string, callback?: () => void) => void;
      };
    };
    picker?: {
      PickerBuilder: any;
      View: any;
      ViewId: {
        DOCS: string;
        FOLDERS: string;
        DOCS_IMAGES: string;
      };
      Action: {
        PICKED: string;
        CANCEL: string;
      };
      Feature: {
        NAV_HIDDEN: string;
        MULTISELECT_ENABLED: string;
      };
    };
  };
  gapi?: {
    load: (api: string, version: string, callback: () => void) => void;
    client?: {
      init: (options: any) => Promise<void>;
      drive?: {
        files?: {
          list: (options: any) => Promise<any>;
          get: (options: any) => Promise<any>;
        };
      };
    };
  };
}
