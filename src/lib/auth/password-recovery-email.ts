import 'server-only';

const RESEND_EMAILS_ENDPOINT = 'https://api.resend.com/emails';

export class PasswordRecoveryEmailNotConfiguredError extends Error {
  constructor() {
    super('PASSWORD_RECOVERY_EMAIL_NOT_CONFIGURED');
    this.name = 'PasswordRecoveryEmailNotConfiguredError';
  }
}

export class PasswordRecoveryEmailDeliveryError extends Error {
  constructor() {
    super('PASSWORD_RECOVERY_EMAIL_DELIVERY_FAILED');
    this.name = 'PasswordRecoveryEmailDeliveryError';
  }
}

export function isPasswordRecoveryEmailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY && process.env.AUTH_EMAIL_FROM);
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>'"]/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character] ?? character,
  );
}

export async function sendPasswordResetEmail(input: {
  to: string;
  fullName: string;
  resetUrl: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.AUTH_EMAIL_FROM;
  if (!apiKey || !from) throw new PasswordRecoveryEmailNotConfiguredError();

  const safeName = escapeHtml(input.fullName);
  const response = await fetch(RESEND_EMAILS_ENDPOINT, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [input.to],
      subject: 'Restablece tu contraseña de Anclora Talent',
      text: `Hola ${input.fullName},\n\nRestablece tu contraseña aquí: ${input.resetUrl}\n\nEl enlace caduca en 30 minutos y sólo puede usarse una vez.`,
      html: `<p>Hola ${safeName},</p><p><a href="${escapeHtml(input.resetUrl)}">Restablece tu contraseña</a>.</p><p>El enlace caduca en 30 minutos y sólo puede usarse una vez.</p>`,
    }),
  });

  if (!response.ok) throw new PasswordRecoveryEmailDeliveryError();
}
