import { AuthFrame } from "@/components/auth-frame";
import { LoginForm } from "@/components/login-form";
export default function LoginPage() {
  return (
    <AuthFrame title="Вход в кабинет" description="Введи логин и пароль своего аккаунта.">
      <LoginForm />
    </AuthFrame>
  );
}
