import postmark from "postmark";

function getClient() {
  const token = process.env.POSTMARK_API_TOKEN;
  if (!token) {
    throw new Error("POSTMARK_API_TOKEN is not set — cannot send emails");
  }
  return new postmark.ServerClient(token);
}

const SENDER_EMAIL =
  process.env.POSTMARK_SENDER_EMAIL || "info@thepropertycatalogue.com";

export async function sendPasswordResetEmail(
  to: string,
  resetToken: string
): Promise<void> {
  const resetLink = `miremont://reset-password?token=${resetToken}`;

  await getClient().sendEmail({
    From: SENDER_EMAIL,
    To: to,
    Subject: "Reset your password — The Property Catalogue",
    HtmlBody: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1c1c1c;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Reset your password
        </h1>
        <p style="font-size: 15px; color: #b8ada4; line-height: 1.6; margin-bottom: 24px;">
          We received a request to reset the password for your account. Click the button below to choose a new password.
        </p>
        <a href="${resetLink}" style="display: inline-block; padding: 14px 32px; background-color: #1c1c1c; color: #fafafa; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600;">
          Reset password
        </a>
        <p style="font-size: 13px; color: #b8ada4; margin-top: 32px;">
          This link expires in 30 minutes. If you didn't request a password reset, you can safely ignore this email.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d1cb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #b8ada4;">
          The Property Catalogue
        </p>
      </div>
    `,
    TextBody: `Reset your password\n\nWe received a request to reset your password. Use this link to set a new one:\n\n${resetLink}\n\nThis link expires in 30 minutes. If you didn't request this, ignore this email.\n\n— The Property Catalogue`,
    MessageStream: "outbound",
  });
}
