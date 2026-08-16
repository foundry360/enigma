import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <Link href="/" className="text-sm font-semibold">
        Enigma
      </Link>
      <p className="mt-1 text-sm text-muted">Sign in to your partner org</p>
      <div className="mt-6 rounded-md border border-border bg-surface p-4">
        <LoginForm />
        <p className="mt-4 text-sm text-muted">
          New to Enigma?{" "}
          <Link href="/signup" className="text-accent hover:underline">
            Create a partner org
          </Link>
        </p>
      </div>
    </>
  );
}
