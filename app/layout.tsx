import type { Metadata } from "next";
import { headers } from "next/headers";
import Script from "next/script";
import "./globals.css";
import { getOptionalPublicEnv } from "@/lib/env";
import { ClientErrorReporter } from "@/components/ClientErrorReporter";

export const metadata: Metadata = {
  title: "OTHacks",
  description: "OTHacks registration and organizer portal.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  icons: { icon: "/assets/othacks-mascot-head.png" },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const { plausibleDomain } = getOptionalPublicEnv();

  return (
    <html lang="en">
      <body>
        {children}
        <ClientErrorReporter />
        {plausibleDomain ? (
          <Script
            defer
            data-domain={plausibleDomain}
            src="https://plausible.io/js/script.js"
            strategy="afterInteractive"
            nonce={nonce}
          />
        ) : null}
      </body>
    </html>
  );
}
