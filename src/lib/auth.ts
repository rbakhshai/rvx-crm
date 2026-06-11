import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "@/db";
import * as schema from "@/db/schema";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.user,
      session: schema.session,
      account: schema.account,
      verification: schema.verification,
    },
  }),
  emailAndPassword: {
    enabled: true,
    autoSignIn: true,
    // The team is invite-only (admin creates accounts in /settings/
    // users). Public signup would let strangers create viewer-role
    // accounts on the login page.
    disableSignUp: true,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh once per day
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        defaultValue: "viewer",
        input: false, // can't be set by the user on signup
      },
    },
  },
});
