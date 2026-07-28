import { AuthForm } from "@/components/AuthForm";
import { getOptionalPublicEnv } from "@/lib/env";

export const metadata = { title: "Sign in" };

export default function LoginPage() {
  return <AuthForm mode="login" turnstileSiteKey={getOptionalPublicEnv().turnstileSiteKey} />;
}
