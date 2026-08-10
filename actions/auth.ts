"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema } from "@/lib/validationSchemas";
import { z } from "zod";
import { sendMail } from "@/lib/mail";

type RegisterData = z.infer<typeof registerSchema>;

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildUrl(path: string) {
  const rawUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "http://localhost:3000";
  const baseUrl = rawUrl.replace(/\/+$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${cleanPath}`;
}

export async function registerUser(data: RegisterData) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { success: false, errors: fieldErrors };
  }

  const normalizedEmail = parsed.data.email.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
  if (existing) {
    return { success: false, errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const verificationToken = createToken();

  const isDev = process.env.NODE_ENV !== "production";

  const user = await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: normalizedEmail,
      passwordHash,
      emailVerified: isDev ? new Date() : null,
    },
  });

  if (!isDev) {
    await prisma.verificationToken.create({
      data: {
        identifier: normalizedEmail,
        token: verificationToken,
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24),
      },
    });
  }

  try {
    await sendMail({
      to: normalizedEmail,
      subject: "Verify your Issue Logger account",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Welcome to Issue Logger</h2>
          <p>Hi ${parsed.data.name},</p>
          <p>Please verify your account by clicking the link below:</p>
          <p><a href="${buildUrl(`/auth/verify?token=${verificationToken}`)}">Verify account</a></p>
          <p>If you didn't create this account, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    // Rollback user creation
    await prisma.user.delete({ where: { id: user.id } }).catch(console.error);
    if (!isDev) {
      await prisma.verificationToken.delete({ where: { token: verificationToken } }).catch(console.error);
    }
    return { success: false, errors: { email: ["Failed to send verification email. Please try again later."] } };
  }

  return { success: true, message: "Confirmation email sent!" };
}

export async function verifyEmail(token: string) {
  const verificationToken = await prisma.verificationToken.findUnique({
    where: { token },
  });

  if (!verificationToken || verificationToken.expires < new Date()) {
    return { success: false, message: "Invalid or expired verification link." };
  }

  const user = await prisma.user.findUnique({
    where: { email: verificationToken.identifier },
  });

  if (!user) return { success: false, message: "User not found." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: new Date(),
    },
  });

  await prisma.verificationToken.delete({
    where: { token },
  });

  return { success: true, message: "Email verified successfully." };
}

export async function resendVerificationEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user) {
    return { success: true };
  }

  // Delete any existing tokens for this email
  await prisma.verificationToken.deleteMany({
    where: { identifier: normalizedEmail },
  });

  const token = createToken();
  const expires = new Date(Date.now() + 1000 * 60 * 60 * 24);

  await prisma.verificationToken.create({
    data: {
      identifier: normalizedEmail,
      token,
      expires,
    },
  });

  try {
    await sendMail({
      to: normalizedEmail,
      subject: "Verify your Issue Logger account",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Verify your email</h2>
          <p>Hi ${user.name},</p>
          <p>Click the link below to verify your account:</p>
          <p><a href="${buildUrl(`/auth/verify?token=${token}`)}">Verify account</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send verification email:", error);
    return { success: false, message: "Failed to send verification email. Please try again later." };
  }

  return { success: true, message: "Verification email sent!" };
}

export async function requestPasswordReset(email: string) {
  const normalized = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalized } });

  if (!user) {
    return { success: true };
  }

  const token = createToken();
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60),
    },
  });

  try {
    await sendMail({
      to: normalized,
      subject: "Reset your Issue Logger password",
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.5">
          <h2>Reset your password</h2>
          <p>Hi ${user.name},</p>
          <p>Use the link below to choose a new password:</p>
          <p><a href="${buildUrl(`/auth/reset-password?token=${token}`)}">Reset password</a></p>
          <p>If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Failed to send password reset email:", error);
    return { success: false, message: "Failed to send password reset email. Please try again later." };
  }

  return { success: true, message: "Password reset email sent!" };
}

export async function resetPassword(token: string, password: string) {
  const user = await prisma.user.findFirst({
    where: {
      passwordResetToken: token,
      passwordResetTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) return { success: false, message: "Invalid or expired reset link." };

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      emailVerified: user.emailVerified || new Date(),
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    },
  });

  return { success: true, message: "Password updated successfully." };
}
