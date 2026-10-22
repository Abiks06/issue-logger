import type { Metadata } from "next";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/auth/login">) {
  const { callbackUrl, verified, reset } = await searchParams;
  // Only same-origin paths, so the login page can't be used as an open redirect.
  const next = typeof callbackUrl === "string" && /^\/(?!\/)/.test(callbackUrl) ? callbackUrl : "/";
  const notice = verified ? "Email verified. You can sign in now." : reset ? "Password updated. Sign in with your new password." : null;
  return <LoginForm next={next} notice={notice} />;
}
