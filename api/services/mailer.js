// services/mailer.js
// Correo transaccional de AppIngles.
// - Producción: SMTP autenticado (variables MAIL_*), remitente acceso@ingresosdigitalesit.com.
// - Sin SMTP configurado (dev/tests): modo dry-run. El email NO se envía; se
//   registra en la colección 'mailOutbox' y en logs, para poder auditar el
//   flujo completo y extraer el enlace en E2E sin enviar correos reales.
// Nunca se loguean credenciales ni el contenido sensible del usuario (solo
// email/estado del envío).

const store = require('../lib/store');

const MAIL_FROM = process.env.MAIL_FROM || 'acceso@ingresosdigitalesit.com';
const SUPPORT_EMAIL = process.env.SUPPORT_EMAIL || 'acceso@ingresosdigitalesit.com';
const APP_URL = process.env.APP_PUBLIC_URL || 'https://www.ingresosdigitalesit.com';

let transporter = null;
let smtpConfigured = false;

function initTransporter() {
  if (!process.env.MAIL_HOST || !process.env.MAIL_USER || !process.env.MAIL_PASSWORD) {
    return null;
  }
  const nodemailer = require('nodemailer');
  smtpConfigured = true;
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST,
    port: Number(process.env.MAIL_PORT || 587),
    secure: String(process.env.MAIL_SECURE || '') === 'true' || Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASSWORD,
    },
  });
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Plantilla HTML responsive (estilos inline: los clientes de correo no cargan CSS externo).
function activationEmailHtml({ name, link, email }) {
  const greeting = name ? `Hola ${escapeHtml(name)},` : 'Hola,';
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Tu acceso a AppIngles está listo</title>
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f1f5f9;padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.08);">
        <tr><td style="background-color:#0e7c66;padding:28px 32px;text-align:center;">
          <div style="width:56px;height:56px;margin:0 auto 10px auto;background:#ffffff;border-radius:14px;color:#0e7c66;font-size:26px;font-weight:900;line-height:56px;text-align:center;">21</div>
          <div style="color:#ffffff;font-size:18px;font-weight:700;">Inglés en 21 Días</div>
          <div style="color:#a7f3d0;font-size:12px;margin-top:2px;">AppIngles · Ingresos Digitales</div>
        </td></tr>
        <tr><td style="padding:32px;">
          <h1 style="margin:0 0 12px 0;font-size:22px;line-height:1.3;color:#0f172a;">Tu acceso a AppIngles está listo 🎉</h1>
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#334155;">${greeting}</p>
          <p style="margin:0 0 14px 0;font-size:15px;line-height:1.6;color:#334155;">¡Tu compra del <strong>Reto de Inglés en 21 Días</strong> fue confirmada!</p>
          <p style="margin:0 0 22px 0;font-size:15px;line-height:1.6;color:#334155;">Ya puedes activar tu cuenta y comenzar tu reto. Haz clic en el botón para crear tu contraseña:</p>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding-bottom:22px;">
            <a href="${link}" style="display:inline-block;background-color:#0e7c66;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;padding:14px 36px;border-radius:12px;">ACTIVAR MI ACCESO</a>
          </td></tr></table>
          <p style="margin:0 0 6px 0;font-size:13px;line-height:1.6;color:#64748b;">Después podrás entrar directamente a:<br /><strong style="color:#0e7c66;">${APP_URL}/appingles</strong></p>
          <p style="margin:0 0 18px 0;font-size:13px;line-height:1.6;color:#64748b;">Tu acceso está asociado al correo utilizado durante tu compra:<br /><strong style="color:#0f172a;">${escapeHtml(email)}</strong></p>
          <p style="margin:0 0 4px 0;font-size:14px;color:#334155;">¡Nos vemos en el Día 1!</p>
          <p style="margin:0;font-size:14px;color:#334155;"><strong>Equipo Ingresos Digitales</strong></p>
          <p style="margin:18px 0 0 0;font-size:12px;line-height:1.5;color:#94a3b8;">Si el botón no funciona, copia y pega este enlace en tu navegador:<br /><a href="${link}" style="color:#0e7c66;word-break:break-all;">${link}</a></p>
        </td></tr>
        <tr><td style="background-color:#f8fafc;padding:18px 32px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;font-size:11px;line-height:1.5;color:#94a3b8;">Recibiste este correo porque se registró una compra de AppIngles con este correo electrónico. Si no fuiste tú, ignora este mensaje o escribe a ${SUPPORT_EMAIL}.</p>
          <p style="margin:6px 0 0 0;font-size:11px;color:#94a3b8;">© Ingresos Digitales · <a href="${APP_URL}" style="color:#64748b;">ingresosdigitalesit.com</a> · Soporte: ${SUPPORT_EMAIL}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

// Envía (o registra en dry-run) el email de activación.
// Devuelve { sent, transport, error? }. Nunca lanza: un fallo de correo no debe
// romper la activación del acceso (el enlace puede reenviarse).
async function sendActivationEmail({ to, name, link }) {
  const subject = 'Tu acceso a AppIngles está listo 🎉';
  const html = activationEmailHtml({ name, link, email: to });
  transporter = transporter || initTransporter();

  if (smtpConfigured && transporter) {
    try {
      await transporter.sendMail({
        from: `"AppIngles" <${MAIL_FROM}>`,
        to,
        subject,
        html,
        text: `Tu acceso a AppIngles está listo. Crea tu contraseña aquí: ${link}`,
      });
      await store.setDoc('mailOutbox', `${to}_sent_${Date.now()}`, {
        to,
        subject,
        template: 'activation',
        transport: 'smtp',
        link,
        sentAt: new Date().toISOString(),
      });
      console.log(`[mailer] activation_email_sent to=${to} transport=smtp`);
      return { sent: true, transport: 'smtp' };
    } catch (err) {
      console.error(`[mailer] activation_email_failed to=${to} error=${err.message}`);
      // Fallback: registrar igualmente para que el enlace no se pierda. transport
      // queda en 'dryrun' (no 'smtp') porque NO se entregó de verdad — de lo
      // contrario el caller (activationEmailSent = mail.transport === 'smtp')
      // reportaba un falso "enviado" cuando en realidad falló la autenticación.
      await recordDryRun({ to, link, note: 'smtp_fallback' });
      return { sent: false, transport: 'dryrun', error: err.message };
    }
  }

  await recordDryRun({ to, link });
  return { sent: false, transport: 'dryrun' };
}

// Dry-run: guarda el email completo (con enlace) en 'mailOutbox' y lo muestra
// en logs. Es la vía que usan dev y tests automatizados.
async function recordDryRun({ to, link, note }) {
  const id = `${to}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  await store.setDoc('mailOutbox', id, {
    to,
    subject: 'Tu acceso a AppIngles está listo 🎉',
    template: 'activation',
    transport: 'dryrun',
    note: note || null,
    link,
    sentAt: new Date().toISOString(),
  });
  console.log(`[mailer] activation_email_dryrun to=${to} link=${link}${note ? ` (${note})` : ''}`);
}

module.exports = { sendActivationEmail, activationEmailHtml, MAIL_FROM, SUPPORT_EMAIL };
