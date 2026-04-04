const WEBHOOK_URL =
  'https://services.leadconnectorhq.com/hooks/VqmNtMrPIgjbt8tTAZiz/webhook-trigger/ee481e9b-1c27-445e-8e9d-f34a0d305420';

const FROM_EMAIL = 'noreply@hlservicemanager.com';

export async function sendEmail(params: {
  to: string;
  subject: string;
  message: string;
}): Promise<void> {
  await fetch(WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      message: params.message,
    }),
  });
}
