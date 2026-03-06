// Google Analytics / Google Tag Manager types
declare global {
  interface Window {
    dataLayer: any[];
  }

  function gtag(...args: any[]): void;
}

export {};
