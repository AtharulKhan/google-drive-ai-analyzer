// Global type definitions
interface Window {
  google: typeof google;
  gapi: {
    load: (apiName: string, callback: () => void) => void;
  };
}
