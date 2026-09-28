import { RssFeedAdapter } from './RssFeedAdapter.js';
import { RemoteOkAdapter } from './RemoteOkAdapter.js';
import { FreelancerApiAdapter } from './FreelancerApiAdapter.js';
import { HackerNewsJobAdapter } from './HackerNewsJobAdapter.js';
import { ApolloLeadAdapter } from './ApolloLeadAdapter.js';
import { WebhookLeadAdapter } from './WebhookLeadAdapter.js';
import { ManualPasteAdapter } from './ManualPasteAdapter.js';
import { LinkedInLeadAdapter } from './LinkedInLeadAdapter.js';

class LeadSourceRegistry {
  constructor() {
    this.adapters = new Map();
    this.registerDefaultAdapters();
  }

  registerDefaultAdapters() {
    this.register('rss', new RssFeedAdapter());
    this.register('upwork', new RssFeedAdapter());
    this.register('remoteok', new RemoteOkAdapter());
    this.register('freelancer', new FreelancerApiAdapter());
    this.register('linkedin', new LinkedInLeadAdapter());
    this.register('weworkremotely', new RssFeedAdapter());
    this.register('ycombinator', new HackerNewsJobAdapter());
    this.register('apollo', new ApolloLeadAdapter());
    this.register('webhook', new WebhookLeadAdapter());
    this.register('manual', new ManualPasteAdapter());
  }

  /**
   * Register a new adapter dynamically
   */
  register(platform, adapterInstance) {
    this.adapters.set(platform.toLowerCase(), adapterInstance);
  }

  /**
   * Get an adapter by platform name
   */
  get(platform) {
    const key = (platform || '').toLowerCase();
    return this.adapters.get(key) || this.adapters.get('rss');
  }

  /**
   * List all registered platform keys
   */
  listSupportedPlatforms() {
    return Array.from(this.adapters.keys());
  }
}

export const leadSourceRegistry = new LeadSourceRegistry();
