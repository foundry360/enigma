import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <>
      <Link href="/" className="text-sm font-semibold">
        Enigma
      </Link>
      <div className="mt-6 rounded-md border border-border bg-surface p-4">
        <h1 className="mb-4 text-sm font-semibold">Create a partner org</h1>
        <SignupForm />
        <p className="mt-4 text-sm text-muted">
          Already have access?{" "}
          <Link href="/login" className="text-accent hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </>
  );
}
