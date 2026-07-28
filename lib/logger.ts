import "server-only";
import { getServerEnv } from "@/lib/env";

type Level = "info" | "warn" | "error";

export async function logEvent(level: Level, event: string, context: Record<string, unknown> = {}) {
  const record = {
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context,
  };

  const output = JSON.stringify(record);
  if (level === "error") console.error(output);
  else if (level === "warn") console.warn(output);
  else console.info(output);

  const endpoint = getServerEnv().LOG_DRAIN_URL;
  if (endpoint) {
    try {
      await fetch(endpoint, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: output,
        signal: AbortSignal.timeout(2500),
      });
    } catch {
      console.warn(JSON.stringify({ timestamp: new Date().toISOString(), level: "warn", event: "log_drain_failed" }));
    }
  }
}
