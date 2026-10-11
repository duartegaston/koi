import "server-only";
import { Resend } from "resend";
import { getServerEnv } from "@/lib/env";

let client: Resend | undefined;

function getResend(): Resend {
  client ??= new Resend(getServerEnv().RESEND_API_KEY);
  return client;
}

type SendEmailInput = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
};

export async function sendEmail({ to, subject, html, text, replyTo }: SendEmailInput) {
  const { data, error } = await getResend().emails.send({
    from: getServerEnv().EMAIL_FROM,
    to,
    subject,
    html,
    text,
    replyTo,
  });

  if (error) {
    throw new Error(`Resend: ${error.message}`);
  }

  return data;
}
