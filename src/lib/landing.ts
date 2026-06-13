/**
 * Landing page feature flag.
 *
 * The public marketing landing page is OFF by default. It is shown only when
 * the `LANDING` environment variable is exactly "1". Any other value, including
 * "0", an empty string, or the variable being omitted entirely, keeps the
 * landing page hidden and preserves the original behavior where an
 * unauthenticated visitor goes straight to the sign-in screen.
 *
 * This is the single source of truth for the flag. Read it through this helper
 * everywhere rather than touching process.env directly, so the "only 1 turns it
 * on" rule lives in one place.
 */
export function isLandingEnabled(): boolean {
  return process.env.LANDING === '1';
}
