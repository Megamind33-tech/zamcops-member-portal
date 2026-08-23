import { AuthPhotoShell } from "@/components/brand/AuthPhotoShell";
import { ForgotPasswordForm } from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <AuthPhotoShell
      src="/img/hands.webp"
      alt="Musician's hands"
      headline="We'll help you back into your catalogue."
      body="The ZAMCOPS team verifies identity before issuing a temporary password."
    >
      <ForgotPasswordForm />
    </AuthPhotoShell>
  );
}
