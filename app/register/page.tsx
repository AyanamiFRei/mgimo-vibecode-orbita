import { AuthFrame } from "@/components/auth-frame";
import { RegistrationForm } from "@/components/registration-form";
export default function RegisterPage() {
  return (
    <AuthFrame
      title="Новая орбита"
      description="Создай собственный аккаунт с вымышленным учебным профилем."
    >
      <RegistrationForm />
    </AuthFrame>
  );
}
