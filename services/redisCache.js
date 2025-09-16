// Redis Cache Service with automatic fallback and connection management
// Provides distributed caching layer with graceful degradation

import Redis from 'ioredis';

class RedisCache {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.isEnabled = false;
    this.connectionAttempts = 0;
    this.maxRetries = 3;
    this.retryDelay = 1000; // 1 second

    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      connectionsSucceeded: 0,
      connectionsFailed: 0
    };

    // Initialize Redis connection
    this.initialize();
  }

  async initialize() {
    try {
      const redisUrl = process.env.REDIS_URL;
      const redisHost = process.env.REDIS_HOST;
      const redisPort = process.env.REDIS_PORT;
      const redisPassword = process.env.REDIS_PASSWORD;

      // Skip Redis if not configured
      if (!redisUrl && !redisHost) {
        console.log('🔴 Redis not configured - caching will use memory-only');
        return;
      }

      console.log('🔄 Initializing Redis connection...');

      // Configure Redis connection
      const redisConfig = {
        // Connection timeout for ultra-fast fallback
        connectTimeout: 2000,
        commandTimeout: 50, // 50ms timeout for operations
        lazyConnect: true, // Don't connect immediately
        maxRetriesPerRequest: 2,
        retryDelayOnFailover: 100,

        // Retry strategy with exponential backoff
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 500);
          console.log(`🔄 Redis retry attempt ${times}, delay: ${delay}ms`);
          return delay;
        },

        // Connection event handlers
        onConnect: () => {
          console.log('🟢 Redis connected successfully');
          this.isConnected = true;
          this.connectionAttempts = 0;
          this.metrics.connectionsSucceeded++;
        },

        onReady: () => {
          console.log('✅ Redis ready for operations');
        },

        onError: (error) => {
          console.error('🔴 Redis connection error:', error.message);
          this.isConnected = false;
          this.metrics.connectionsFailed++;
        },

        onClose: () => {
          console.log('🔴 Redis connection closed');
          this.isConnected = false;
        },

        onReconnecting: (ms) => {
          console.log(`🔄 Redis reconnecting in ${ms}ms...`);
        }
      };

      // Create Redis instance
      if (redisUrl) {
        // Use Redis URL (Render Key Value format)
        this.redis = new Redis(redisUrl, redisConfig);
      } else {
        // Use individual connection parameters
        this.redis = new Redis({
          host: redisHost,
          port: parseInt(redisPort) || 6379,
          password: redisPassword,
          ...redisConfig
        });
      }

      this.isEnabled = true;

      // Test connection
      await this.testConnection();

    } catch (error) {
      console.error('❌ Redis initialization failed:', error.message);
      this.isEnabled = false;
      this.isConnected = false;
    }
  }

  async testConnection() {
    if (!this.redis) return false;

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      console.log(`✅ Redis connection test successful (${latency}ms latency)`);
      this.isConnected = true;
      return true;
    } catch (error) {
      console.error('❌ Redis connection test failed:', error.message);
      this.isConnected = false;
      return false;
    }
  }

  // Get value from Redis with automatic fallback
  async get(key) {
    if (!this.isEnabled || !this.isConnected) {
      this.metrics.misses++;
      return null;
    }

    try {
      const value = await this.redis.get(key);
      if (value) {
        this.metrics.hits++;
        return JSON.parse(value);
      } else {
        this.metrics.misses++;
        return null;
      }
    } catch (error) {
      console.warn(`⚠️ Redis GET error for key ${key}:`, error.message);
      this.metrics.errors++;
      return null;
    }
  }

  // Set value in Redis with TTL
  async set(key, value, ttlSeconds = 300) {
    if (!this.isEnabled || !this.isConnected) {
      return false;
    }

    try {
      const serialized = JSON.stringify(value);
      await this.redis.setex(key, ttlSeconds, serialized);
      return true;
    } catch (error) {
      console.warn(`⚠️ Redis SET error for key ${key}:`, error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Check if key exists
  async has(key) {
    if (!this.isEnabled || !this.isConnected) {
      return false;
    }

    try {
      const exists = await this.redis.exists(key);
      return exists === 1;
    } catch (error) {
      console.warn(`⚠️ Redis EXISTS error for key ${key}:`, error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Delete key from Redis
  async del(key) {
    if (!this.isEnabled || !this.isConnected) {
      return false;
    }

    try {
      const result = await this.redis.del(key);
      return result > 0;
    } catch (error) {
      console.warn(`⚠️ Redis DEL error for key ${key}:`, error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Delete multiple keys by pattern
  async delPattern(pattern) {
    if (!this.isEnabled || !this.isConnected) {
      return 0;
    }

    try {
      const keys = await this.redis.keys(pattern);
      if (keys.length === 0) return 0;

      const result = await this.redis.del(...keys);
      console.log(`🧹 Redis: Deleted ${result} keys matching pattern: ${pattern}`);
      return result;
    } catch (error) {
      console.warn(`⚠️ Redis DEL pattern error for ${pattern}:`, error.message);
      this.metrics.errors++;
      return 0;
    }
  }

  // Get multiple keys at once (pipeline)
  async mget(keys) {
    if (!this.isEnabled || !this.isConnected || keys.length === 0) {
      return {};
    }

    try {
      const values = await this.redis.mget(...keys);
      const result = {};

      for (let i = 0; i < keys.length; i++) {
        if (values[i]) {
          result[keys[i]] = JSON.parse(values[i]);
          this.metrics.hits++;
        } else {
          this.metrics.misses++;
        }
      }

      return result;
    } catch (error) {
      console.warn(`⚠️ Redis MGET error:`, error.message);
      this.metrics.errors++;
      return {};
    }
  }

  // Set multiple keys at once (pipeline)
  async mset(keyValuePairs, ttlSeconds = 300) {
    if (!this.isEnabled || !this.isConnected || Object.keys(keyValuePairs).length === 0) {
      return false;
    }

    try {
      const pipeline = this.redis.pipeline();

      for (const [key, value] of Object.entries(keyValuePairs)) {
        const serialized = JSON.stringify(value);
        pipeline.setex(key, ttlSeconds, serialized);
      }

      await pipeline.exec();
      return true;
    } catch (error) {
      console.warn(`⚠️ Redis MSET error:`, error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Extend TTL for a key (keep hot data longer)
  async extendTTL(key, additionalSeconds = 300) {
    if (!this.isEnabled || !this.isConnected) {
      return false;
    }

    try {
      const currentTTL = await this.redis.ttl(key);
      if (currentTTL > 0) {
        const newTTL = currentTTL + additionalSeconds;
        await this.redis.expire(key, newTTL);
        return true;
      }
      return false;
    } catch (error) {
      console.warn(`⚠️ Redis TTL extend error for key ${key}:`, error.message);
      this.metrics.errors++;
      return false;
    }
  }

  // Get cache statistics
  getStats() {
    const totalRequests = this.metrics.hits + this.metrics.misses;
    const hitRate = totalRequests > 0 ? (this.metrics.hits / totalRequests) * 100 : 0;
    const errorRate = totalRequests > 0 ? (this.metrics.errors / totalRequests) * 100 : 0;

    return {
      enabled: this.isEnabled,
      connected: this.isConnected,
      hits: this.metrics.hits,
      misses: this.metrics.misses,
      errors: this.metrics.errors,
      hitRate: hitRate.toFixed(2) + '%',
      errorRate: errorRate.toFixed(2) + '%',
      connectionsSucceeded: this.metrics.connectionsSucceeded,
      connectionsFailed: this.metrics.connectionsFailed
    };
  }

  // Reset metrics
  resetStats() {
    this.metrics = {
      hits: 0,
      misses: 0,
      errors: 0,
      connectionsSucceeded: this.metrics.connectionsSucceeded,
      connectionsFailed: this.metrics.connectionsFailed
    };
  }

  // Health check
  async healthCheck() {
    if (!this.isEnabled) {
      return { status: 'disabled', message: 'Redis not configured' };
    }

    if (!this.isConnected) {
      return { status: 'disconnected', message: 'Redis connection lost' };
    }

    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        status: 'healthy',
        latency: `${latency}ms`,
        ...this.getStats()
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        ...this.getStats()
      };
    }
  }

  // Graceful shutdown
  async disconnect() {
    if (this.redis) {
      console.log('🔄 Disconnecting from Redis...');
      await this.redis.quit();
      this.isConnected = false;
      console.log('✅ Redis disconnected');
    }
  }
}

// Singleton instance
const redisCache = new RedisCache();

export { RedisCache, redisCache };
export default redisCache;