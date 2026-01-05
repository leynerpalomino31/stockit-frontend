// src/lib/mailer.ts
type MailOptions = {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
  cc?: string | string[];
  bcc?: string | string[];
};

function toArray(v?: string | string[]) {
  if (!v) return undefined;
  return Array.isArray(v) ? v : [v];
}

export async function sendMail(opts: MailOptions): Promise<void> {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_SECURE,
    SMTP_USER,
    SMTP_PASS,
    MAIL_FROM,
  } = process.env as Record<string, string | undefined>;

  // Carga perezosa, y si no existe nodemailer, hacemos fallback a console.log
  let nodemailer: any;
  try {
    nodemailer = await import('nodemailer');
  } catch {
    console.log('[mailer] nodemailer no instalado. Mostrando correo simulado:\n', {
      from: MAIL_FROM || 'no-reply@localhost',
      to: opts.to,
      subject: opts.subject,
      text: opts.text,
      html: opts.html,
      cc: opts.cc,
      bcc: opts.bcc,
    });
    return;
  }

  // Si no hay host SMTP configurado, usar transporte JSON (simula envío y loguea)
  const useRealSmtp = Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS);
  const transporter = useRealSmtp
    ? nodemailer.createTransport({
        host: SMTP_HOST,
        port: Number(SMTP_PORT ?? 587),
        secure: String(SMTP_SECURE ?? 'false') === 'true',
        auth: { user: SMTP_USER, pass: SMTP_PASS },
      })
    : nodemailer.createTransport({ jsonTransport: true });

  const from = MAIL_FROM || 'no-reply@localhost';
  const mail = {
    from,
    to: toArray(opts.to)?.join(', '),
    cc: toArray(opts.cc)?.join(', '),
    bcc: toArray(opts.bcc)?.join(', '),
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  };

  const info = await transporter.sendMail(mail);
  if (!useRealSmtp) {
    console.log('[mailer] (simulado) correo generado:', info && info.message);
  } else {
    console.log('[mailer] enviado:', info && info.messageId);
  }
}
