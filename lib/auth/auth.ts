import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { db } from "@/lib/db";
import * as authSchema from "@/lib/db/auth-schema";

const MIN_SECRET_LENGTH = 32;

function requireAuthSecret(): string {
  const secret = process.env.BETTER_AUTH_SECRET?.trim();
  if (secret && secret.length >= MIN_SECRET_LENGTH) {
    return secret;
  }

  // Allow `next build` to compile when Preview envs aren't set yet; runtime still fails clearly.
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return "0".repeat(MIN_SECRET_LENGTH);
  }

  throw new Error(
    `BETTER_AUTH_SECRET is missing or too short (need >= ${MIN_SECRET_LENGTH} chars). ` +
      "Set it for Production and Preview in Vercel Environment Variables."
  );
}

function resolveAuthBaseURL(): string | undefined {
  return (
    process.env.BETTER_AUTH_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined)
  );
}

export const auth = createAuth({ disableSignUp: true });

export function createAuth({ disableSignUp }: { disableSignUp: boolean }) {
  const secret = requireAuthSecret();
  const baseURL = resolveAuthBaseURL();

  return betterAuth({
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: authSchema,
    }),
    emailAndPassword: {
      enabled: true,
      disableSignUp,
    },
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60, // 1 minute — short so sign-out revoke stays near-immediate
      },
    },
    secret,
    baseURL,
    trustedOrigins: baseURL ? [baseURL] : undefined,
    plugins: [nextCookies()],
  });
}

export type Session = typeof auth.$Infer.Session;
