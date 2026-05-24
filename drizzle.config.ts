import { defineConfig } from "drizzle-kit";

// Load .env.local for db:push / db:generate / db:studio (Next.js handles this at runtime).
try {
  process.loadEnvFile(".env.local");
} catch {
  // .env.local may not exist in CI; fall through
}

export default defineConfig({
  schema: "./src/db/schema/*",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
  verbose: true,
  strict: false,
});
