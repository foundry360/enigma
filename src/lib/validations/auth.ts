import { z } from "zod";

export const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters."),
  email: z.string().trim().email("Enter a valid work email."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .regex(/[a-zA-Z]/, "Include at least one letter.")
    .regex(/[0-9]/, "Include at least one number."),
  tenantName: z
    .string()
    .trim()
    .min(2, "Workspace name must be at least 2 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(1, "Password is required."),
});

export const createAccountSchema = z.object({
  name: z.string().trim().min(2, "Account name must be at least 2 characters."),
  industry: z.string().trim().optional(),
});

export type AuthFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
} | undefined;
