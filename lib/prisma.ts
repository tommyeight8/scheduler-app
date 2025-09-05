// If you generate Prisma types somewhere custom, keep this import.
// Otherwise switch to: `import { PrismaClient } from "@prisma/client"`
import { PrismaClient } from "@/app/generated/prisma";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
}

// One client across the whole app (dev + prod)
export const prisma =
  globalThis.prisma ??
  new PrismaClient({
    // tweak as you like
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "warn", "error"]
        : ["error"],
  });

// In dev, store on global to survive HMR (Turbopack/webpack)
if (process.env.NODE_ENV !== "production") globalThis.prisma = prisma;
