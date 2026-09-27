import axios from 'axios';
import { BaseDeliveryDispatcher } from './BaseDeliveryDispatcher.js';

export class ResendEmailDispatcher extends BaseDeliveryDispatcher {
  constructor() {
    super('Resend Email Dispatcher', 'email');
  }

  async dispatch({ lead, subject, messageBody, companyProfile, integrationConfig }) {
    const toEmail = lead?.clientInfo?.email;
    if (!toEmail) {
      throw new Error('Client email address is missing for Resend email dispatch.');
    }

    const apiKey = integrationConfig?.resend?.apiKey || process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error('Resend API Key is missing in Integration Settings.');
    }

    const fromEmail =
      integrationConfig?.resend?.fromEmail ||
      companyProfile?.senderEmail ||
      'onboarding@resend.dev';

    const response = await axios.post(
      'https://api.resend.com/emails',
      {
        from: fromEmail,
        to: [toEmail],
        subject: subject || `Regarding ${lead.title}`,
        text: messageBody,
        html: messageBody.replace(/\n/g, '<br/>')
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return {
      success: true,
      messageId: response.data.id,
      channel: 'email',
      details: `Dispatched via Resend API to ${toEmail}`
    };
  }
}
