import { BaseDeliveryDispatcher } from './BaseDeliveryDispatcher.js';

export class ManualClipboardDispatcher extends BaseDeliveryDispatcher {
  constructor() {
    super('Manual / Copy-Paste Dispatcher', 'manual');
  }

  async dispatch({ lead, subject, messageBody }) {
    const toEmail = lead?.clientInfo?.email || '';
    const platformUrl = lead?.sourceUrl || '';

    let mailtoUrl = '';
    if (toEmail) {
      const encodedSubject = encodeURIComponent(subject || `Regarding ${lead.title}`);
      const encodedBody = encodeURIComponent(messageBody || '');
      mailtoUrl = `mailto:${toEmail}?subject=${encodedSubject}&body=${encodedBody}`;
    }

    return {
      success: true,
      channel: 'manual',
      details: 'Draft prepared for manual dispatch. Copied to clipboard & platform opened.',
      actionUrl: platformUrl || mailtoUrl,
      mailtoUrl,
      platformUrl
    };
  }
}
