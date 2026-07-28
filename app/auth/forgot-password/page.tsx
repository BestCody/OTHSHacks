import { AuthForm } from "@/components/AuthForm";
import { getTurnstileSiteKey } from "@/lib/env";

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" turnstileSiteKey={getTurnstileSiteKey()} />;
}
