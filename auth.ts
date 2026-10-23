import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createSharedRateLimiter } from "@/lib/shared-rate-limit";
import { SESSION_MAX_AGE_SECONDS, idleExpired, needsRecheck, parseRemember } from "@/lib/session-policy";

if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

class TooManyAttemptsError extends CredentialsSignin {
  code = "TOO_MANY_ATTEMPTS";
}

// 10 attempts per email per 15 minutes slows down password guessing.
const loginLimiter = createSharedRateLimiter({ name: "login", limit: 10, windowMs: 15 * 60_000 });

// Compared against when the email is unknown, so response time doesn't reveal
// which addresses have accounts.
const DUMMY_HASH = "$2b$12$IU1U5wUoXGXpJ4QWUTjgKOmwU9H44T5kxhZf7pYWA1SvELhG9oUoS";

/**
 * App-specific cookie names. Browsers share cookies across ports, so with
 * Auth.js's default names any other Auth.js app on the same host (another
 * project on localhost:3000, say) fails to decrypt our session and deletes it.
 */
function appCookies() {
  const appUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
  const secure = appUrl.startsWith("https://") || Boolean(process.env.VERCEL);
  const prefix = secure ? "__Secure-" : "";
  const options = { httpOnly: true, sameSite: "lax" as const, path: "/", secure };
  return {
    sessionToken: { name: `${prefix}issue-logger.session-token`, options },
    callbackUrl: { name: `${prefix}issue-logger.callback-url`, options },
    // The CSRF cookie must use __Host- on HTTPS (no Domain attribute is set).
    csrfToken: { name: `${secure ? "__Host-" : ""}issue-logger.csrf-token`, options },
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    // Re-issued on every request, so active users stay signed in. See lib/session-policy.ts.
    maxAge: SESSION_MAX_AGE_SECONDS,
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
  cookies: appCookies(),
  // Wrong passwords are expected; logging a stack trace for each one buries real errors.
  logger: {
    error(error) {
      if (error.name === "CredentialsSignin" || (error as { type?: string }).type === "CredentialsSignin") return;
      console.error("[auth]", error);
    },
  },
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
        remember: { label: "Keep me signed in", type: "checkbox" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentialsError();
        const { email, password } = parsed.data;

        if (!(await loginLimiter(email)).ok) throw new TooManyAttemptsError();

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) throw new InvalidCredentialsError();

        // Only reveal verification state once the password has been proven.
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          remember: parseRemember(credentials?.remember),
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      const now = Date.now();
      if (user?.id) {
        return { ...token, id: user.id, sv: user.sessionVersion ?? 0, remember: user.remember, lastSeen: now, checkedAt: now };
      }
      if (!token.id || idleExpired(token, now)) return null;
      token.lastSeen = now;

      if (needsRecheck(token, now)) {
        let current: { name: string; sessionVersion: number } | null;
        try {
          current = await prisma.user.findUnique({
            where: { id: token.id },
            select: { name: true, sessionVersion: true },
          });
        } catch (err) {
          // A database blip must not sign the user out (Auth.js clears the
          // cookie when this callback throws); retry on the next request.
          console.error("Session recheck failed; keeping the session for now", err);
          return token;
        }
        // Revoked (password changed, signed out everywhere) or deleted users lose the session.
        if (!current || current.sessionVersion !== (token.sv ?? 0)) return null;
        token.name = current.name;
        token.checkedAt = now;
      }
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id;
      session.remember = token.remember !== false;
      return session;
    },
  },
});
