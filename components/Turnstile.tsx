"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useId, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
      getResponse: (id: string) => string;
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
  const elementId = useId().replace(/:/g, "");
  const widgetId = useRef<string | null>(null);
  const lastToken = useRef("");

  const syncToken = useCallback((token: string) => {
    if (lastToken.current === token) return;
    lastToken.current = token;
    onToken(token);
  }, [onToken]);

  const renderWidget = useCallback(() => {
    const element = document.getElementById(elementId);
    if (!siteKey || !element || !window.turnstile || widgetId.current) return;

    widgetId.current = window.turnstile.render(element, {
      sitekey: siteKey,
      execution: "render",
      appearance: "always",
      callback: (token: string) => syncToken(token),
      "expired-callback": () => syncToken(""),
      "timeout-callback": () => syncToken(""),
      "error-callback": () => syncToken(""),
      "refresh-expired": "auto",
      "refresh-timeout": "auto",
      retry: "auto",
      theme: "light",
    });
  }, [elementId, siteKey, syncToken]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
      syncToken("");
    },
  }), [syncToken]);

  useEffect(() => {
    if (!siteKey) return;

    renderWidget();
    const renderTimer = window.setInterval(renderWidget, 100);
    const responseTimer = window.setInterval(() => {
      if (!widgetId.current || !window.turnstile) return;
      syncToken(window.turnstile.getResponse(widgetId.current) || "");
    }, 250);

    return () => {
      window.clearInterval(renderTimer);
      window.clearInterval(responseTimer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
      lastToken.current = "";
    };
  }, [renderWidget, siteKey, syncToken]);

  if (!siteKey) return <p className="help">Bot protection is disabled in this environment.</p>;

  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onReady={renderWidget}
      />
      <div id={elementId} aria-label="Bot verification" />
    </>
  );
});
