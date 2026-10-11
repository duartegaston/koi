import type { ContactMessage } from "@/db/schema";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function contactConfirmationEmail(contact: Pick<ContactMessage, "name" | "message">) {
  const name = escapeHtml(contact.name);
  const message = escapeHtml(contact.message).replaceAll("\n", "<br />");

  return {
    subject: "Recibimos tu mensaje",
    html: `
      <div style="font-family:system-ui,sans-serif;line-height:1.5">
        <h1 style="font-size:20px">¡Hola ${name}!</h1>
        <p>Gracias por escribirnos. Te responderemos a la brevedad.</p>
        <blockquote style="border-left:3px solid #ddd;margin:0;padding-left:12px;color:#555">${message}</blockquote>
      </div>
    `,
    text: `¡Hola ${contact.name}!\n\nGracias por escribirnos. Te responderemos a la brevedad.\n\n${contact.message}`,
  };
}
