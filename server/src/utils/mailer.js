import nodemailer from 'nodemailer';
import { config } from '../config/env.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: false,
  auth: config.smtp.user ? {
    user: config.smtp.user,
    pass: config.smtp.pass,
  } : undefined,
});

export async function sendPasswordResetEmail({ to, resetUrl }) {
  const mailOptions = {
    from: `"Brightloop Subscriptions" <${config.smtp.from}>`,
    to,
    subject: 'Reset your Brightloop password',
    text: `You requested a password reset. Click the link below or copy and paste it into your browser to reset your password within 30 minutes:\n\n${resetUrl}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #4f46e5; margin-bottom: 16px;">Brightloop Subscription Management</h2>
        <p style="color: #334155; font-size: 16px;">Hello,</p>
        <p style="color: #334155; font-size: 16px;">We received a request to reset your password. Click the button below to reset your password (valid for 30 minutes):</p>
        <div style="margin: 24px 0;">
          <a href="${resetUrl}" style="background-color: #4f46e5; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p style="color: #64748b; font-size: 14px;">Or copy and paste this URL into your browser:</p>
        <p style="color: #4f46e5; font-size: 13px; word-break: break-all;">${resetUrl}</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
        <p style="color: #94a3b8; font-size: 12px;">If you did not request this password reset, please safely ignore this email.</p>
      </div>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log(`Password reset email sent to ${to}. Message ID: ${info.messageId}`);
    return info;
  } catch (error) {
    // In dev or test environments when Mailpit is not running, log the link so developer is not blocked!
    console.warn(`[Mailer Warning] Failed to deliver email via SMTP (${config.smtp.host}:${config.smtp.port}): ${error.message}`);
    console.warn(`[Mailer Fallback Log] Password Reset URL: ${resetUrl}`);
    return null;
  }
}

export default { sendPasswordResetEmail };

