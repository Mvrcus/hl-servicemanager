import { getAllSettings } from '../db/queries';

export type EmailType = 'new_ticket' | 'client_comment' | 'status_update' | 'admin_reply';

export async function sendEmail(
  db: D1Database,
  params: {
    to: string;
    subject: string;
    message: string;
    contact_email: string;
    type?: EmailType;
  }
): Promise<void> {
  const settings = await getAllSettings(db);
  const webhookUrl = settings.webhook_url;
  const fromEmail = settings.from_email || 'noreply@hlservicemanager.com';

  if (!webhookUrl) return;

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: fromEmail,
      to: params.to,
      subject: params.subject,
      message: params.message,
      contact_email: params.contact_email,
      type: params.type || 'notification',
    }),
  });
}

export async function getAdminEmail(db: D1Database): Promise<string> {
  const settings = await getAllSettings(db);
  return settings.admin_email || '';
}
