import { PrismaClient } from "@prisma/client";

// Connects to Supabase Postgres (ppceqvoyexpkguzeseen) via DATABASE_URL.

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
