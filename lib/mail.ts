import nodemailer from "nodemailer";

const resendApiKey =
  process.env.RESEND_API_KEY && process.env.RESEND_API_KEY.trim() !== ""
    ? process.env.RESEND_API_KEY
    : process.env.SMTP_HOST === "smtp.resend.com"
    ? process.env.SMTP_PASS
    : undefined;

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: Number(process.env.SMTP_PORT) === 465,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 10000,
  auth: process.env.SMTP_USER
    ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      }
    : undefined,
});

export async function sendMail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  console.log("Sending email to...", to);
  
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@example.com";

  if (resendApiKey) {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from,
        to,
        subject,
        html,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      const error = new Error(`Resend API failed: ${response.status} ${body}`);
      console.error(error);
      throw error;
    }

    return;
  }

  if (!process.env.SMTP_HOST) {
    const error = new Error("SMTP_HOST is not configured; email delivery is unavailable.");
    console.error(error);
    throw error;
  }

  try {
    await transporter.sendMail({
      from,
      to,
      subject,
      html,
    });
  } catch (err) {
    console.error("Nodemailer failed to send email:", err);
    throw err;
  }
}
