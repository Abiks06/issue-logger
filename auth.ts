import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { loginSchema } from "@/lib/validation";
import { createRateLimiter } from "@/lib/rate-limit";

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
const loginLimiter = createRateLimiter({ limit: 10, windowMs: 15 * 60_000 });

// Compared against when the email is unknown, so response time doesn't reveal
// which addresses have accounts.
const DUMMY_HASH = "$2b$12$IU1U5wUoXGXpJ4QWUTjgKOmwU9H44T5kxhZf7pYWA1SvELhG9oUoS";

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: {
    strategy: "jwt",
    maxAge: 30 * 60, // 30-minute idle timeout
    updateAge: 5 * 60, // slide the expiry while the user is active
  },
  secret: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET,
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
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) throw new InvalidCredentialsError();
        const { email, password } = parsed.data;

        if (!loginLimiter(email).ok) throw new TooManyAttemptsError();

        const user = await prisma.user.findUnique({ where: { email } });
        const valid = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
        if (!user || !valid) throw new InvalidCredentialsError();

        // Only reveal verification state once the password has been proven.
        if (!user.emailVerified) throw new EmailNotVerifiedError();

        return { id: user.id, name: user.name, email: user.email };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user?.id) token.id = user.id;
      return token;
    },
    session({ session, token }) {
      if (token.id) session.user.id = token.id as string;
      return session;
    },
  },
});
