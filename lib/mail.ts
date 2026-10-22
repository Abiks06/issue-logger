import nodemailer from "nodemailer";

const resendApiKey =
  process.env.RESEND_API_KEY?.trim() ||
  (process.env.SMTP_HOST === "smtp.resend.com" ? process.env.SMTP_PASS : undefined);

const transporter = process.env.SMTP_HOST
  ? nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: Number(process.env.SMTP_PORT) === 465,
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    })
  : null;

/** True when Resend or SMTP is configured. */
export function mailConfigured() {
  return Boolean(resendApiKey || transporter);
}

export function appUrl(path = "/") {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined) ||
    "http://localhost:3000";
  return `${raw.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

/** Consistent single-button email layout. All arguments are escaped. */
export function actionEmail({ heading, greetingName, body, cta, url }: {
  heading: string;
  greetingName: string;
  body: string;
  cta: string;
  url: string;
}) {
  return `
    <div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;line-height:1.6;color:#18181b;max-width:480px;margin:0 auto;padding:24px">
      <h2 style="margin:0 0 16px">${escapeHtml(heading)}</h2>
      <p>Hi ${escapeHtml(greetingName)},</p>
      <p>${escapeHtml(body)}</p>
      <p style="margin:28px 0">
        <a href="${escapeHtml(url)}" style="background:#4f46e5;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;font-weight:600">${escapeHtml(cta)}</a>
      </p>
      <p style="color:#71717a;font-size:13px">If you didn't request this, you can ignore this email.</p>
    </div>`;
}

export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "Issue Logger <no-reply@example.com>";

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${resendApiKey}` },
      body: JSON.stringify({ from, to, subject, html }),
    });
    if (!response.ok) throw new Error(`Resend API failed: ${response.status} ${await response.text()}`);
    return;
  }

  if (!transporter) throw new Error("No mail transport configured (set RESEND_API_KEY or SMTP_HOST).");
  await transporter.sendMail({ from, to, subject, html });
}
