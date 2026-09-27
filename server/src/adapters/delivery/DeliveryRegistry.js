import { SmtpEmailDispatcher } from './SmtpEmailDispatcher.js';
import { ResendEmailDispatcher } from './ResendEmailDispatcher.js';
import { ManualClipboardDispatcher } from './ManualClipboardDispatcher.js';

class DeliveryRegistry {
  constructor() {
    this.dispatchers = new Map();
    this.registerDefaultDispatchers();
  }

  registerDefaultDispatchers() {
    this.register('smtp', new SmtpEmailDispatcher());
    this.register('resend', new ResendEmailDispatcher());
    this.register('manual', new ManualClipboardDispatcher());
  }

  register(key, dispatcherInstance) {
    this.dispatchers.set(key.toLowerCase(), dispatcherInstance);
  }

  get(provider) {
    const key = (provider || 'manual').toLowerCase();
    return this.dispatchers.get(key) || this.dispatchers.get('manual');
  }

  listSupported() {
    return Array.from(this.dispatchers.keys());
  }
}

export const deliveryRegistry = new DeliveryRegistry();
