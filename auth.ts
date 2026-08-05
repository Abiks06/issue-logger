import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { loginSchema } from "@/lib/validationSchemas";

if (!process.env.NEXTAUTH_URL && process.env.VERCEL_URL) {
  process.env.NEXTAUTH_URL = `https://${process.env.VERCEL_URL}`;
}

class InvalidCredentialsError extends CredentialsSignin {
  code = "INVALID_CREDENTIALS";
}

class EmailNotVerifiedError extends CredentialsSignin {
  code = "EMAIL_NOT_VERIFIED";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  secret: process.env.NEXTAUTH_SECRET,
  pages: {
    signIn: "/auth/login",
    error: "/auth/login",
  },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "you@example.com" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) {
          console.warn("Credentials validation failed", credentials);
          throw new InvalidCredentialsError();
        }

        const normalizedEmail = parsed.data.email.trim().toLowerCase();
        const user = await prisma.user.findUnique({
          where: { email: normalizedEmail },
        });
        if (!user) {
          console.warn("No user found for login", { email: normalizedEmail });
          throw new InvalidCredentialsError();
        }

        if (!user.emailVerified) {
          console.warn("Unverified login attempt", { email: normalizedEmail });
          throw new EmailNotVerifiedError();
        }

        const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!valid) {
          console.warn("Invalid password for user", { email: normalizedEmail });
          throw new InvalidCredentialsError();
        }

        return { id: String(user.id), name: user.name, email: user.email };
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
