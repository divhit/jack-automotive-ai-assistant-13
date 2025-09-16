// Three-Layer Cache Manager
// Orchestrates LRU Memory Cache (L1) → Redis (L2) → Supabase (L3)
// Provides ultra-fast retrieval with intelligent fallback and write-through

import { cacheManager as lruCacheManager } from './lruCache.js';
import redisCache from './redisCache.js';
import cacheMetrics from '../utils/cacheMetrics.js';

class ThreeLayerCacheManager {
  constructor() {
    this.lru = lruCacheManager;
    this.redis = redisCache;
    this.metrics = cacheMetrics;

    // REQUEST DEDUPLICATION: Prevent race conditions for identical cache requests
    this.pendingRequests = new Map(); // key -> Promise
    this.requestTimeouts = new Map(); // key -> timeout handle
    this.REQUEST_TIMEOUT = 5000; // 5 second timeout for pending requests

    // Configuration for different data types
    this.config = {
      context: {
        lruTTL: 300000,    // 5 minutes
        redisTTL: 600,     // 10 minutes
        priority: 'high'   // High priority data
      },
      history: {
        lruTTL: 120000,    // 2 minutes
        redisTTL: 300,     // 5 minutes
        priority: 'medium'
      },
      summary: {
        lruTTL: 600000,    // 10 minutes
        redisTTL: 1200,    // 20 minutes
        priority: 'high'
      },
      lead: {
        lruTTL: 300000,    // 5 minutes
        redisTTL: 600,     // 10 minutes
        priority: 'high'
      },
      organization: {
        lruTTL: 3600000,   // 1 hour
        redisTTL: 7200,    // 2 hours
        priority: 'high'   // CRITICAL FIX: Organizations need high priority for <5ms lookups
      },
      session: {
        lruTTL: 180000,    // 3 minutes
        redisTTL: 300,     // 5 minutes
        priority: 'high'
      },
      comprehensive: {
        lruTTL: 600000,    // 10 minutes
        redisTTL: 1200,    // 20 minutes
        priority: 'medium'
      }
    };

    console.log('✅ Three-Layer Cache Manager initialized');
  }

  // Main get method with waterfall cache access and request deduplication
  async get(dataType, key, fallbackFunction = null) {
    const startTime = Date.now();
    const fullKey = this.buildKey(dataType, key);

    try {
      // QUICK L1 CHECK: Always check LRU first (no deduplication needed - synchronous)
      const lruData = this.lru.get(dataType, fullKey);
      if (lruData !== null) {
        const latency = Date.now() - startTime;
        this.metrics.recordHit('lru', latency, 'get');
        console.log(`⚡ L1 HIT: ${fullKey} (${latency}ms)`);
        return lruData;
      }

      // REQUEST DEDUPLICATION: Check if same request is already pending
      if (this.pendingRequests.has(fullKey)) {
        console.log(`🔄 DEDUP: Waiting for existing request for ${fullKey}`);
        const pendingPromise = this.pendingRequests.get(fullKey);
        const result = await pendingPromise;
        const latency = Date.now() - startTime;
        console.log(`🔄 DEDUP: Got result from pending request ${fullKey} (${latency}ms)`);
        return result;
      }

      // Start new deduplicated request
      const requestPromise = this._performCacheRequest(dataType, fullKey, fallbackFunction, startTime);

      // Store the promise for deduplication
      this.pendingRequests.set(fullKey, requestPromise);

      // Set timeout to cleanup stale requests
      const timeoutHandle = setTimeout(() => {
        this.pendingRequests.delete(fullKey);
        this.requestTimeouts.delete(fullKey);
        console.warn(`⚠️ Request timeout cleanup for ${fullKey}`);
      }, this.REQUEST_TIMEOUT);

      this.requestTimeouts.set(fullKey, timeoutHandle);

      try {
        const result = await requestPromise;
        return result;
      } finally {
        // Cleanup successful/failed request
        this.pendingRequests.delete(fullKey);
        if (this.requestTimeouts.has(fullKey)) {
          clearTimeout(this.requestTimeouts.get(fullKey));
          this.requestTimeouts.delete(fullKey);
        }
      }

    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordError('database', latency, 'get');
      console.error(`❌ Cache get error for ${fullKey}:`, error.message);

      // Try fallback function on error
      if (fallbackFunction) {
        try {
          return await fallbackFunction();
        } catch (fallbackError) {
          console.error(`❌ Fallback function error:`, fallbackError.message);
          return null;
        }
      }

      return null;
    }
  }

  // Internal method for actual cache request (used by deduplication)
  async _performCacheRequest(dataType, fullKey, fallbackFunction, startTime) {
    try {
      // L2: Check Redis Cache (1-10ms)
      const redisData = await this.redis.get(fullKey);
      if (redisData !== null) {
        const latency = Date.now() - startTime;
        this.metrics.recordHit('redis', latency, 'get');

        // Populate L1 cache
        this.lru.set(dataType, fullKey, redisData, this.config[dataType]?.lruTTL);

        console.log(`🔄 L2 HIT: ${fullKey} (${latency}ms) → populated L1`);
        return redisData;
      }

      // L3: Database/Function fallback (50-200ms)
      if (fallbackFunction) {
        const dbData = await fallbackFunction();
        if (dbData !== null && dbData !== undefined) {
          const latency = Date.now() - startTime;
          this.metrics.recordHit('database', latency, 'get');

          // Populate both L1 and L2 caches (fire-and-forget)
          this.setAll(dataType, this.extractOriginalKey(fullKey), dbData);

          console.log(`🗄️  L3 HIT: ${fullKey} (${latency}ms) → populated L1+L2`);
          return dbData;
        }
      }

      // Complete miss
      const latency = Date.now() - startTime;
      this.metrics.recordMiss('database', latency, 'get');
      console.log(`❌ MISS: ${fullKey} (${latency}ms)`);
      return null;

    } catch (error) {
      console.error(`❌ Cache request error for ${fullKey}:`, error.message);
      throw error; // Re-throw to be handled by main get method
    }
  }

  // Set data in all cache layers (write-through)
  async set(dataType, key, value) {
    const startTime = Date.now();
    const fullKey = this.buildKey(dataType, key);

    try {
      // L1: Set in LRU immediately (synchronous)
      this.lru.set(dataType, fullKey, value, this.config[dataType]?.lruTTL);

      // L2: Set in Redis (asynchronous)
      const redisPromise = this.redis.set(fullKey, value, this.config[dataType]?.redisTTL);

      // Don't wait for Redis to complete (fire-and-forget for speed)
      redisPromise.catch(error => {
        const latency = Date.now() - startTime;
        this.metrics.recordError('redis', latency, 'set');
        console.warn(`⚠️ Redis set failed for ${fullKey}:`, error.message);
      });

      const latency = Date.now() - startTime;
      this.metrics.recordHit('lru', latency, 'set');
      console.log(`✅ SET: ${fullKey} → L1 immediate, L2 async (${latency}ms)`);

      return true;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordError('lru', latency, 'set');
      console.error(`❌ Cache set error for ${fullKey}:`, error.message);
      return false;
    }
  }

  // Set data in all layers and wait for completion
  async setAll(dataType, key, value) {
    const startTime = Date.now();
    const fullKey = this.buildKey(dataType, key);

    try {
      console.log(`🔄 SET ALL START: ${fullKey} (${typeof value}, ${JSON.stringify(value).length} chars)`);

      // Set in both L1 and L2 in parallel
      const [lruResult, redisResult] = await Promise.allSettled([
        Promise.resolve(this.lru.set(dataType, fullKey, value, this.config[dataType]?.lruTTL)),
        this.redis.set(fullKey, value, this.config[dataType]?.redisTTL)
      ]);

      const latency = Date.now() - startTime;

      // ENHANCED DEBUG: Check what actually happened with each cache layer
      let lruSuccess = false;
      let redisSuccess = false;

      if (lruResult.status === 'fulfilled') {
        this.metrics.recordHit('lru', latency, 'set');
        lruSuccess = true;

        // Verify L1 cache actually has the data
        const verification = this.lru.get(dataType, fullKey);
        if (verification === null) {
          console.warn(`⚠️ L1 CACHE WRITE FAILED: ${fullKey} - data not found after set operation`);
          lruSuccess = false;
        } else {
          console.log(`✅ L1 VERIFIED: ${fullKey} successfully stored and retrievable`);
        }
      } else {
        this.metrics.recordError('lru', latency, 'set');
        console.error(`❌ L1 SET FAILED: ${fullKey} -`, lruResult.reason);
      }

      if (redisResult.status === 'fulfilled' && redisResult.value === true) {
        this.metrics.recordHit('redis', latency, 'set');
        redisSuccess = true;
        console.log(`✅ L2 SUCCESS: ${fullKey} stored in Redis`);
      } else {
        this.metrics.recordError('redis', latency, 'set');
        console.warn(`⚠️ L2 SET FAILED: ${fullKey} -`, redisResult.reason || redisResult.value);
      }

      const statusIcon = (lruSuccess && redisSuccess) ? '✅' :
                        (lruSuccess || redisSuccess) ? '⚠️' : '❌';

      console.log(`${statusIcon} SET ALL: ${fullKey} → L1:${lruSuccess ? '✅' : '❌'} L2:${redisSuccess ? '✅' : '❌'} (${latency}ms)`);

      return lruSuccess || redisSuccess; // Success if at least one layer worked
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordError('lru', latency, 'set');
      console.error(`❌ Cache setAll error for ${fullKey}:`, error.message);
      return false;
    }
  }

  // Check if key exists in any cache layer
  async has(dataType, key) {
    const fullKey = this.buildKey(dataType, key);

    // Check L1 first (fastest)
    if (this.lru.has(dataType, fullKey)) {
      return true;
    }

    // Check L2 if not in L1
    return await this.redis.has(fullKey);
  }

  // Delete from all cache layers
  async delete(dataType, key) {
    const startTime = Date.now();
    const fullKey = this.buildKey(dataType, key);

    try {
      // Delete from both layers
      const lruResult = this.lru.delete(dataType, fullKey);
      const redisPromise = this.redis.del(fullKey);

      // Don't wait for Redis (fire-and-forget)
      redisPromise.catch(error => {
        console.warn(`⚠️ Redis delete failed for ${fullKey}:`, error.message);
      });

      const latency = Date.now() - startTime;
      this.metrics.recordHit('lru', latency, 'delete');
      console.log(`🗑️  DELETE: ${fullKey} (${latency}ms)`);

      return lruResult;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordError('lru', latency, 'delete');
      console.error(`❌ Cache delete error for ${fullKey}:`, error.message);
      return false;
    }
  }

  // Invalidate cache entries by pattern
  async invalidatePattern(pattern) {
    const startTime = Date.now();

    try {
      // Invalidate in both layers
      const lruCount = this.lru.invalidatePattern(pattern);
      const redisPromise = this.redis.delPattern(pattern);

      // Don't wait for Redis
      redisPromise.catch(error => {
        console.warn(`⚠️ Redis pattern invalidation failed:`, error.message);
      });

      const latency = Date.now() - startTime;
      this.metrics.recordHit('lru', latency, 'invalidate');
      console.log(`🧹 INVALIDATE PATTERN: ${pattern} → ${lruCount} L1 entries (${latency}ms)`);

      return lruCount;
    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordError('lru', latency, 'invalidate');
      console.error(`❌ Cache invalidate pattern error:`, error.message);
      return 0;
    }
  }

  // Pre-warm cache with multiple keys
  async preWarm(dataType, keyValuePairs) {
    console.log(`🔥 Pre-warming ${dataType} cache with ${Object.keys(keyValuePairs).length} items...`);

    const promises = Object.entries(keyValuePairs).map(([key, value]) =>
      this.setAll(dataType, key, value)
    );

    const results = await Promise.allSettled(promises);
    const successCount = results.filter(r => r.status === 'fulfilled').length;

    console.log(`✅ Pre-warming complete: ${successCount}/${results.length} items cached`);
    return successCount;
  }

  // Extend TTL for hot data
  async extendTTL(dataType, key, additionalSeconds = 300) {
    const fullKey = this.buildKey(dataType, key);

    // Extend Redis TTL (LRU handles this automatically via access)
    const result = await this.redis.extendTTL(fullKey, additionalSeconds);

    if (result) {
      console.log(`⏰ Extended TTL for ${fullKey} by ${additionalSeconds}s`);
    }

    return result;
  }

  // Build cache key with consistent format
  buildKey(dataType, key) {
    return `cache:${dataType}:${key}`;
  }

  // Extract original key from full cache key
  extractOriginalKey(fullKey) {
    // fullKey format: "cache:dataType:originalKey"
    const parts = fullKey.split(':');
    if (parts.length >= 3) {
      return parts.slice(2).join(':'); // Join back in case original key had colons
    }
    return fullKey; // Fallback
  }

  // Get comprehensive cache statistics
  getStats() {
    return {
      lru: this.lru.getAllStats(),
      redis: this.redis.getStats(),
      metrics: this.metrics.getStats(),
      timestamp: new Date().toISOString()
    };
  }

  // Health check for all cache layers
  async healthCheck() {
    const results = {
      lru: { status: 'healthy', message: 'In-memory LRU cache operational' },
      redis: await this.redis.healthCheck(),
      overall: 'unknown'
    };

    // Determine overall health
    if (results.redis.status === 'healthy' || results.redis.status === 'disabled') {
      results.overall = 'healthy';
    } else if (results.redis.status === 'disconnected') {
      results.overall = 'degraded'; // Can still use L1 cache
    } else {
      results.overall = 'unhealthy';
    }

    return results;
  }

  // Clear all caches
  async clearAll() {
    console.log('🧹 Clearing all cache layers...');

    this.lru.clearAll();

    // Clear Redis patterns (fire-and-forget)
    this.redis.delPattern('cache:*').catch(error => {
      console.warn('⚠️ Redis clear failed:', error.message);
    });

    console.log('✅ All caches cleared');
  }

  // Graceful shutdown
  async shutdown() {
    console.log('🔄 Shutting down cache manager...');

    this.lru.destroy();
    await this.redis.disconnect();
    this.metrics.destroy();

    console.log('✅ Cache manager shutdown complete');
  }
}

// Singleton instance
const cacheManager = new ThreeLayerCacheManager();

// Graceful shutdown handling
process.on('SIGTERM', () => cacheManager.shutdown());
process.on('SIGINT', () => cacheManager.shutdown());

export { ThreeLayerCacheManager, cacheManager };
export default cacheManager;