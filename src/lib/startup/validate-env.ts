import "server-only";

/**
 * Validates the environment. The production server logs a failed
 * instrumentation hook and keeps serving, so a misconfigured container would
 * look alive: in production this exits with the message instead, so the
 * orchestrator shows it and the pod never goes ready. `next dev` keeps its
 * error overlay, so the variable can be fixed in place.
 */
export async function validateEnvOrExit(): Promise<void> {
  const { validateEnv } = await import("@/config/env");
  try {
    validateEnv();
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error(error instanceof Error ? error.message : error);
      process.exit(1);
    }
    throw error;
  }
}
