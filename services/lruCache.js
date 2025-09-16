// LRU Cache Service with TTL support
// Ultra-fast in-memory caching with size limits and automatic expiration

class LRUCache {
  constructor(maxSize = 100, defaultTTL = 120000) {
    this.cache = new Map();
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;

    // Clean up expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 30000);
  }

  get(key) {
    if (!this.cache.has(key)) {
      this.missCount++;
      return null;
    }

    const item = this.cache.get(key);

    // Check if expired
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, item);
    this.hitCount++;

    return item.data;
  }

  set(key, value, ttl = this.defaultTTL) {
    const expiry = Date.now() + ttl;

    // If key exists, update it
    if (this.cache.has(key)) {
      this.cache.delete(key);
      this.cache.set(key, { data: value, expiry, createdAt: Date.now() });
      return;
    }

    // If at capacity, remove least recently used
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
      this.evictionCount++;
    }

    this.cache.set(key, { data: value, expiry, createdAt: Date.now() });
  }

  has(key) {
    if (!this.cache.has(key)) return false;

    const item = this.cache.get(key);
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
    this.evictionCount = 0;
  }

  // Clean up expired entries
  cleanup() {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, item] of this.cache.entries()) {
      if (now > item.expiry) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 LRU cleanup: removed ${cleanedCount} expired entries`);
    }
  }

  // Get cache statistics
  getStats() {
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;

    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitCount: this.hitCount,
      missCount: this.missCount,
      evictionCount: this.evictionCount,
      hitRate: hitRate.toFixed(2) + '%',
      memoryUsage: this.getMemoryUsage()
    };
  }

  // Estimate memory usage (rough calculation)
  getMemoryUsage() {
    let totalSize = 0;
    for (const [key, item] of this.cache.entries()) {
      totalSize += key.length * 2; // String keys (UTF-16)
      totalSize += JSON.stringify(item.data).length * 2; // Estimate data size
      totalSize += 16; // Overhead for expiry and createdAt
    }
    return `${(totalSize / 1024).toFixed(2)} KB`;
  }

  // Get all keys (for debugging)
  keys() {
    return Array.from(this.cache.keys());
  }

  // Destroy cache and cleanup
  destroy() {
    clearInterval(this.cleanupInterval);
    this.clear();
  }
}

// Pre-configured cache instances for different data types
class CacheManager {
  constructor() {
    // Different cache configurations optimized for different data patterns
    this.caches = {
      // Context cache: High-value, medium TTL (increased size for better hit rate)
      context: new LRUCache(200, 300000),      // 200 items, 5 min TTL (increased from 50)

      // History cache: Frequent access, short TTL (increased size for better performance)
      history: new LRUCache(500, 120000),     // 500 items, 2 min TTL (increased from 100)

      // Summary cache: Large data, long TTL (increased size for better hit rate)
      summary: new LRUCache(200, 600000),      // 200 items, 10 min TTL (increased from 50)

      // Lead cache: Critical data, medium TTL (increased size for heavy usage)
      lead: new LRUCache(1000, 300000),        // 1000 items, 5 min TTL (increased from 200)

      // Organization cache: CRITICAL - increased from 20 to 500 items for <5ms lookups
      organization: new LRUCache(500, 3600000), // 500 items, 1 hour TTL (increased from 20)

      // Session cache: Active conversations, medium TTL (increased for concurrent users)
      session: new LRUCache(200, 180000),      // 200 items, 3 min TTL (increased from 30)

      // Comprehensive summary cache: Large data, long TTL (increased for better performance)
      comprehensive: new LRUCache(100, 600000)  // 100 items, 10 min TTL (increased from 30)
    };

    // Periodic stats logging
    this.statsInterval = setInterval(() => this.logStats(), 60000); // Every minute
  }

  get(cacheType, key) {
    if (!this.caches[cacheType]) {
      console.warn(`⚠️ Unknown cache type: ${cacheType}`);
      return null;
    }

    return this.caches[cacheType].get(key);
  }

  set(cacheType, key, value, ttl) {
    if (!this.caches[cacheType]) {
      console.warn(`⚠️ Unknown cache type: ${cacheType}`);
      return;
    }

    this.caches[cacheType].set(key, value, ttl);
  }

  has(cacheType, key) {
    if (!this.caches[cacheType]) return false;
    return this.caches[cacheType].has(key);
  }

  delete(cacheType, key) {
    if (!this.caches[cacheType]) return false;
    return this.caches[cacheType].delete(key);
  }

  // Clear specific cache type
  clear(cacheType) {
    if (!this.caches[cacheType]) return;
    this.caches[cacheType].clear();
  }

  // Clear all caches
  clearAll() {
    Object.values(this.caches).forEach(cache => cache.clear());
  }

  // Get stats for all caches
  getAllStats() {
    const stats = {};
    for (const [type, cache] of Object.entries(this.caches)) {
      stats[type] = cache.getStats();
    }
    return stats;
  }

  // Log stats periodically
  logStats() {
    const stats = this.getAllStats();
    console.log('📊 LRU Cache Stats:', JSON.stringify(stats, null, 2));
  }

  // Invalidate cache entries by pattern
  invalidatePattern(pattern) {
    let totalInvalidated = 0;

    for (const [cacheType, cache] of Object.entries(this.caches)) {
      const keys = cache.keys();
      let invalidated = 0;

      for (const key of keys) {
        if (this.matchPattern(pattern, key)) {
          cache.delete(key);
          invalidated++;
        }
      }

      if (invalidated > 0) {
        console.log(`🧹 Invalidated ${invalidated} ${cacheType} cache entries matching: ${pattern}`);
        totalInvalidated += invalidated;
      }
    }

    return totalInvalidated;
  }

  // Simple pattern matching (supports * wildcard)
  matchPattern(pattern, str) {
    const regex = new RegExp(pattern.replace(/\*/g, '.*'));
    return regex.test(str);
  }

  // Destroy all caches and cleanup
  destroy() {
    clearInterval(this.statsInterval);
    Object.values(this.caches).forEach(cache => cache.destroy());
  }
}

// Singleton instance
const cacheManager = new CacheManager();

export { LRUCache, CacheManager, cacheManager };
export default cacheManager;