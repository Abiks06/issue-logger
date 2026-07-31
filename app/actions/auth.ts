"use server";

import { prisma } from "@/lib/db";
import bcrypt from "bcryptjs";
import { registerSchema } from "@/app/validationSchemas";
import { z } from "zod";

type RegisterData = z.infer<typeof registerSchema>;

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

  await prisma.user.create({
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
    },
  });

  return { success: true };
}
