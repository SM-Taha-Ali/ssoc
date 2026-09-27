/**
 * Base abstract class for all inbound lead sources.
 * To add a new platform (e.g. Freelancer, LinkedIn, Indeed), subclass this and register in LeadSourceRegistry.
 */
export class BaseLeadSource {
  constructor(name, platform) {
    if (new.target === BaseLeadSource) {
      throw new TypeError('Cannot construct BaseLeadSource instances directly.');
    }
    this.name = name;
    this.platform = platform;
  }

  /**
   * Fetches raw leads from the external platform or feed.
   * @param {Object} options - Feed URL, search queries, company targeting criteria, etc.
   * @returns {Promise<Array<Object>>} - Raw lead items
   */
  async fetchRawLeads(options = {}) {
    throw new Error('fetchRawLeads() must be implemented by subclass.');
  }

  /**
   * Normalizes raw platform data into standard Lead model format.
   * @param {Object} rawItem - Item from platform
   * @returns {Object} - Normalized lead object matching Lead schema
   */
  normalizeLead(rawItem) {
    throw new Error('normalizeLead() must be implemented by subclass.');
  }
}
