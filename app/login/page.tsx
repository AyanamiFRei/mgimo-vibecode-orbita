import { AuthFrame } from "@/components/auth-frame";
import { LoginForm } from "@/components/login-form";
export default function LoginPage() {
  return (
    <AuthFrame title="С возвращением" description="Войди, чтобы всё важное было рядом.">
      <LoginForm />
    </AuthFrame>
  );
}
