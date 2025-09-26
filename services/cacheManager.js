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

    // OPTIMIZED: Configuration following BICI pattern - shorter TTLs for fresher data
    this.config = {
      context: {
        lruTTL: 60000,     // 1 minute (down from 5min - frequently changing data)
        redisTTL: 120,     // 2 minutes (down from 10min)
        priority: 'high'
      },
      history: {
        lruTTL: 120000,    // 2 minutes (unchanged - good balance)
        redisTTL: 300,     // 5 minutes (unchanged)
        priority: 'medium'
      },
      summary: {
        lruTTL: 120000,    // 2 minutes (down from 10min - conversation summaries change)
        redisTTL: 300,     // 5 minutes (down from 20min)
        priority: 'high'
      },
      lead: {
        lruTTL: 180000,    // 3 minutes (down from 5min - lead data updates frequently)
        redisTTL: 360,     // 6 minutes (down from 10min)
        priority: 'high'
      },
      organization: {
        lruTTL: 3600000,   // 1 hour (unchanged - static data)
        redisTTL: 7200,    // 2 hours (unchanged)
        priority: 'high'
      },
      session: {
        lruTTL: 120000,    // 2 minutes (down from 3min - active sessions change)
        redisTTL: 180,     // 3 minutes (down from 5min)
        priority: 'high'
      },
      comprehensive: {
        lruTTL: 300000,    // 5 minutes (down from 10min - comprehensive summaries)
        redisTTL: 600,     // 10 minutes (down from 20min)
        priority: 'medium'
      }
    };

    console.log('✅ Three-Layer Cache Manager initialized');
  }

  // OPTIMIZED: Simplified get method without request deduplication (BICI pattern)
  async get(dataType, key, fallbackFunction = null) {
    const startTime = Date.now();
    const fullKey = this.buildKey(dataType, key);

    try {
      // L1: Check LRU first (synchronous, <1ms)
      const lruData = this.lru.get(dataType, fullKey);
      if (lruData !== null) {
        const latency = Date.now() - startTime;
        this.metrics.recordHit('lru', latency, 'get');
        console.log(`⚡ L1 HIT: ${fullKey} (${latency}ms)`);
        return lruData;
      }

      // L2: Check Redis (fast async, 3-10ms)
      const redisData = await this.redis.get(fullKey);
      if (redisData !== null) {
        const latency = Date.now() - startTime;
        this.metrics.recordHit('redis', latency, 'get');

        // Populate L1 cache for next time
        this.lru.set(dataType, fullKey, redisData, this.config[dataType]?.lruTTL);

        console.log(`🔄 L2 HIT: ${fullKey} (${latency}ms) → populated L1`);
        return redisData;
      }

      // L3: Fallback to database (slowest, 50-150ms)
      if (fallbackFunction) {
        const dbData = await fallbackFunction();
        if (dbData) {
          const latency = Date.now() - startTime;
          this.metrics.recordMiss('database', latency);

          // Cache the result (fire-and-forget)
          this.set(dataType, key, dbData).catch(err =>
            console.warn(`Cache set failed after DB fallback: ${err.message}`)
          );

          console.log(`🗄️  L3 HIT: ${fullKey} (${latency}ms) → populated L1+L2`);
          return dbData;
        }
      }

      const latency = Date.now() - startTime;
      this.metrics.recordMiss('database', latency);
      console.log(`❌ MISS: ${fullKey} (${latency}ms)`);
      return null;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.metrics.recordError('database', latency, 'get');
      console.error(`❌ Cache get error for ${fullKey}:`, error.message);
      return null;
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

  // OPTIMIZED: Set data with fire-and-forget Redis writes (BICI pattern)
  async setAll(dataType, key, value) {
    const startTime = Date.now();
    const fullKey = this.buildKey(dataType, key);

    try {
      console.log(`🔄 SET ALL START: ${fullKey} (${typeof value}, ${JSON.stringify(value).length} chars)`);

      // L1: Set immediately (synchronous)
      this.lru.set(dataType, fullKey, value, this.config[dataType]?.lruTTL);

      // Verify L1 cache actually has the data
      const verification = this.lru.get(dataType, fullKey);
      const lruSuccess = verification !== null;

      if (lruSuccess) {
        console.log(`✅ L1 VERIFIED: ${fullKey} successfully stored and retrievable`);
      } else {
        console.warn(`⚠️ L1 CACHE WRITE FAILED: ${fullKey} - data not found after set operation`);
      }

      // L2: Fire-and-forget Redis write (non-blocking)
      this.redis.set(fullKey, value, this.config[dataType]?.redisTTL)
        .then(() => {
          console.log(`✅ L2 SUCCESS: ${fullKey} stored in Redis`);
          this.metrics.recordHit('redis', Date.now() - startTime, 'set');
        })
        .catch(error => {
          console.warn(`⚠️ L2 SET FAILED: ${fullKey} -`, error.message);
          this.metrics.recordError('redis', Date.now() - startTime, 'set');
        });

      const latency = Date.now() - startTime;
      this.metrics.recordHit('lru', latency, 'set');

      console.log(`✅ SET ALL: ${fullKey} → L1:${lruSuccess ? '✅' : '❌'} L2:🔥 fire-and-forget (${latency}ms)`);

      return lruSuccess; // Return immediately with L1 success
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