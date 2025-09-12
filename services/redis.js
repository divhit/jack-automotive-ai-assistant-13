import Redis from 'ioredis';

class RedisManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    
    // Support both connection string (REDIS_URL) and individual parameters
    this.config = this.buildRedisConfig();
    
    console.log('🔧 Redis Config:', {
      hasUrl: !!process.env.REDIS_URL,
      host: this.config.host || 'from url',
      port: this.config.port || 'from url',
      db: this.config.db
    });
    
    this.initializeProperties();
  }

  buildRedisConfig() {
    // If REDIS_URL is provided (from Render service), use it directly
    if (process.env.REDIS_URL) {
      console.log('🔧 Using Redis connection string from REDIS_URL');
      // For ioredis, pass the URL directly as the first parameter
      return process.env.REDIS_URL;
    }
    
    // Otherwise use individual parameters
    return {
      host: process.env.REDIS_HOST || 'localhost',
      port: process.env.REDIS_PORT || 6379,
      password: process.env.REDIS_PASSWORD || undefined,
      db: process.env.REDIS_DB || 0,
      retryDelayOnFailover: 100,
      enableReadyCheck: true,
      maxRetriesPerRequest: 2,
      lazyConnect: true,
      keepAlive: 30000,
      family: 4,
      connectTimeout: 5000,
      commandTimeout: 3000,
      retryDelayOnClusterDown: 300,
      retryDelayOnReconnect: 200,
    };
  }

  initializeProperties() {
    // Connection pool settings
    this.poolConfig = {
      min: 5,
      max: 20,
      acquireTimeoutMillis: 5000,
      createTimeoutMillis: 3000,
      destroyTimeoutMillis: 5000,
      idleTimeoutMillis: 30000,
      reapIntervalMillis: 1000,
      createRetryIntervalMillis: 100,
    };

    this.connectionAttempts = 0;
    this.maxConnectionAttempts = 3;
    this.reconnectDelay = 1000;
    
    // Performance metrics
    this.metrics = {
      hits: 0,
      misses: 0,
      operations: 0,
      errors: 0,
      connectionLost: 0,
      avgResponseTime: 0,
      responseTimeCount: 0,
    };
    
    this.init();
  }

  async init() {
    try {
      console.log('🔄 Initializing Redis connection...');
      console.log('🔧 Config type:', typeof this.config);
      
      // Create Redis client - handle both URL string and config object
      if (typeof this.config === 'string') {
        console.log('🔗 Connecting with URL:', this.config.substring(0, 20) + '...');
        this.client = new Redis(this.config, {
          maxRetriesPerRequest: 2,
          connectTimeout: 10000,
          commandTimeout: 5000,
          retryDelayOnReconnect: 500,
          lazyConnect: false, // Connect immediately when using URL
        });
      } else {
        console.log('🔧 Connecting with config object');
        this.client = new Redis(this.config);
      }
      
      // Connection event handlers
      this.client.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
        this.connectionAttempts = 0;
      });
      
      this.client.on('ready', () => {
        console.log('🚀 Redis client ready for operations');
        this.isConnected = true;
      });
      
      this.client.on('error', (err) => {
        console.error('❌ Redis connection error:', err.message);
        console.error('❌ Error details:', err.code || 'NO_CODE', err.errno || 'NO_ERRNO');
        this.isConnected = false;
        this.metrics.errors++;
        this.handleConnectionError(err);
      });
      
      this.client.on('close', () => {
        console.warn('⚠️ Redis connection closed');
        this.isConnected = false;
        this.metrics.connectionLost++;
      });
      
      this.client.on('reconnecting', (ms) => {
        console.log(`🔄 Redis reconnecting in ${ms}ms...`);
      });

      // Test connection with timeout
      console.log('🔍 Testing Redis connection...');
      await Promise.race([
        this.client.ping(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 10000))
      ]);
      console.log('📡 Redis connection tested successfully');
      
    } catch (error) {
      console.error('💥 Failed to initialize Redis:', error.message);
      console.error('💥 Error stack:', error.stack);
      this.handleInitError(error);
    }
  }

  handleConnectionError(error) {
    if (this.connectionAttempts < this.maxConnectionAttempts) {
      this.connectionAttempts++;
      console.log(`🔄 Attempting to reconnect (${this.connectionAttempts}/${this.maxConnectionAttempts})...`);
      // Don't call init() again - ioredis handles reconnection automatically
    } else {
      console.error('💥 Max connection attempts reached. Redis will operate in fallback mode.');
      // Disconnect to stop reconnection attempts
      if (this.client) {
        this.client.disconnect();
      }
    }
  }

  handleInitError(error) {
    console.warn('⚠️ Redis unavailable, falling back to in-memory cache');
    this.isConnected = false;
  }

  // Health check
  async healthCheck() {
    if (!this.isConnected || !this.client) {
      return { status: 'unhealthy', error: 'Not connected' };
    }
    
    try {
      const start = Date.now();
      await this.client.ping();
      const responseTime = Date.now() - start;
      
      // Get memory usage safely
      let memory = 'unavailable';
      try {
        const info = await this.client.info('memory');
        const memoryMatch = info.match(/used_memory:(\d+)/);
        memory = memoryMatch ? `${Math.round(memoryMatch[1] / 1024 / 1024)}MB` : 'unavailable';
      } catch (memError) {
        memory = 'unavailable';
      }
      
      return {
        status: 'healthy',
        responseTime: `${responseTime}ms`,
        memory: memory,
        info: await this.client.info('server'),
      };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  // Performance tracking
  recordOperation(operationType, responseTime, isHit = null) {
    this.metrics.operations++;
    
    if (isHit !== null) {
      if (isHit) {
        this.metrics.hits++;
      } else {
        this.metrics.misses++;
      }
    }
    
    // Update average response time
    this.metrics.responseTimeCount++;
    this.metrics.avgResponseTime = 
      ((this.metrics.avgResponseTime * (this.metrics.responseTimeCount - 1)) + responseTime) / 
      this.metrics.responseTimeCount;
  }

  getMetrics() {
    const hitRate = this.metrics.hits + this.metrics.misses > 0 
      ? ((this.metrics.hits / (this.metrics.hits + this.metrics.misses)) * 100).toFixed(2)
      : '0.00';
    
    return {
      ...this.metrics,
      hitRate: `${hitRate}%`,
      avgResponseTime: `${this.metrics.avgResponseTime.toFixed(2)}ms`,
      isConnected: this.isConnected,
      connectionAttempts: this.connectionAttempts,
    };
  }

  // Graceful shutdown
  async shutdown() {
    if (this.client) {
      console.log('🔄 Shutting down Redis connection...');
      await this.client.quit();
      console.log('✅ Redis connection closed gracefully');
    }
  }

  // Get Redis client (for direct operations if needed)
  getClient() {
    return this.client;
  }

  // Connection status
  isReady() {
    return this.isConnected && this.client && this.client.status === 'ready';
  }
}

// Singleton instance
const redisManager = new RedisManager();

// Graceful shutdown handlers
process.on('SIGINT', async () => {
  console.log('\n🔄 Received SIGINT, shutting down gracefully...');
  await redisManager.shutdown();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🔄 Received SIGTERM, shutting down gracefully...');
  await redisManager.shutdown();
  process.exit(0);
});

export default redisManager;