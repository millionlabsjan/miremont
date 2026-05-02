/**
 * Map a server-emitted notification link to the mobile route the user should land on.
 * Server links are semantic (`/inquiries/<id>`, `/properties/<id>`); the mobile app
 * uses `/chat/<id>` and `/property/<id>` for those screens.
 */
export function notificationRoute(link: string | null | undefined): string | null {
  if (!link) return null;
  const inquiry = link.match(/^\/inquiries\/([^/]+)/);
  if (inquiry) return `/chat/${inquiry[1]}`;
  const property = link.match(/^\/properties\/([^/]+)/);
  if (property) return `/property/${property[1]}`;
  return link;
}
