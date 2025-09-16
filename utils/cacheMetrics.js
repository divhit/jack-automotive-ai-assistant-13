// Cache Performance Metrics and Monitoring Utility
// Tracks performance across all cache layers for optimization

class CacheMetrics {
  constructor() {
    this.metrics = {
      // Layer-specific metrics
      lru: {
        hits: 0,
        misses: 0,
        operations: 0,
        totalLatency: 0,
        errors: 0
      },
      redis: {
        hits: 0,
        misses: 0,
        operations: 0,
        totalLatency: 0,
        errors: 0,
        timeouts: 0
      },
      database: {
        hits: 0,
        misses: 0,
        operations: 0,
        totalLatency: 0,
        errors: 0
      },
      // Operation-specific metrics
      operations: {
        get: { count: 0, totalTime: 0, errors: 0 },
        set: { count: 0, totalTime: 0, errors: 0 },
        delete: { count: 0, totalTime: 0, errors: 0 },
        invalidate: { count: 0, totalTime: 0, errors: 0 }
      },
      // Performance tracking
      performance: {
        fastestOperation: { operation: null, time: Infinity, timestamp: null },
        slowestOperation: { operation: null, time: 0, timestamp: null },
        averageLatency: 0,
        p95Latency: 0,
        operationTimes: [] // Rolling window of last 1000 operations
      }
    };

    // Start periodic reporting
    this.reportingInterval = setInterval(() => this.generateReport(), 300000); // Every 5 minutes
  }

  // Record cache hit for specific layer
  recordHit(layer, latency = 0, operation = 'get') {
    if (!this.metrics[layer]) return;

    this.metrics[layer].hits++;
    this.metrics[layer].operations++;
    this.metrics[layer].totalLatency += latency;

    this.recordOperation(operation, latency, false);
    this.updatePerformanceMetrics(operation, latency);
  }

  // Record cache miss for specific layer
  recordMiss(layer, latency = 0, operation = 'get') {
    if (!this.metrics[layer]) return;

    this.metrics[layer].misses++;
    this.metrics[layer].operations++;
    this.metrics[layer].totalLatency += latency;

    this.recordOperation(operation, latency, false);
    this.updatePerformanceMetrics(operation, latency);
  }

  // Record error for specific layer
  recordError(layer, latency = 0, operation = 'get', errorType = 'general') {
    if (!this.metrics[layer]) return;

    this.metrics[layer].errors++;
    this.metrics[layer].operations++;

    if (errorType === 'timeout' && layer === 'redis') {
      this.metrics.redis.timeouts++;
    }

    this.recordOperation(operation, latency, true);
  }

  // Record operation metrics
  recordOperation(operation, latency, isError) {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = { count: 0, totalTime: 0, errors: 0 };
    }

    this.metrics.operations[operation].count++;
    this.metrics.operations[operation].totalTime += latency;

    if (isError) {
      this.metrics.operations[operation].errors++;
    }
  }

  // Update performance tracking
  updatePerformanceMetrics(operation, latency) {
    const now = Date.now();

    // Track fastest operation
    if (latency < this.metrics.performance.fastestOperation.time) {
      this.metrics.performance.fastestOperation = {
        operation,
        time: latency,
        timestamp: now
      };
    }

    // Track slowest operation
    if (latency > this.metrics.performance.slowestOperation.time) {
      this.metrics.performance.slowestOperation = {
        operation,
        time: latency,
        timestamp: now
      };
    }

    // Add to rolling window (keep last 1000 operations)
    this.metrics.performance.operationTimes.push(latency);
    if (this.metrics.performance.operationTimes.length > 1000) {
      this.metrics.performance.operationTimes.shift();
    }

    // Update averages
    this.calculateLatencyMetrics();
  }

  // Calculate latency statistics
  calculateLatencyMetrics() {
    const times = this.metrics.performance.operationTimes;
    if (times.length === 0) return;

    // Average latency
    const sum = times.reduce((a, b) => a + b, 0);
    this.metrics.performance.averageLatency = sum / times.length;

    // P95 latency
    const sorted = [...times].sort((a, b) => a - b);
    const p95Index = Math.floor(sorted.length * 0.95);
    this.metrics.performance.p95Latency = sorted[p95Index] || 0;
  }

  // Get comprehensive statistics
  getStats() {
    // Calculate hit rates
    const calculateHitRate = (layer) => {
      const total = this.metrics[layer].hits + this.metrics[layer].misses;
      return total > 0 ? (this.metrics[layer].hits / total) * 100 : 0;
    };

    // Calculate average latencies
    const calculateAvgLatency = (layer) => {
      return this.metrics[layer].operations > 0
        ? this.metrics[layer].totalLatency / this.metrics[layer].operations
        : 0;
    };

    return {
      layers: {
        lru: {
          ...this.metrics.lru,
          hitRate: calculateHitRate('lru').toFixed(2) + '%',
          avgLatency: calculateAvgLatency('lru').toFixed(2) + 'ms'
        },
        redis: {
          ...this.metrics.redis,
          hitRate: calculateHitRate('redis').toFixed(2) + '%',
          avgLatency: calculateAvgLatency('redis').toFixed(2) + 'ms',
          timeoutRate: this.metrics.redis.operations > 0
            ? ((this.metrics.redis.timeouts / this.metrics.redis.operations) * 100).toFixed(2) + '%'
            : '0%'
        },
        database: {
          ...this.metrics.database,
          hitRate: calculateHitRate('database').toFixed(2) + '%',
          avgLatency: calculateAvgLatency('database').toFixed(2) + 'ms'
        }
      },
      operations: this.getOperationStats(),
      performance: {
        ...this.metrics.performance,
        averageLatency: this.metrics.performance.averageLatency.toFixed(2) + 'ms',
        p95Latency: this.metrics.performance.p95Latency.toFixed(2) + 'ms',
        totalOperations: this.metrics.performance.operationTimes.length
      },
      summary: this.getSummaryStats()
    };
  }

  // Get operation-specific statistics
  getOperationStats() {
    const operationStats = {};

    for (const [operation, data] of Object.entries(this.metrics.operations)) {
      operationStats[operation] = {
        count: data.count,
        avgLatency: data.count > 0 ? (data.totalTime / data.count).toFixed(2) + 'ms' : '0ms',
        errorRate: data.count > 0 ? ((data.errors / data.count) * 100).toFixed(2) + '%' : '0%',
        totalTime: data.totalTime.toFixed(2) + 'ms'
      };
    }

    return operationStats;
  }

  // Get high-level summary statistics
  getSummaryStats() {
    const totalOperations = this.metrics.lru.operations +
                           this.metrics.redis.operations +
                           this.metrics.database.operations;

    const totalHits = this.metrics.lru.hits +
                     this.metrics.redis.hits +
                     this.metrics.database.hits;

    const totalErrors = this.metrics.lru.errors +
                       this.metrics.redis.errors +
                       this.metrics.database.errors;

    const overallHitRate = totalOperations > 0 ? (totalHits / totalOperations) * 100 : 0;
    const errorRate = totalOperations > 0 ? (totalErrors / totalOperations) * 100 : 0;

    return {
      totalOperations,
      overallHitRate: overallHitRate.toFixed(2) + '%',
      errorRate: errorRate.toFixed(2) + '%',
      l1HitRate: this.metrics.lru.operations > 0 ?
        ((this.metrics.lru.hits / this.metrics.lru.operations) * 100).toFixed(2) + '%' : '0%',
      l2HitRate: this.metrics.redis.operations > 0 ?
        ((this.metrics.redis.hits / this.metrics.redis.operations) * 100).toFixed(2) + '%' : '0%'
    };
  }

  // Generate periodic performance report
  generateReport() {
    const stats = this.getStats();

    console.log('\n📊 ===== CACHE PERFORMANCE REPORT =====');
    console.log(`🕐 Report Time: ${new Date().toISOString()}`);
    console.log(`📈 Total Operations: ${stats.summary.totalOperations}`);
    console.log(`🎯 Overall Hit Rate: ${stats.summary.overallHitRate}`);
    console.log(`⚡ L1 (LRU) Hit Rate: ${stats.summary.l1HitRate}`);
    console.log(`🔄 L2 (Redis) Hit Rate: ${stats.summary.l2HitRate}`);
    console.log(`⚠️  Error Rate: ${stats.summary.errorRate}`);
    console.log(`🚀 Average Latency: ${stats.performance.averageLatency}`);
    console.log(`📊 P95 Latency: ${stats.performance.p95Latency}`);

    if (stats.layers.redis.timeoutRate !== '0%') {
      console.log(`⏰ Redis Timeout Rate: ${stats.layers.redis.timeoutRate}`);
    }

    console.log('========================================\n');

    // Alert on poor performance
    this.checkPerformanceAlerts(stats);
  }

  // Check for performance issues and log alerts
  checkPerformanceAlerts(stats) {
    const alerts = [];

    // Check overall hit rate
    const overallHitRate = parseFloat(stats.summary.overallHitRate);
    if (overallHitRate < 70) {
      alerts.push(`🔴 LOW HIT RATE: Overall hit rate is ${stats.summary.overallHitRate} (should be >70%)`);
    }

    // Check error rate
    const errorRate = parseFloat(stats.summary.errorRate);
    if (errorRate > 5) {
      alerts.push(`🔴 HIGH ERROR RATE: Error rate is ${stats.summary.errorRate} (should be <5%)`);
    }

    // Check Redis timeout rate
    const timeoutRate = parseFloat(stats.layers.redis.timeoutRate);
    if (timeoutRate > 10) {
      alerts.push(`🔴 HIGH TIMEOUT RATE: Redis timeout rate is ${stats.layers.redis.timeoutRate} (should be <10%)`);
    }

    // Check average latency
    const avgLatency = parseFloat(stats.performance.averageLatency);
    if (avgLatency > 50) {
      alerts.push(`⚠️  HIGH LATENCY: Average latency is ${stats.performance.averageLatency} (should be <50ms)`);
    }

    // Log alerts
    if (alerts.length > 0) {
      console.log('🚨 PERFORMANCE ALERTS:');
      alerts.forEach(alert => console.log(alert));
      console.log('');
    }
  }

  // Reset all metrics
  reset() {
    this.metrics = {
      lru: { hits: 0, misses: 0, operations: 0, totalLatency: 0, errors: 0 },
      redis: { hits: 0, misses: 0, operations: 0, totalLatency: 0, errors: 0, timeouts: 0 },
      database: { hits: 0, misses: 0, operations: 0, totalLatency: 0, errors: 0 },
      operations: {
        get: { count: 0, totalTime: 0, errors: 0 },
        set: { count: 0, totalTime: 0, errors: 0 },
        delete: { count: 0, totalTime: 0, errors: 0 },
        invalidate: { count: 0, totalTime: 0, errors: 0 }
      },
      performance: {
        fastestOperation: { operation: null, time: Infinity, timestamp: null },
        slowestOperation: { operation: null, time: 0, timestamp: null },
        averageLatency: 0,
        p95Latency: 0,
        operationTimes: []
      }
    };
  }

  // Destroy metrics and cleanup
  destroy() {
    clearInterval(this.reportingInterval);
  }
}

// Singleton instance
const cacheMetrics = new CacheMetrics();

export { CacheMetrics, cacheMetrics };
export default cacheMetrics;