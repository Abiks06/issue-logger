import RegisterForm from "./RegisterForm";

export default async function RegisterPage({ searchParams }: PageProps<"/auth/register">) {
  const { email } = await searchParams;
  return <RegisterForm invitedEmail={typeof email === "string" ? email.slice(0, 254) : ""} />;
}
