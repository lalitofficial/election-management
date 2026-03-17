/**
 * Validates required environment variables at startup.
 * Called from instrumentation.ts so it runs once on server boot.
 */
export function validateEnv() {
  const required = ["DATABASE_URL", "NEXTAUTH_SECRET", "NEXTAUTH_URL"] as const;

  for (const key of required) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }

  const secret = process.env.NEXTAUTH_SECRET!;
  if (secret.length < 32) {
    throw new Error(
      "NEXTAUTH_SECRET must be at least 32 characters. Generate one with: openssl rand -base64 32",
    );
  }
}
