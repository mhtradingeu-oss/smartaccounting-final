const logger = require('../logger');

let Redis;
try {
  Redis = require('ioredis');
} catch (error) {
  Redis = null;
  logger.warn('ioredis is not installed; Redis cache disabled', {
    error: error.message,
  });
}

class CacheManager {
  constructor() {
    this.memoryCache = new Map();
    this.ttlMap = new Map();
    this.stats = {
      hits: 0,
      misses: 0,
      sets: 0,
      deletes: 0,
    };

    if (Redis && process.env.REDIS_URL) {
      this.redis = new Redis(process.env.REDIS_URL, {
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
      });

      this.redis.on('connect', () => {
        logger.info('Redis cache connected successfully');
      });

      this.redis.on('error', (err) => {
        logger.warn('Redis cache error, falling back to memory cache', { error: err.message });
      });

      this.redis.connect().catch((err) => {
        logger.warn('Redis cache failed to connect, using memory cache', { error: err.message });
      });
    }

    // Store interval and unref to avoid keeping Node process alive (prevents Jest open handle warning)
    this._cleanupInterval = setInterval(() => this.cleanup(), 300000);
    if (typeof this._cleanupInterval.unref === 'function') {
      this._cleanupInterval.unref();
    }
  }

  generateKey(namespace, key, params = {}) {
    const baseKey = `smartaccounting:${namespace}:${key}`;
    if (Object.keys(params).length > 0) {
      const paramString = Object.keys(params)
        .sort()
        .map(k => `${k}=${params[k]}`)
        .join('&');
      return `${baseKey}:${Buffer.from(paramString).toString('base64')}`;
    }
    return baseKey;
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      this.stats.sets++;
      const serializedValue = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000,
      });

      if (this.redis && this.redis.status === 'ready') {
        await this.redis.setex(key, ttlSeconds, serializedValue);
        logger.debug(`Cache set in Redis: ${key}`);
        return true;
      }

      this.memoryCache.set(key, serializedValue);
      this.ttlMap.set(key, Date.now() + (ttlSeconds * 1000));
      logger.debug(`Cache set in memory: ${key}`);
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  async get(key) {
    try {
      let serializedValue;

      if (this.redis && this.redis.status === 'ready') {
        serializedValue = await this.redis.get(key);
        if (serializedValue) {
          this.stats.hits++;
          const parsed = JSON.parse(serializedValue);
          logger.debug(`Cache hit in Redis: ${key}`);
          return parsed.data;
        }
      }

      if (this.memoryCache.has(key)) {
        const ttl = this.ttlMap.get(key);
        if (ttl && ttl > Date.now()) {
          serializedValue = this.memoryCache.get(key);
          this.stats.hits++;
          const parsed = JSON.parse(serializedValue);
          logger.debug(`Cache hit in memory: ${key}`);
          return parsed.data;
        } else {
          
          this.memoryCache.delete(key);
          this.ttlMap.delete(key);
        }
      }

      this.stats.misses++;
      logger.debug(`Cache miss: ${key}`);
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      this.stats.misses++;
      return null;
    }
  }

  async delete(key) {
    try {
      this.stats.deletes++;

      if (this.redis && this.redis.status === 'ready') {
        await this.redis.del(key);
      }

      this.memoryCache.delete(key);
      this.ttlMap.delete(key);

      logger.debug(`Cache deleted: ${key}`);
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  async clear(pattern = '*') {
    try {
      
      if (this.redis && this.redis.status === 'ready') {
        if (pattern === '*') {
          await this.redis.flushdb();
        } else {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        }
      }

      if (pattern === '*') {
        this.memoryCache.clear();
        this.ttlMap.clear();
      } else {
        for (const key of this.memoryCache.keys()) {
          if (key.includes(pattern.replace('*', ''))) {
            this.memoryCache.delete(key);
            this.ttlMap.delete(key);
          }
        }
      }

      logger.info(`Cache cleared with pattern: ${pattern}`);
      return true;
    } catch (error) {
      logger.error('Cache clear error', { pattern, error: error.message });
      return false;
    }
  }

  getStats() {
    const hitRate = this.stats.hits + this.stats.misses > 0 
      ? (this.stats.hits / (this.stats.hits + this.stats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      redisStatus: this.redis ? this.redis.status : 'not_configured',
    };
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, ttl] of this.ttlMap.entries()) {
      if (ttl < now) {
        this.memoryCache.delete(key);
        this.ttlMap.delete(key);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug(`Cleaned up ${cleaned} expired cache entries`);
    }
  }

  async wrap(key, fn, ttlSeconds = 300) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }

    const result = await fn();
    await this.set(key, result, ttlSeconds);
    return result;
  }

  async mget(keys) {
    const results = {};
    for (const key of keys) {
      results[key] = await this.get(key);
    }
    return results;
  }

  async mset(keyValuePairs, ttlSeconds = 300) {
    const promises = Object.entries(keyValuePairs).map(([key, value]) =>
      this.set(key, value, ttlSeconds),
    );
    return Promise.all(promises);
  }
}

const CacheNamespaces = {
  USER: 'user',
  COMPANY: 'company',
  INVOICE: 'invoice',
  TAX_REPORT: 'tax_report',
  DASHBOARD: 'dashboard',
  BANK_STATEMENT: 'bank_statement',
  SYSTEM: 'system',
};

const cacheManager = new CacheManager();

module.exports = {
  cache: cacheManager,
  CacheNamespaces,
};
