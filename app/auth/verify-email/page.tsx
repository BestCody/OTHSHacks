import { VerifyEmailForm } from "@/components/VerifyEmailForm";

type VerifyEmailPageProps = {
  searchParams: Promise<{
    token_hash?: string | string[];
  }>;
};

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const params = await searchParams;
  const tokenHash = typeof params.token_hash === "string" ? params.token_hash : "";

  return <VerifyEmailForm tokenHash={tokenHash} />;
}
