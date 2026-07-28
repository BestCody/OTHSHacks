import { AuthForm } from "@/components/AuthForm";
import { getOptionalPublicEnv } from "@/lib/env";

export default function LoginPage() {
  return <AuthForm mode="login" turnstileSiteKey={getOptionalPublicEnv().turnstileSiteKey} />;
}
