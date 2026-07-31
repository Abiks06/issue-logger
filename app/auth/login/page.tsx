"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/app/validationSchemas";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { FaBug } from "react-icons/fa";
import ErrorMessage from "@/app/components/ErrorMessage";
import toast from "react-hot-toast";

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      setError("");
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password. Please try again.");
        return;
      }

      toast.success("Welcome back!");
      router.push("/");
      router.refresh();
    });
  });

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      {/* Glow backdrop */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-20 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-linear-to-br from-cyan-400/20 to-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-72 w-72 rounded-full bg-linear-to-tl from-violet-400/10 to-fuchsia-500/5 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-linear-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25 text-white">
            <FaBug className="text-xl" />
          </span>
          <div className="text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
              Sign in to Issue Logger
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track and manage your issues in one place.
            </p>
          </div>
        </div>

        {/* Card */}
        <div className="card-shadow-lg rounded-2xl border border-slate-200/80 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
          {error && (
            <div className="mb-5 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-400">
              <span>⚠</span> {error}
            </div>
          )}

          <form onSubmit={onSubmit} className="flex flex-col gap-5">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-email" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Email address
              </label>
              <input
                id="login-email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                {...register("email")}
              />
              <ErrorMessage>{errors.email?.message}</ErrorMessage>
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="login-password" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Password
              </label>
              <input
                id="login-password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-500"
                {...register("password")}
              />
              <ErrorMessage>{errors.password?.message}</ErrorMessage>
            </div>

            <button
              id="login-submit-btn"
              type="submit"
              disabled={isPending}
              className="mt-1 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-linear-to-r from-cyan-500 to-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-cyan-500/20 transition-all hover:brightness-110 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2"
            >
              {isPending ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
            Don&apos;t have an account?{" "}
            <Link href="/auth/register" className="font-medium text-cyan-600 hover:underline dark:text-cyan-400">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
