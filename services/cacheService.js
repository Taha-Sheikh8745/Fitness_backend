/**
 * Simple in-memory cache service for AI and Analytics results.
 */
class CacheService {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, durationInMinutes = 30) {
    const expiresAt = Date.now() + durationInMinutes * 60 * 1000;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const data = this.cache.get(key);
    if (!data) return null;

    if (Date.now() > data.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return data.value;
  }

  delete(key) {
    this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }
}

module.exports = new CacheService();
