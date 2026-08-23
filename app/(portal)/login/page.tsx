import { AuthPhotoShell } from "@/components/brand/AuthPhotoShell";
import { LoginForm } from "./LoginForm";

export default function LoginPage() {
  return (
    <AuthPhotoShell
      src="/img/auth-mic.webp"
      alt="Vocalist at a microphone"
      headline="Your works. Your catalogue. Your royalties."
      body="Sign in to register songs with artwork, download documents issued by ZAMCOPS, and follow royalty receiving and distribution."
    >
      <LoginForm />
    </AuthPhotoShell>
  );
}
