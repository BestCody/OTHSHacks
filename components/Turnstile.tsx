"use client";

import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";

type TurnstileOptions = {
  sitekey: string;
  callback: (token: string) => void;
  action: string;
  execution: "render";
  appearance: "interaction-only";
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
  action: string;
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
  { siteKey, action, onToken, onError },
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
    const element = containerRef.current;
    if (!siteKey || !api || !element || !mountedRef.current || widgetIdRef.current) return;

    try {
      widgetIdRef.current = api.render(element, {
        sitekey: siteKey,
        callback: publishToken,
        action,
        execution: "render",
        appearance: "interaction-only",
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
  }, [action, publishToken, reportError, siteKey]);

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

      if (widgetIdRef.current) {
        window.clearInterval(renderTimer);
      } else if (attempts >= 40) {
        window.clearInterval(renderTimer);
        reportError("Security check script could not load. Disable content blockers and refresh the page.");
      }
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
  }, [publishToken, renderWidget, reportError, siteKey]);

  if (!siteKey) return <p className="error" role="alert">Security verification is unavailable. Authentication is disabled.</p>;

  return <div ref={containerRef} aria-label="Bot verification" />;
});
