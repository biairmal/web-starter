// Runs once when the server starts. Importing the env module validates every
// variable, so a missing SESSION_SECRET stops the server before it serves.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("@/config/env");
  }
}
