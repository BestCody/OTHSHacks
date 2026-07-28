import { headers } from "next/headers";
import Script from "next/script";
import { getOptionalPublicEnv } from "@/lib/env";

export default async function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { turnstileSiteKey } = getOptionalPublicEnv();

  return (
    <>
      {turnstileSiteKey ? (
        <Script
          id="cloudflare-turnstile"
          src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit"
          strategy="afterInteractive"
          nonce={nonce}
        />
      ) : null}
      {children}
    </>
  );
}
