"use client";

import Script from "next/script";
import { useEffect, useId, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

export function Turnstile({ siteKey, onToken }: { siteKey: string; onToken: (token: string) => void }) {
  const elementId = useId().replace(/:/g, "");
  const widgetId = useRef<string | null>(null);

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
        theme: "light",
      });
    }, 100);
    return () => {
      window.clearInterval(timer);
      if (widgetId.current && window.turnstile) window.turnstile.remove(widgetId.current);
    };
  }, [elementId, onToken, siteKey]);

  if (!siteKey) return <p className="help">Bot protection is disabled in this environment.</p>;

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div id={elementId} aria-label="Bot verification" />
    </>
  );
}
