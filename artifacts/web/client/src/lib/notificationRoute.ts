/**
 * Map a server-emitted notification link to the web route the user should land on.
 * Server links are semantic (`/inquiries/<id>`, `/properties/<id>`); the web app
 * uses `/chat/<id>` for the conversation view.
 */
export function notificationRoute(link: string | null | undefined): string | null {
  if (!link) return null;
  const inquiry = link.match(/^\/inquiries\/([^/]+)/);
  if (inquiry) return `/chat/${inquiry[1]}`;
  return link;
}
