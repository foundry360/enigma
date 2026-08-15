import Link from "next/link";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <>
      <h1 className="font-serif text-2xl">Create a workspace</h1>
      <p className="mb-6 mt-1 text-sm text-muted">
        For Salesforce AEs, RVPs, and partners. Customer orgs come next.
      </p>
      <SignupForm />
      <p className="mt-6 text-sm text-muted">
        Already have access?{" "}
        <Link href="/login" className="text-accent">
          Sign in
        </Link>
      </p>
    </>
  );
}
