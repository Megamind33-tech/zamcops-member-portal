import { AuthPhotoShell } from "@/components/brand/AuthPhotoShell";
import { RegisterForm } from "./RegisterForm";

export default function RegisterPage() {
  return (
    <AuthPhotoShell
      src="/img/piano.webp"
      alt="Hands on a piano"
      wide
      headline="Join as a composer, author or publisher."
      body="Membership is for the people who write and publish musical works. Register songs with artwork in one submission."
    >
      <RegisterForm />
    </AuthPhotoShell>
  );
}
