"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      getResponse?: (id: string) => string;
      remove: (id: string) => void;
    };
  }
}

export type TurnstileHandle = {
  reset: () => void;
};

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string) => void;
};

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { siteKey, onToken },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const clearToken = useCallback(() => {
    onToken("");
  }, [onToken]);

  const renderWidget = useCallback(() => {
    const element = containerRef.current;
    const turnstile = window.turnstile;
    if (!siteKey || !element || !turnstile || widgetId.current) return;

    try {
      widgetId.current = turnstile.render(element, {
        sitekey: siteKey,
        callback: (token: string) => onToken(token),
        "expired-callback": clearToken,
        "timeout-callback": clearToken,
        "error-callback": clearToken,
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
        retry: "auto",
        size: "flexible",
        theme: "light",
      });
    } catch {
      clearToken();
    }
  }, [clearToken, onToken, siteKey]);

  useImperativeHandle(ref, () => ({
    reset() {
      clearToken();

      const id = widgetId.current;
      const turnstile = window.turnstile;
      if (!id || !turnstile) return;

      try {
        turnstile.reset(id);
      } catch {
        try {
          turnstile.remove(id);
        } catch {
          // The widget may already have been removed by Cloudflare.
        }
        widgetId.current = null;
        window.setTimeout(renderWidget, 0);
      }
    },
  }), [clearToken, renderWidget]);

  useEffect(() => {
    if (!siteKey) {
      clearToken();
      return;
    }

    renderWidget();
    const renderTimer = window.setInterval(renderWidget, 100);
    const responseTimer = window.setInterval(() => {
      const id = widgetId.current;
      const getResponse = window.turnstile?.getResponse;
      if (!id || !getResponse) return;

      try {
        const token = getResponse(id);
        if (token) onToken(token);
      } catch {
        // The normal success callback remains the primary token source.
      }
    }, 250);

    return () => {
      window.clearInterval(renderTimer);
      window.clearInterval(responseTimer);

      const id = widgetId.current;
      if (id && window.turnstile) {
        try {
          window.turnstile.remove(id);
        } catch {
          // The widget may already have cleaned itself up.
        }
      }
      widgetId.current = null;
    };
  }, [clearToken, onToken, renderWidget, siteKey]);

  if (!siteKey) return <p className="help">Bot protection is disabled in this environment.</p>;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
        onError={clearToken}
      />
      <div ref={containerRef} aria-label="Bot verification" />
    </>
  );
});
