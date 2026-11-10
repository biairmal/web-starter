// Runs once when the server starts. Validating the env here means a missing
// SESSION_SECRET stops the server before it serves.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnv } = await import("@/config/env");
    validateEnv();
  }
}
