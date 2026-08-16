"use server";

import { redirect } from "next/navigation";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  loginSchema,
  signupSchema,
  type AuthFormState,
} from "@/lib/validations/auth";
import { findUserByEmail, findUserById } from "@/server/services/users";
import { createWorkspaceForAuthUser } from "@/server/services/workspace";

export async function signup(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signupSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    tenantName: formData.get("tenantName"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const { name, email, password, tenantName } = parsed.data;
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    return { errors: { email: ["An account with this email already exists."] } };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name, tenant_name: tenantName },
      emailRedirectTo: `${process.env.APP_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });

  let authUser = data.user;
  let session = data.session;

  if (error || !authUser) {
    const signedIn = await supabase.auth.signInWithPassword({ email, password });
    if (signedIn.error || !signedIn.data.user) {
      return { message: error?.message ?? "Could not create the partner org." };
    }
    authUser = signedIn.data.user;
    session = signedIn.data.session;
  }

  const profile = await findUserById(authUser.id);

  if (!profile) {
    try {
      await createWorkspaceForAuthUser({
        authUserId: authUser.id,
        name,
        email,
        tenantName,
      });
    } catch (cause) {
      if (!data.user) {
        throw cause;
      }
      await createSupabaseAdminClient().auth.admin.deleteUser(authUser.id);
      throw cause;
    }
  }

  if (!session) {
    return {
      message: "Check your email to confirm the account, then sign in.",
    };
  }

  redirect("/accounts");
}

export async function login(
  _state: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { errors: parsed.error.flatten().fieldErrors };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return { message: "Email or password is incorrect." };
  }

  const profile = await findUserById(data.user.id);

  if (!profile) {
    await supabase.auth.signOut();
    return {
      message: "This login has no partner org. Create a partner org first.",
    };
  }

  redirect("/accounts");
}

export async function logout() {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
