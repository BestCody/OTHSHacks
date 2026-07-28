import "server-only";
import { getServerEnv } from "@/lib/env";

export function assertSameOrigin(request: Request) {
  const fetchSite = request.headers.get("sec-fetch-site");
  if (fetchSite && !["same-origin", "same-site", "none"].includes(fetchSite)) {
    const error = new Error("Cross-site request rejected.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
  const origin = request.headers.get("origin");
  if (!origin) return;
  const expected = new URL(getServerEnv().NEXT_PUBLIC_SITE_URL).origin;
  const requestOrigin = new URL(request.url).origin;
  if (origin !== expected && origin !== requestOrigin) {
    const error = new Error("Cross-origin request rejected.");
    (error as Error & { status?: number }).status = 403;
    throw error;
  }
}

export async function matchesDeclaredFileType(file: File) {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "application/pdf") {
    return bytes.length >= 5 && String.fromCharCode(...bytes.slice(0, 5)) === "%PDF-";
  }
  if (file.type === "image/png") {
    const signature = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return signature.every((value, index) => bytes[index] === value);
  }
  if (file.type === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  return false;
}
