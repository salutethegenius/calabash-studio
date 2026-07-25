import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/db/auth-schema";

export const auth = createAuth({ disableSignUp: true });

export function createAuth({ disableSignUp }: { disableSignUp: boolean }) {
  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp,
    },
    secret: process.env.BETTER_AUTH_SECRET,
    baseURL: process.env.BETTER_AUTH_URL,
    trustedOrigins: process.env.BETTER_AUTH_URL
      ? [process.env.BETTER_AUTH_URL]
      : undefined,
    plugins: [nextCookies()],
  });
}

export type Session = typeof auth.$Infer.Session;
