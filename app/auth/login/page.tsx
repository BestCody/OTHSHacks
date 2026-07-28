import { AuthForm } from "@/components/AuthForm";
import { getTurnstileSiteKey } from "@/lib/env";

export default function LoginPage() {
  return <AuthForm mode="login" turnstileSiteKey={getTurnstileSiteKey()} />;
}
