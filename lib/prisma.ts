import { PrismaClient } from "@prisma/client";

// Next.js dev hot-reloads this module on every save. Without the globalThis
// cache each reload would construct a new PrismaClient, each opening its own
// connection pool, until Postgres refuses new connections — the classic
// "too many connections" crash a few minutes into a coding session.
//
// In production the module is evaluated once, so the cache is a no-op.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
