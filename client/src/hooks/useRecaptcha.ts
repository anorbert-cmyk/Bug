import { useCallback, useEffect, useState } from "react";

interface GrecaptchaInstance {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
}

declare global {
  interface Window {
    grecaptcha: GrecaptchaInstance | undefined;
  }
}

const RECAPTCHA_SITE_KEY = import.meta.env.VITE_RECAPTCHA_SITE_KEY as string | undefined;

/**
 * Hook for reCAPTCHA v3 integration
 * Loads the reCAPTCHA script and provides a function to execute verification
 */
export function useRecaptcha() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load reCAPTCHA script
  useEffect(() => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn("[reCAPTCHA] Site key not configured");
      return;
    }

    // Check if already loaded
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => setIsLoaded(true));
      return;
    }

    // Check if script is already in DOM
    const existingScript = document.querySelector('script[src*="recaptcha"]');
    if (existingScript) {
      const checkReady = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => setIsLoaded(true));
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
      return;
    }

    // Load script
    setIsLoading(true);
    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      const checkReady = () => {
        if (window.grecaptcha) {
          window.grecaptcha.ready(() => {
            setIsLoaded(true);
            setIsLoading(false);
          });
        } else {
          setTimeout(checkReady, 100);
        }
      };
      checkReady();
    };

    script.onerror = () => {
      console.error("[reCAPTCHA] Failed to load script");
      setIsLoading(false);
    };

    document.head.appendChild(script);

    return () => {
      // Don't remove script on unmount as it may be used by other components
    };
  }, []);

  /**
   * Execute reCAPTCHA verification and get token
   * @param action - Action name for this verification (e.g., "email_subscribe", "checkout")
   * @returns Promise with the reCAPTCHA token
   */
  const executeRecaptcha = useCallback(async (action: string): Promise<string | null> => {
    if (!RECAPTCHA_SITE_KEY) {
      console.warn("[reCAPTCHA] Site key not configured, skipping");
      return null;
    }

    if (!isLoaded || !window.grecaptcha) {
      console.warn("[reCAPTCHA] Not loaded yet");
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY, { action });
      return token;
    } catch (error) {
      console.error("[reCAPTCHA] Execute error:", error);
      return null;
    }
  }, [isLoaded]);

  return {
    isLoaded,
    isLoading,
    executeRecaptcha,
    isConfigured: !!RECAPTCHA_SITE_KEY,
  };
}
