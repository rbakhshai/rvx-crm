import { Suspense } from "react";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <Suspense>
        <LoginForm />
      </Suspense>
    </main>
  );
}
