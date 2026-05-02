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
const PREFS_URL = process.env.NOTIFICATION_PREFS_URL || "miremont://account/notifications";

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

export interface DigestItem {
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
}

const CATEGORY_LABEL: Record<string, string> = {
  new_inquiry: "Inquiries",
  property_update: "Saved properties",
  price_drop: "Price drops",
  saved_search_match: "Saved searches",
};

function groupByCategory(items: DigestItem[]): Map<string, DigestItem[]> {
  const grouped = new Map<string, DigestItem[]>();
  for (const item of items) {
    const label = CATEGORY_LABEL[item.type] || "Updates";
    const arr = grouped.get(label) || [];
    arr.push(item);
    grouped.set(label, arr);
  }
  return grouped;
}

function renderItemHtml(item: DigestItem): string {
  const link = item.link ? `miremont://${item.link.replace(/^\//, "")}` : "#";
  return `
    <a href="${link}" style="display: block; margin-bottom: 12px; padding: 14px 16px; border: 1px solid #d6d1cb; border-radius: 10px; text-decoration: none; color: #1c1c1c;">
      <div style="font-size: 14px; font-weight: 600; margin-bottom: 4px;">${escapeHtml(item.title)}</div>
      ${item.body ? `<div style="font-size: 13px; color: #6b6359; line-height: 1.5;">${escapeHtml(item.body)}</div>` : ""}
    </a>
  `;
}

function renderItemText(item: DigestItem): string {
  const link = item.link ? `miremont://${item.link.replace(/^\//, "")}` : "";
  return `  • ${item.title}${item.body ? ` — ${item.body}` : ""}${link ? `\n    ${link}` : ""}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function sendDailyDigestEmail(
  to: string,
  recipientName: string,
  items: DigestItem[]
): Promise<void> {
  if (items.length === 0) return;
  const grouped = groupByCategory(items);
  const total = items.length;

  const sectionsHtml = Array.from(grouped.entries())
    .map(
      ([label, group]) => `
        <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 600; margin: 28px 0 10px;">
          ${label} <span style="color: #b8ada4; font-size: 14px; font-weight: 400;">(${group.length})</span>
        </h2>
        ${group.map(renderItemHtml).join("")}
      `
    )
    .join("");

  const sectionsText = Array.from(grouped.entries())
    .map(([label, group]) => `${label}\n${group.map(renderItemText).join("\n")}`)
    .join("\n\n");

  await getClient().sendEmail({
    From: SENDER_EMAIL,
    To: to,
    Subject: `${total} update${total === 1 ? "" : "s"} you haven't seen yet`,
    HtmlBody: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1c1c1c;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Hi ${escapeHtml(recipientName.split(" ")[0] || "there")},
        </h1>
        <p style="font-size: 15px; color: #b8ada4; line-height: 1.6; margin-bottom: 16px;">
          Here's what happened in your account that you haven't read yet.
        </p>
        ${sectionsHtml}
        <p style="font-size: 13px; color: #b8ada4; margin-top: 32px;">
          You can stop these daily summaries from <a href="${PREFS_URL}" style="color: #b8ada4;">your notification preferences</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d1cb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #b8ada4;">The Property Catalogue</p>
      </div>
    `,
    TextBody: `Hi ${recipientName.split(" ")[0] || "there"},\n\nHere's what happened in your account that you haven't read yet.\n\n${sectionsText}\n\nManage notifications: ${PREFS_URL}\n\n— The Property Catalogue`,
    MessageStream: "outbound",
    Headers: [{ Name: "List-Unsubscribe", Value: `<${PREFS_URL}>` }],
  });
}

export async function sendInactiveSummaryEmail(
  to: string,
  recipientName: string,
  highlights: DigestItem[]
): Promise<void> {
  if (highlights.length === 0) return;
  const grouped = groupByCategory(highlights);

  const sectionsHtml = Array.from(grouped.entries())
    .map(
      ([label, group]) => `
        <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 17px; font-weight: 600; margin: 28px 0 10px;">${label}</h2>
        ${group.map(renderItemHtml).join("")}
      `
    )
    .join("");

  const sectionsText = Array.from(grouped.entries())
    .map(([label, group]) => `${label}\n${group.map(renderItemText).join("\n")}`)
    .join("\n\n");

  await getClient().sendEmail({
    From: SENDER_EMAIL,
    To: to,
    Subject: "We've missed you — here's what's new",
    HtmlBody: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1c1c1c;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 26px; font-weight: 700; margin-bottom: 8px;">
          Welcome back, ${escapeHtml(recipientName.split(" ")[0] || "there")}
        </h1>
        <p style="font-size: 15px; color: #b8ada4; line-height: 1.6; margin-bottom: 16px;">
          You haven't checked in for a while. Here are the highlights you missed.
        </p>
        ${sectionsHtml}
        <a href="miremont://" style="display: inline-block; margin-top: 8px; padding: 14px 32px; background-color: #1c1c1c; color: #fafafa; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600;">
          Open the app
        </a>
        <p style="font-size: 13px; color: #b8ada4; margin-top: 32px;">
          You can stop these weekly summaries from <a href="${PREFS_URL}" style="color: #b8ada4;">your notification preferences</a>.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d1cb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #b8ada4;">The Property Catalogue</p>
      </div>
    `,
    TextBody: `Welcome back, ${recipientName.split(" ")[0] || "there"}\n\nYou haven't checked in for a while. Here are the highlights you missed.\n\n${sectionsText}\n\nManage notifications: ${PREFS_URL}\n\n— The Property Catalogue`,
    MessageStream: "outbound",
    Headers: [{ Name: "List-Unsubscribe", Value: `<${PREFS_URL}>` }],
  });
}
