import { z } from "zod";
import { industries } from "@/lib/industries";
import {
  customerStatuses,
  employeeRanges,
  organizationTypes,
} from "@/lib/organizations";
import {
  primaryOutcomes,
  projectPriorities,
  projectStatuses,
  projectTypes,
  scopePlatforms,
} from "@/lib/projects";

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
  organizationId: z.string().uuid("Choose an organization."),
  projectType: z.enum(projectTypes, "Choose a project type."),
  objective: z
    .string()
    .trim()
    .min(8, "Describe the objective in a short sentence."),
  outcomes: z
    .array(z.enum(primaryOutcomes))
    .min(1, "Choose at least one desired outcome."),
  outcomeOther: z.string().trim().optional(),
  ownerId: z.string().min(1, "Choose a project owner."),
  status: z.enum(projectStatuses, "Choose a status."),
  platforms: z.array(z.enum(scopePlatforms)).optional(),
  environmentIds: z.array(z.string().uuid()).optional(),
  description: z.string().trim().optional(),
  businessUnit: z.string().trim().optional(),
  department: z.string().trim().optional(),
  executiveSponsor: z.string().trim().optional(),
  customerLead: z.string().trim().optional(),
  targetDate: z.string().optional(),
  priority: z.enum(projectPriorities).optional(),
  successMetrics: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  implementationCost: z.number().nonnegative().optional(),
  discoveryCost: z.number().nonnegative().optional(),
  knowledgeCost: z.number().nonnegative().optional(),
  changeManagementCost: z.number().nonnegative().optional(),
  servicesCost: z.number().nonnegative().optional(),
  otherCost: z.number().nonnegative().optional(),
  annualVolume: z.number().nonnegative().optional(),
  unitPrice: z.number().nonnegative().optional(),
  hoursSavedPerUnit: z.number().nonnegative().optional(),
  hourlyCost: z.number().nonnegative().optional(),
  conservativeAdoption: z.number().min(0).max(1).optional(),
  expectedAdoption: z.number().min(0).max(1).optional(),
  aggressiveAdoption: z.number().min(0).max(1).optional(),
  baselineDays: z.number().nonnegative().optional(),
  enigmaDays: z.number().nonnegative().optional(),
});

export type AuthFormState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  ok?: boolean;
} | undefined;
