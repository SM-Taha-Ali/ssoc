/**
 * Base abstract class for outbound message delivery dispatchers.
 */
export class BaseDeliveryDispatcher {
  constructor(name, channel) {
    if (new.target === BaseDeliveryDispatcher) {
      throw new TypeError('Cannot construct BaseDeliveryDispatcher directly.');
    }
    this.name = name;
    this.channel = channel; // 'email' | 'platform' | 'manual'
  }

  /**
   * Dispatches the initial pitch or follow-up
   * @param {Object} params - { lead, subject, messageBody, companyProfile, integrationConfig }
   * @returns {Promise<{ success: boolean, messageId?: string, actionUrl?: string, details?: string }>}
   */
  async dispatch(params) {
    throw new Error('dispatch() must be implemented by subclass.');
  }
}
