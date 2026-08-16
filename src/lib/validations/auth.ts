import { z } from "zod";
import { industries } from "@/lib/industries";
import {
  customerStatuses,
  employeeRanges,
  organizationTypes,
} from "@/lib/organizations";
import { projectPlatforms } from "@/lib/platforms";

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
    .min(2, "Partner org name must be at least 2 characters."),
});

export const loginSchema = z.object({
  email: z.string().trim().email("Enter a valid work email."),
  password: z.string().min(1, "Password is required."),
});

export const createAccountSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Organization name must be at least 2 characters."),
  industry: z.enum(industries, "Choose an industry.").optional(),
  organizationType: z.enum(organizationTypes).optional(),
  employeeRange: z.enum(employeeRanges).optional(),
  primaryContact: z.string().trim().optional(),
  customerStatus: z.enum(customerStatuses).optional(),
});

export const createProjectSchema = z.object({
  name: z.string().trim().min(2, "Project name must be at least 2 characters."),
  platformType: z.enum(projectPlatforms, "Choose a platform."),
  organizationId: z.string().uuid("Choose a customer account."),
});

export type AuthFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
} | undefined;
