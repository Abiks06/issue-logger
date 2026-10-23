"use server";

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { z } from "zod";
import { auth, signIn } from "@/auth";
import { ActionError, currentUser } from "@/lib/access";
import { acceptPendingInvites } from "@/lib/invites";
import { run, type ActionResult } from "@/lib/action";
import { actionEmail, appUrl, mailConfigured, sendMail } from "@/lib/mail";
import { randomToken, sha256 } from "@/lib/tokens";
import { createSharedRateLimiter } from "@/lib/shared-rate-limit";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  profileSchema,
  registerSchema,
  resetPasswordSchema,
} from "@/lib/validation";
import type { TokenType } from "@prisma/client";

const HOUR = 60 * 60 * 1000;
// Caps verification / reset emails per address so the forms can't be used to spam someone.
const emailLimiter = createSharedRateLimiter({ name: "auth-email", limit: 5, windowMs: HOUR });

/** Replaces any outstanding token of this type and returns the raw value for the link. */
async function issueToken(identifier: string, type: TokenType, ttlMs: number) {
  const token = randomToken();
  await prisma.$transaction([
    prisma.authToken.deleteMany({ where: { identifier, type } }),
    prisma.authToken.create({
      data: { identifier, type, tokenHash: sha256(token), expires: new Date(Date.now() + ttlMs) },
    }),
  ]);
  return token;
}

/** Deletes and returns a valid token, so each link works exactly once. */
async function consumeToken(token: string, type: TokenType) {
  const record = await prisma.authToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!record || record.type !== type) return null;
  await prisma.authToken.delete({ where: { id: record.id } });
  return record.expires > new Date() ? record : null;
}

async function sendVerification(email: string, name: string) {
  const token = await issueToken(email, "EMAIL_VERIFY", 24 * HOUR);
  await sendMail({
    to: email,
    subject: "Verify your Issue Logger account",
    html: actionEmail({
      heading: "Welcome to Issue Logger",
      greetingName: name,
      body: "Confirm your email address to finish setting up your account. The link expires in 24 hours.",
      cta: "Verify email",
      url: appUrl(`/auth/verify?token=${token}`),
    }),
  });
}

export async function registerUser(input: unknown): Promise<ActionResult<{ verified: boolean }>> {
  return run(async () => {
    const data = registerSchema.parse(input);

    if (await prisma.user.findUnique({ where: { email: data.email } })) {
      throw new ActionError("An account with this email already exists.");
    }

    // Without a mail transport in development there is no way to receive the
    // link, so local accounts are verified on creation.
    const autoVerify = process.env.NODE_ENV !== "production" && !mailConfigured();

    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash: await bcrypt.hash(data.password, 12),
        emailVerified: autoVerify ? new Date() : null,
      },
    });

    if (autoVerify) {
      await acceptPendingInvites(user.id, user.email);
    } else {
      try {
        await sendVerification(user.email, user.name);
      } catch (err) {
        console.error("Failed to send verification email", err);
        await prisma.user.delete({ where: { id: user.id } }).catch(() => {});
        throw new ActionError("We couldn't send the verification email. Check the mail configuration and try again.");
      }
    }

    return { verified: autoVerify };
  });
}

export async function verifyEmail(token: string): Promise<ActionResult> {
  return run(async () => {
    const record = await consumeToken(token, "EMAIL_VERIFY");
    if (!record) throw new ActionError("This verification link is invalid or has expired.");
    const user = await prisma.user.update({ where: { email: record.identifier }, data: { emailVerified: new Date() } });
    await acceptPendingInvites(user.id, user.email);
    return undefined;
  });
}

export async function resendVerificationEmail(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { email } = forgotPasswordSchema.parse(input);
    if (!(await emailLimiter(`verify:${email}`)).ok) throw new ActionError("Too many requests. Try again later.");
    const user = await prisma.user.findUnique({ where: { email } });
    // Same response whether or not the account exists.
    if (user && !user.emailVerified) await sendVerification(user.email, user.name);
    return undefined;
  });
}

export async function requestPasswordReset(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { email } = forgotPasswordSchema.parse(input);
    if (!(await emailLimiter(`reset:${email}`)).ok) throw new ActionError("Too many requests. Try again later.");
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return undefined;

    const token = await issueToken(email, "PASSWORD_RESET", HOUR);
    await sendMail({
      to: email,
      subject: "Reset your Issue Logger password",
      html: actionEmail({
        heading: "Reset your password",
        greetingName: user.name,
        body: "Use the button below to choose a new password. The link expires in one hour.",
        cta: "Reset password",
        url: appUrl(`/auth/reset-password?token=${token}`),
      }),
    });
    return undefined;
  });
}

export async function resetPassword(token: string, input: unknown): Promise<ActionResult> {
  return run(async () => {
    const data = resetPasswordSchema.parse(input);
    const record = await consumeToken(token, "PASSWORD_RESET");
    if (!record) throw new ActionError("This reset link is invalid or has expired.");
    const user = await prisma.user.findUnique({ where: { email: record.identifier } });
    if (!user) throw new ActionError("This reset link is invalid or has expired.");
    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await bcrypt.hash(data.password, 12),
        // Receiving the reset email proves ownership of the address.
        emailVerified: user.emailVerified ?? new Date(),
        // Whoever knew the old password is signed out everywhere.
        sessionVersion: { increment: 1 },
      },
    });
    await acceptPendingInvites(user.id, user.email);
    return undefined;
  });
}

export async function updateProfile(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const user = await currentUser();
    if (!user) throw new ActionError("You need to sign in again.");
    const data = profileSchema.parse(input);
    await prisma.user.update({ where: { id: user.id }, data: { name: data.name } });
    return undefined;
  });
}

/** Checks the signed-in user's password; returns their row. */
async function verifyCurrentPassword(password: string) {
  const user = await currentUser();
  if (!user) throw new ActionError("You need to sign in again.");
  const row = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
  if (!(await bcrypt.compare(password, row.passwordHash))) {
    throw new ActionError("Your current password is incorrect.");
  }
  return row;
}

/**
 * Revokes every session (by bumping sessionVersion), then signs this browser
 * back in so only other devices are logged out.
 */
async function revokeOtherSessions(userId: string, email: string, password: string) {
  const session = await auth();
  await prisma.user.update({ where: { id: userId }, data: { sessionVersion: { increment: 1 } } });
  await signIn("credentials", { email, password, remember: String(session?.remember ?? true), redirect: false });
}

export async function changePassword(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const data = changePasswordSchema.parse(input);
    const row = await verifyCurrentPassword(data.currentPassword);
    await prisma.user.update({
      where: { id: row.id },
      data: { passwordHash: await bcrypt.hash(data.password, 12) },
    });
    await revokeOtherSessions(row.id, row.email, data.password);
    return undefined;
  });
}

export async function signOutOtherSessions(input: unknown): Promise<ActionResult> {
  return run(async () => {
    const { password } = z.object({ password: z.string().min(1, "Enter your password") }).parse(input);
    const row = await verifyCurrentPassword(password);
    await revokeOtherSessions(row.id, row.email, password);
    return undefined;
  });
}
