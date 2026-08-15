import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <>
      <h1 className="font-serif text-2xl">Sign in</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        Return to your tenant workspace.
      </p>
      <LoginForm />
      <p className="mt-6 text-sm text-muted">
        New to Enigma?{" "}
        <Link href="/signup" className="text-accent">
          Create a workspace
        </Link>
      </p>
    </>
  );
}
