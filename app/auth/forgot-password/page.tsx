import { AuthForm } from "@/components/AuthForm";
import { getOptionalPublicEnv } from "@/lib/env";

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" turnstileSiteKey={getOptionalPublicEnv().turnstileSiteKey} />;
}
