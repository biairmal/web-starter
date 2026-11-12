// Runs once when the server starts. Validating the env here means a missing
// SESSION_SECRET stops the server before it serves.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }
  const { validateEnv } = await import("@/config/env");
  try {
    validateEnv();
  } catch (error) {
    // The production server logs a failed instrumentation hook and keeps
    // serving, so a misconfigured container would look alive. Exit instead,
    // so the orchestrator shows the message and the pod does not go ready.
    // `next dev` keeps the overlay, so the variable can be fixed in place.
    if (process.env.NODE_ENV === "production") {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
    throw error;
  }
}
