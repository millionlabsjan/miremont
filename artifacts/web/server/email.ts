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

export async function sendPropertyUpdateEmail(
  to: string,
  propertyTitle: string,
  changeDescription: string,
  propertyId: string
): Promise<void> {
  const link = `miremont://property/${propertyId}`;

  await getClient().sendEmail({
    From: SENDER_EMAIL,
    To: to,
    Subject: `Update on ${propertyTitle} — The Property Catalogue`,
    HtmlBody: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1c1c1c;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          Property Update
        </h1>
        <p style="font-size: 15px; color: #1c1c1c; line-height: 1.6; margin-bottom: 8px;">
          <strong>${propertyTitle}</strong>
        </p>
        <p style="font-size: 15px; color: #b8ada4; line-height: 1.6; margin-bottom: 24px;">
          ${changeDescription}
        </p>
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background-color: #1c1c1c; color: #fafafa; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600;">
          View property
        </a>
        <p style="font-size: 13px; color: #b8ada4; margin-top: 32px;">
          You're receiving this because you saved this property. Manage your notification preferences in the app.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d1cb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #b8ada4;">The Property Catalogue</p>
      </div>
    `,
    TextBody: `Property Update\n\n${propertyTitle}\n\n${changeDescription}\n\nView: ${link}\n\nYou're receiving this because you saved this property.\n\n— The Property Catalogue`,
    MessageStream: "outbound",
  });
}

interface DigestMatch {
  propertyId: string;
  title: string;
  city: string | null;
  country: string | null;
  price: string;
  currency: string | null;
  imageUrl: string | null;
}

export async function sendSavedSearchDigestEmail(
  to: string,
  matchesBySearch: Array<{ searchName: string; matches: DigestMatch[] }>
): Promise<void> {
  const totalCount = matchesBySearch.reduce((sum, s) => sum + s.matches.length, 0);
  const symbol = (cur: string | null) =>
    cur === "GBP" ? "£" : cur === "EUR" ? "€" : "$";

  const sections = matchesBySearch
    .filter((s) => s.matches.length > 0)
    .map(
      (s) => `
      <h2 style="font-family: 'Playfair Display', Georgia, serif; font-size: 18px; font-weight: 600; margin: 32px 0 12px;">
        ${s.searchName}
      </h2>
      ${s.matches
        .map(
          (m) => `
        <a href="miremont://property/${m.propertyId}" style="display: block; margin-bottom: 16px; padding: 16px; border: 1px solid #d6d1cb; border-radius: 10px; text-decoration: none; color: #1c1c1c;">
          <div style="font-size: 15px; font-weight: 600; margin-bottom: 4px;">${m.title}</div>
          <div style="font-size: 13px; color: #b8ada4; margin-bottom: 4px;">${[m.city, m.country].filter(Boolean).join(", ") || ""}</div>
          <div style="font-size: 14px; font-weight: 600;">${symbol(m.currency)}${Number(m.price).toLocaleString()}</div>
        </a>
      `
        )
        .join("")}
    `
    )
    .join("");

  const textSections = matchesBySearch
    .filter((s) => s.matches.length > 0)
    .map(
      (s) =>
        `${s.searchName}\n${s.matches
          .map(
            (m) =>
              `  • ${m.title} — ${[m.city, m.country].filter(Boolean).join(", ")} — ${symbol(m.currency)}${Number(m.price).toLocaleString()}\n    miremont://property/${m.propertyId}`
          )
          .join("\n")}`
    )
    .join("\n\n");

  await getClient().sendEmail({
    From: SENDER_EMAIL,
    To: to,
    Subject: `${totalCount} new ${totalCount === 1 ? "listing" : "listings"} matching your saved searches`,
    HtmlBody: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 40px 24px; color: #1c1c1c;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          New listings for you
        </h1>
        <p style="font-size: 15px; color: #b8ada4; line-height: 1.6; margin-bottom: 8px;">
          ${totalCount} new ${totalCount === 1 ? "property" : "properties"} matched your saved searches since yesterday.
        </p>
        ${sections}
        <p style="font-size: 13px; color: #b8ada4; margin-top: 32px;">
          Manage your saved searches and notifications in the app.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d1cb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #b8ada4;">The Property Catalogue</p>
      </div>
    `,
    TextBody: `New listings for you\n\n${totalCount} new ${totalCount === 1 ? "property" : "properties"} matched your saved searches.\n\n${textSections}\n\n— The Property Catalogue`,
    MessageStream: "outbound",
  });
}

export async function sendInquiryReplyEmail(
  to: string,
  senderName: string,
  propertyTitle: string,
  messagePreview: string,
  inquiryId: string
): Promise<void> {
  const link = `miremont://chat/${inquiryId}`;

  await getClient().sendEmail({
    From: SENDER_EMAIL,
    To: to,
    Subject: `${senderName} replied to your inquiry — The Property Catalogue`,
    HtmlBody: `
      <div style="font-family: 'Inter', Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 24px; color: #1c1c1c;">
        <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; font-weight: 700; margin-bottom: 8px;">
          New reply
        </h1>
        <p style="font-size: 15px; color: #1c1c1c; line-height: 1.6; margin-bottom: 4px;">
          <strong>${senderName}</strong> replied about <strong>${propertyTitle}</strong>
        </p>
        <p style="font-size: 15px; color: #b8ada4; line-height: 1.6; margin-bottom: 24px;">
          "${messagePreview}"
        </p>
        <a href="${link}" style="display: inline-block; padding: 14px 32px; background-color: #1c1c1c; color: #fafafa; text-decoration: none; border-radius: 10px; font-size: 15px; font-weight: 600;">
          View conversation
        </a>
        <p style="font-size: 13px; color: #b8ada4; margin-top: 32px;">
          Manage your notification preferences in the app.
        </p>
        <hr style="border: none; border-top: 1px solid #d6d1cb; margin: 32px 0;" />
        <p style="font-size: 12px; color: #b8ada4;">The Property Catalogue</p>
      </div>
    `,
    TextBody: `New reply\n\n${senderName} replied about ${propertyTitle}:\n\n"${messagePreview}"\n\nView: ${link}\n\n— The Property Catalogue`,
    MessageStream: "outbound",
  });
}
