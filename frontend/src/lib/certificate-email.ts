type CertificateEmailInput = {
  recipientEmail: string;
  recipientName: string;
  certificateNumber: string;
  pdf: Buffer;
};

function requiredEnv(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is not configured.`);
  return value;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character] ?? character);
}

export function getCertificateSender() {
  const email = requiredEnv("GMAIL_SMTP_USER");
  const name = process.env.CERTIFICATE_FROM_NAME?.trim() || "PawChain Certificates";
  return { email, name, formatted: `${name} <${email}>` };
}

export async function sendHeroCertificateEmail({
  recipientEmail,
  recipientName,
  certificateNumber,
  pdf,
}: CertificateEmailInput) {
  const sender = getCertificateSender();
  const appPassword = requiredEnv("GMAIL_APP_PASSWORD").replace(/\s+/g, "");
  const safeName = escapeHtml(recipientName);
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: { user: sender.email, pass: appPassword },
  });
  const result = await transporter.sendMail({
    from: sender.formatted,
    to: recipientEmail,
    subject: "Your PawChain Hero Donor Certificate",
    html: `<div style="font-family:Arial,sans-serif;color:#292524;line-height:1.6"><h1 style="color:#6d3db8">Congratulations, ${safeName}!</h1><p>You have achieved <strong>Hero Donor</strong> status with PawChain.</p><p>Your personalized certificate is attached. Thank you for your exceptional generosity and continued support for animal shelters.</p><p>Warm regards,<br><strong>PawChain Administration</strong></p><hr style="border:0;border-top:1px solid #fed7aa;margin:24px 0"><p style="color:#78716c;font-size:12px">This is an automated message from an unmonitored mailbox. Please do not reply.</p></div>`,
    text: `Congratulations, ${recipientName}! You have achieved Hero Donor status with PawChain. Your personalized certificate is attached. This is an automated message from an unmonitored mailbox. Please do not reply.`,
    attachments: [{
      filename: `PawChain-Hero-Certificate-${certificateNumber}.pdf`,
      content: pdf,
      contentType: "application/pdf",
    }],
  });
  return { providerMessageId: result.messageId, sender: sender.email };
}
import nodemailer from "nodemailer";
