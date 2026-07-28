"use client";

import Script from "next/script";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  "expired-callback": () => void;
  "timeout-callback": () => void;
  "error-callback": (errorCode: string) => boolean;
  "unsupported-callback": () => void;
  "refresh-expired": "auto";
  "refresh-timeout": "auto";
  retry: "auto";
  "retry-interval": number;
  size: "flexible";
  theme: "light";
};

type TurnstileApi = {
  ready?: (callback: () => void) => void;
  render: (element: HTMLElement, options: TurnstileOptions) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

export type TurnstileHandle = {
  reset: () => void;
};

type TurnstileProps = {
  siteKey: string;
  onToken: (token: string) => void;
  onError?: (message: string) => void;
};

function describeTurnstileError(errorCode: string) {
  if (errorCode.startsWith("110200")) {
    return "Security check is not authorized for this website (Cloudflare code 110200).";
  }
  if (["110100", "110110", "400020", "400070"].some((code) => errorCode.startsWith(code))) {
    return `Security check configuration is invalid (Cloudflare code ${errorCode}).`;
  }
  if (errorCode.startsWith("200500")) {
    return "Security check could not load. Disable content blockers or try another network (Cloudflare code 200500).";
  }
  return `Security check failed and is retrying (Cloudflare code ${errorCode}).`;
}

export const Turnstile = forwardRef<TurnstileHandle, TurnstileProps>(function Turnstile(
  { siteKey, onToken, onError },
  ref,
) {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const mountedRef = useRef(false);
  const onTokenRef = useRef(onToken);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onTokenRef.current = onToken;
    onErrorRef.current = onError;
  }, [onError, onToken]);

  const publishToken = useCallback((token: string) => {
    if (!mountedRef.current) return;
    if (token) onErrorRef.current?.("");
    onTokenRef.current(token);
  }, []);

  const reportError = useCallback((message: string) => {
    if (!mountedRef.current) return;
    onErrorRef.current?.(message);
    onTokenRef.current("");
  }, []);

  const renderWidget = useCallback(() => {
    const api = window.turnstile;
    if (!siteKey || !api || widgetIdRef.current) return;

    const render = () => {
      const element = containerRef.current;
      if (!mountedRef.current || !element || widgetIdRef.current) return;

      try {
        widgetIdRef.current = api.render(element, {
          sitekey: siteKey,
          callback: publishToken,
          "expired-callback": () => publishToken(""),
          "timeout-callback": () => publishToken(""),
          "error-callback": (errorCode: string) => {
            reportError(describeTurnstileError(errorCode));
            return true;
          },
          "unsupported-callback": () => reportError("This browser cannot run the security check. Try an updated browser."),
          "refresh-expired": "auto",
          "refresh-timeout": "auto",
          retry: "auto",
          "retry-interval": 2000,
          size: "flexible",
          theme: "light",
        });
      } catch {
        reportError("Security check could not start. Refresh the page and try again.");
      }
    };

    if (api.ready) api.ready(render);
    else render();
  }, [publishToken, reportError, siteKey]);

  useImperativeHandle(ref, () => ({
    reset() {
      publishToken("");

      const api = window.turnstile;
      const widgetId = widgetIdRef.current;
      if (!api || !widgetId) {
        renderWidget();
        return;
      }

      try {
        api.reset(widgetId);
      } catch {
        try {
          api.remove(widgetId);
        } catch {
          // Cloudflare may already have removed the widget.
        }
        widgetIdRef.current = null;
        window.setTimeout(renderWidget, 0);
      }
    },
  }), [publishToken, renderWidget]);

  useEffect(() => {
    mountedRef.current = true;
    if (!siteKey) {
      publishToken("");
      return () => {
        mountedRef.current = false;
      };
    }

    renderWidget();

    let attempts = 0;
    const renderTimer = window.setInterval(() => {
      renderWidget();
      attempts += 1;
      if (widgetIdRef.current || attempts >= 40) window.clearInterval(renderTimer);
    }, 250);

    return () => {
      mountedRef.current = false;
      window.clearInterval(renderTimer);
      publishToken("");

      const api = window.turnstile;
      const widgetId = widgetIdRef.current;
      if (api && widgetId) {
        try {
          api.remove(widgetId);
        } catch {
          // Cloudflare may already have removed the widget.
        }
      }
      widgetIdRef.current = null;
    };
  }, [publishToken, renderWidget, siteKey]);

  if (!siteKey) return <p className="help">Bot protection is disabled in this environment.</p>;

  return (
    <>
      <Script
        id="cloudflare-turnstile"
        src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
        strategy="afterInteractive"
        onLoad={renderWidget}
        onReady={renderWidget}
        onError={() => reportError("Security check script could not load. Disable content blockers and refresh the page.")}
      />
      <div ref={containerRef} aria-label="Bot verification" />
    </>
  );
});
