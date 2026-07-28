import { AuthForm } from "@/components/AuthForm";
import { getTurnstileSiteKey } from "@/lib/env";

export default function SignUpPage() {
  return <AuthForm mode="signup" turnstileSiteKey={getTurnstileSiteKey()} />;
}
