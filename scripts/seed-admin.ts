/**
 * One-time admin user seed.
 *
 * Usage:
 *   npx tsx scripts/seed-admin.ts
 *
 * Requires ADMIN_EMAIL, ADMIN_PASSWORD, BETTER_AUTH_URL, BETTER_AUTH_SECRET, DATABASE_URL.
 * Sign-up is disabled in the app — this script is the only way to create the admin.
 */
import "dotenv/config";

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const baseURL = process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL;

  if (!email || !password) {
    console.error("ADMIN_EMAIL and ADMIN_PASSWORD are required");
    process.exit(1);
  }
  if (!baseURL) {
    console.error("BETTER_AUTH_URL (or NEXT_PUBLIC_APP_URL) is required");
    process.exit(1);
  }
  if (password.length < 8) {
    console.error("ADMIN_PASSWORD must be at least 8 characters");
    process.exit(1);
  }

  const { createAuth } = await import("../lib/auth/auth");
  // Use a dedicated auth instance that allows sign-up only for this seed operation.
  const auth = createAuth({ disableSignUp: false });

  try {
    const result = await auth.api.signUpEmail({
      body: {
        email,
        password,
        name: "Calabash Admin",
      },
    });

    console.log("Admin user created:", result.user?.email ?? email);
    console.log("You can now sign in at", `${baseURL}/login`);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    if (
      message.toLowerCase().includes("exist") ||
      message.toLowerCase().includes("already") ||
      message.toLowerCase().includes("unique")
    ) {
      console.log("Admin user already exists:", email);
      process.exit(0);
    }

    console.error("Failed to create admin:", message);
    process.exit(1);
  }
}

main();
