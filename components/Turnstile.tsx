"use client";

import Script from "next/script";
import { forwardRef, useEffect, useId, useImperativeHandle, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id: string) => void;
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

  useImperativeHandle(ref, () => ({
    reset() {
      onToken("");
      if (widgetId.current && window.turnstile) {
        window.turnstile.reset(widgetId.current);
      }
    },
  }), [onToken]);

  useEffect(() => {
    if (!siteKey) return;
    const timer = window.setInterval(() => {
      const element = document.getElementById(elementId);
      if (!element || !window.turnstile || widgetId.current) return;
      window.clearInterval(timer);
      widgetId.current = window.turnstile.render(element, {
        sitekey: siteKey,
        callback: onToken,
        "expired-callback": () => onToken(""),
        "timeout-callback": () => onToken(""),
        "error-callback": () => onToken(""),
        "refresh-expired": "auto",
        "refresh-timeout": "auto",
        theme: "light",
      });
    }, 100);
    return () => {
      window.clearInterval(timer);
      if (widgetId.current && window.turnstile) {
        window.turnstile.remove(widgetId.current);
        widgetId.current = null;
      }
    };
  }, [elementId, onToken, siteKey]);

  if (!siteKey) return <p className="help">Bot protection is disabled in this environment.</p>;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div id={elementId} aria-label="Bot verification" />
    </>
  );
});
