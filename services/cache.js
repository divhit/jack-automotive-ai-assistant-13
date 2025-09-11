import redisManager from './redis.js';

class CacheManager {
  constructor() {
    this.redis = redisManager;
    this.fallbackMaps = new Map(); // In-memory fallback
    this.enableFallback = true;
    this.keyPrefix = process.env.NODE_ENV === 'production' ? 'jack:prod:' : 'jack:dev:';
    this.defaultTTL = 7200; // 2 hours default
    this.compressionThreshold = 1024; // Compress values larger than 1KB
  }

  // Generate organization-scoped cache key
  generateKey(type, orgId, identifier = '') {
    const cleanOrgId = orgId ? String(orgId).replace(/[^a-zA-Z0-9-_]/g, '') : 'global';
    const cleanIdentifier = identifier ? String(identifier).replace(/[^a-zA-Z0-9-_]/g, '') : '';
    const suffix = cleanIdentifier ? `:${cleanIdentifier}` : '';
    return `${this.keyPrefix}${type}:${cleanOrgId}${suffix}`;
  }

  // Get value with fallback
  async get(key, orgId = null) {
    const fullKey = orgId ? this.generateKey(key, orgId) : this.generateKey(key, 'global');
    const start = Date.now();

    try {
      if (this.redis.isReady()) {
        const value = await this.redis.getClient().get(fullKey);
        const responseTime = Date.now() - start;
        
        if (value !== null) {
          this.redis.recordOperation('get', responseTime, true);
          return this.deserialize(value);
        } else {
          this.redis.recordOperation('get', responseTime, false);
          return null;
        }
      }
    } catch (error) {
      console.warn(`Redis GET error for key ${fullKey}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback to in-memory cache
    if (this.enableFallback) {
      const fallbackValue = this.fallbackMaps.get(fullKey);
      if (fallbackValue) {
        // Check if TTL expired
        if (fallbackValue.expires && Date.now() > fallbackValue.expires) {
          this.fallbackMaps.delete(fullKey);
          return null;
        }
        return fallbackValue.data;
      }
    }

    return null;
  }

  // Set value with TTL
  async set(key, value, ttl = null, orgId = null) {
    const fullKey = orgId ? this.generateKey(key, orgId) : this.generateKey(key, 'global');
    const finalTTL = ttl || this.defaultTTL;
    const start = Date.now();
    const serializedValue = this.serialize(value);

    try {
      if (this.redis.isReady()) {
        if (finalTTL > 0) {
          await this.redis.getClient().setex(fullKey, finalTTL, serializedValue);
        } else {
          await this.redis.getClient().set(fullKey, serializedValue);
        }
        
        const responseTime = Date.now() - start;
        this.redis.recordOperation('set', responseTime);
        return true;
      }
    } catch (error) {
      console.warn(`Redis SET error for key ${fullKey}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback to in-memory cache
    if (this.enableFallback) {
      const expires = finalTTL > 0 ? Date.now() + (finalTTL * 1000) : null;
      this.fallbackMaps.set(fullKey, { data: value, expires });
      return true;
    }

    return false;
  }

  // Delete key
  async delete(key, orgId = null) {
    const fullKey = orgId ? this.generateKey(key, orgId) : this.generateKey(key, 'global');
    const start = Date.now();

    try {
      if (this.redis.isReady()) {
        const result = await this.redis.getClient().del(fullKey);
        const responseTime = Date.now() - start;
        this.redis.recordOperation('delete', responseTime);
        
        // Also remove from fallback
        this.fallbackMaps.delete(fullKey);
        return result > 0;
      }
    } catch (error) {
      console.warn(`Redis DELETE error for key ${fullKey}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback deletion
    return this.fallbackMaps.delete(fullKey);
  }

  // Hash operations for complex objects (like conversation contexts)
  async hget(hashKey, field, orgId = null) {
    const fullKey = orgId ? this.generateKey(hashKey, orgId) : this.generateKey(hashKey, 'global');
    const start = Date.now();

    try {
      if (this.redis.isReady()) {
        const value = await this.redis.getClient().hget(fullKey, field);
        const responseTime = Date.now() - start;
        
        if (value !== null) {
          this.redis.recordOperation('hget', responseTime, true);
          return this.deserialize(value);
        } else {
          this.redis.recordOperation('hget', responseTime, false);
          return null;
        }
      }
    } catch (error) {
      console.warn(`Redis HGET error for ${fullKey}.${field}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback
    const fallbackHash = this.fallbackMaps.get(fullKey);
    if (fallbackHash && fallbackHash.data && typeof fallbackHash.data === 'object') {
      return fallbackHash.data[field] || null;
    }
    return null;
  }

  async hset(hashKey, field, value, ttl = null, orgId = null) {
    const fullKey = orgId ? this.generateKey(hashKey, orgId) : this.generateKey(hashKey, 'global');
    const finalTTL = ttl || this.defaultTTL;
    const start = Date.now();
    const serializedValue = this.serialize(value);

    try {
      if (this.redis.isReady()) {
        await this.redis.getClient().hset(fullKey, field, serializedValue);
        
        // Set expiration if specified
        if (finalTTL > 0) {
          await this.redis.getClient().expire(fullKey, finalTTL);
        }
        
        const responseTime = Date.now() - start;
        this.redis.recordOperation('hset', responseTime);
        return true;
      }
    } catch (error) {
      console.warn(`Redis HSET error for ${fullKey}.${field}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback
    if (!this.fallbackMaps.has(fullKey)) {
      const expires = finalTTL > 0 ? Date.now() + (finalTTL * 1000) : null;
      this.fallbackMaps.set(fullKey, { data: {}, expires });
    }
    const fallbackHash = this.fallbackMaps.get(fullKey);
    fallbackHash.data[field] = value;
    return true;
  }

  async hdel(hashKey, field, orgId = null) {
    const fullKey = orgId ? this.generateKey(hashKey, orgId) : this.generateKey(hashKey, 'global');
    const start = Date.now();

    try {
      if (this.redis.isReady()) {
        const result = await this.redis.getClient().hdel(fullKey, field);
        const responseTime = Date.now() - start;
        this.redis.recordOperation('hdel', responseTime);
        
        // Also remove from fallback
        const fallbackHash = this.fallbackMaps.get(fullKey);
        if (fallbackHash && fallbackHash.data) {
          delete fallbackHash.data[field];
        }
        
        return result > 0;
      }
    } catch (error) {
      console.warn(`Redis HDEL error for ${fullKey}.${field}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback
    const fallbackHash = this.fallbackMaps.get(fullKey);
    if (fallbackHash && fallbackHash.data) {
      delete fallbackHash.data[field];
      return true;
    }
    return false;
  }

  // Get all hash fields
  async hgetall(hashKey, orgId = null) {
    const fullKey = orgId ? this.generateKey(hashKey, orgId) : this.generateKey(hashKey, 'global');
    const start = Date.now();

    try {
      if (this.redis.isReady()) {
        const hash = await this.redis.getClient().hgetall(fullKey);
        const responseTime = Date.now() - start;
        this.redis.recordOperation('hgetall', responseTime, Object.keys(hash).length > 0);
        
        // Deserialize all values
        const result = {};
        for (const [field, value] of Object.entries(hash)) {
          result[field] = this.deserialize(value);
        }
        return result;
      }
    } catch (error) {
      console.warn(`Redis HGETALL error for ${fullKey}:`, error.message);
      this.redis.metrics.errors++;
    }

    // Fallback
    const fallbackHash = this.fallbackMaps.get(fullKey);
    if (fallbackHash && fallbackHash.data) {
      // Check expiration
      if (fallbackHash.expires && Date.now() > fallbackHash.expires) {
        this.fallbackMaps.delete(fullKey);
        return {};
      }
      return fallbackHash.data;
    }
    return {};
  }

  // Clear organization-scoped cache
  async clearOrganizationCache(orgId) {
    const pattern = this.generateKey('*', orgId);
    
    try {
      if (this.redis.isReady()) {
        const keys = await this.redis.getClient().keys(pattern);
        if (keys.length > 0) {
          await this.redis.getClient().del(...keys);
          console.log(`🗑️ Cleared ${keys.length} Redis keys for organization ${orgId}`);
        }
      }
    } catch (error) {
      console.warn(`Error clearing Redis cache for org ${orgId}:`, error.message);
    }

    // Clear fallback cache for this org
    for (const key of this.fallbackMaps.keys()) {
      if (key.includes(`:${orgId}:`)) {
        this.fallbackMaps.delete(key);
      }
    }
  }

  // Serialize/deserialize with compression for large values
  serialize(value) {
    try {
      const jsonString = JSON.stringify(value);
      
      // Simple compression for large values (could be enhanced with actual compression)
      if (jsonString.length > this.compressionThreshold) {
        return `compressed:${jsonString}`;
      }
      
      return jsonString;
    } catch (error) {
      console.warn('Serialization error:', error.message);
      return JSON.stringify({ error: 'serialization_failed' });
    }
  }

  deserialize(value) {
    try {
      // Handle compression
      if (value.startsWith('compressed:')) {
        return JSON.parse(value.substring(11));
      }
      
      return JSON.parse(value);
    } catch (error) {
      console.warn('Deserialization error:', error.message);
      return null;
    }
  }

  // Cache statistics
  getStats() {
    const redisStats = this.redis.getMetrics();
    const fallbackSize = this.fallbackMaps.size;
    
    return {
      redis: redisStats,
      fallback: {
        size: fallbackSize,
        enabled: this.enableFallback
      },
      config: {
        keyPrefix: this.keyPrefix,
        defaultTTL: this.defaultTTL,
        compressionThreshold: this.compressionThreshold
      }
    };
  }

  // Health check
  async healthCheck() {
    const redisHealth = await this.redis.healthCheck();
    
    return {
      redis: redisHealth,
      cache: {
        status: 'healthy',
        fallbackEnabled: this.enableFallback,
        fallbackSize: this.fallbackMaps.size
      }
    };
  }
}

// Singleton instance
const cacheManager = new CacheManager();
export default cacheManager;