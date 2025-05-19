// Type definitions for Google APIs used in the application

interface Window {
  google: typeof google;
  gapi: any;
}

declare namespace google {
  namespace accounts {
    namespace oauth2 {
      interface TokenResponse {
        access_token: string;
        error?: string;
      }

      interface TokenClientConfig {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
      }

      function initTokenClient(config: TokenClientConfig): {
        requestAccessToken: (options?: any) => void;
      };

      function revoke(token: string, callback?: () => void): void;
    }
  }

  namespace picker {
    enum Action {
      CANCEL = "cancel",
      PICKED = "picked",
    }

    enum Feature {
      NAV_HIDDEN = "navHidden",
      MULTISELECT_ENABLED = "multiselectEnabled",
    }

    enum ViewId {
      DOCS = "docs",
      FOLDERS = "folders",
    }

    class DocsView {
      constructor(viewId?: ViewId);
      setIncludeFolders(include: boolean): DocsView;
      setSelectFolderEnabled(enabled: boolean): DocsView;
      setMimeTypes(mimeTypes: string): DocsView;
    }

    class PickerBuilder {
      addView(view: DocsView): PickerBuilder;
      setOAuthToken(token: string): PickerBuilder;
      enableFeature(feature: Feature): PickerBuilder;
      setCallback(callback: (data: any) => void): PickerBuilder;
      setTitle(title: string): PickerBuilder;
      build(): any;
      setVisible(visible: boolean): void;
    }
  }

  function load(apiName: string, version: string, callback?: () => void): void;
}
