// Runs once when the server starts. Validating the env here means a missing
// SESSION_SECRET stops the server before it serves. The Node-only part lives
// in its own module so the Edge build never sees it.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateEnvOrExit } = await import("@/lib/startup/validate-env");
    await validateEnvOrExit();
  }
}
