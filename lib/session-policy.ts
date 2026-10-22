// Session lifetime rules, kept pure so they can be unit-tested.
//
// The cookie lives for SESSION_MAX_AGE and is re-issued on every request, so
// an active user stays signed in indefinitely. "Keep me signed in" off adds an
// idle limit. Every RECHECK_INTERVAL the token is compared with the user's
// sessionVersion, so a password change or "sign out everywhere" revokes all
// older sessions within minutes without a database hit on every request.

export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
export const SHORT_SESSION_IDLE_MS = 12 * 60 * 60 * 1000;
export const RECHECK_INTERVAL_MS = 5 * 60 * 1000;

export type SessionClaims = {
  remember?: boolean;
  lastSeen?: number;
  checkedAt?: number;
};

/** True when a session without "keep me signed in" has been idle too long. */
export function idleExpired(token: SessionClaims, now: number) {
  if (token.remember !== false) return false;
  return now - (token.lastSeen ?? 0) > SHORT_SESSION_IDLE_MS;
}

/** True when it's time to re-check the token against the database. */
export function needsRecheck(token: SessionClaims, now: number) {
  return now - (token.checkedAt ?? 0) > RECHECK_INTERVAL_MS;
}

/** Parses the login form's checkbox value; anything but an explicit "false" means remember. */
export function parseRemember(value: unknown) {
  return !(value === false || value === "false" || value === "off");
}
