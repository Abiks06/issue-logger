"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { registerSchema } from "@/app/validationSchemas";
import { z } from "zod";
import { sendMail } from "@/lib/mail";

type RegisterData = z.infer<typeof registerSchema>;

function createToken() {
  return crypto.randomBytes(32).toString("hex");
}

function buildUrl(path: string) {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `${baseUrl}${path}`;
}

export async function registerUser(data: RegisterData) {
  const parsed = registerSchema.safeParse(data);
  if (!parsed.success) {
    const { fieldErrors } = parsed.error.flatten();
    return { success: false, errors: fieldErrors };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { success: false, errors: { email: ["An account with this email already exists."] } };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const verificationToken = createToken();

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      verificationToken,
      verificationTokenExpiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    },
  });

  await sendMail({
    to: parsed.data.email,
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

  return { success: true };
}

export async function verifyEmail(token: string) {
  const user = await prisma.user.findFirst({
    where: {
      verificationToken: token,
      verificationTokenExpiresAt: { gt: new Date() },
    },
  });

  if (!user) return { success: false, message: "Invalid or expired verification link." };

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    },
  });

  return { success: true, message: "Email verified successfully." };
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

  return { success: true };
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
      passwordResetToken: null,
      passwordResetTokenExpiresAt: null,
    },
  });

  return { success: true, message: "Password updated successfully." };
}
