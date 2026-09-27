import nodemailer from 'nodemailer';
import { BaseDeliveryDispatcher } from './BaseDeliveryDispatcher.js';

export class SmtpEmailDispatcher extends BaseDeliveryDispatcher {
  constructor() {
    super('SMTP Email Dispatcher', 'email');
  }

  async dispatch({ lead, subject, messageBody, companyProfile, integrationConfig }) {
    const toEmail = lead?.clientInfo?.email;
    if (!toEmail) {
      throw new Error('Client email address is missing. Use manual dispatch or update client info.');
    }

    const host = integrationConfig?.smtp?.host || process.env.SMTP_HOST;
    const port = integrationConfig?.smtp?.port || Number(process.env.SMTP_PORT) || 587;
    const user = integrationConfig?.smtp?.user || process.env.SMTP_USER;
    const pass = integrationConfig?.smtp?.pass || process.env.SMTP_PASS;
    const secure = integrationConfig?.smtp?.secure ?? (port === 465);

    if (!host || !user || !pass) {
      throw new Error('SMTP credentials are not configured in .env or Integration Settings (host, user, pass required).');
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass
      }
    });

    const fromAddress = smtp.fromEmail || companyProfile.senderEmail || smtp.user;
    const fromName = smtp.fromName || companyProfile.senderName || 'Sales Team';

    const info = await transporter.sendMail({
      from: `"${fromName}" <${fromAddress}>`,
      to: toEmail,
      subject: subject || `Regarding ${lead.title}`,
      text: messageBody,
      html: messageBody.replace(/\n/g, '<br/>')
    });

    return {
      success: true,
      messageId: info.messageId,
      channel: 'email',
      details: `Dispatched via SMTP to ${toEmail}`
    };
  }
}
