import { AuthForm } from "@/components/AuthForm";
import { getOptionalPublicEnv } from "@/lib/env";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" turnstileSiteKey={getOptionalPublicEnv().turnstileSiteKey} />;
}
