/** Only validation/conflict explanations are safe to surface verbatim. */
export function safeFailure(error: unknown, fallback: string): string {
  const failure = error as { status?: number; message?: string } | null;
  return (failure?.status === 400 || failure?.status === 409) && failure.message ? failure.message : fallback;
}
