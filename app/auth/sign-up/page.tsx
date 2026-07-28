import { AuthForm } from "@/components/AuthForm";
import { getOptionalPublicEnv } from "@/lib/env";

export default function SignUpPage() {
  return <AuthForm mode="signup" turnstileSiteKey={getOptionalPublicEnv().turnstileSiteKey} />;
}
