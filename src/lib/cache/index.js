'use strict';

const isTestEnvironment = process.env.NODE_ENV === 'test';
const environment = process.env.NODE_ENV || 'development';

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

/* ----------------------------------
 * Constants
 * ---------------------------------- */
const CacheNamespaces = {
  USER: 'user',
  COMPANY: 'company',
  INVOICE: 'invoice',
  TAX_REPORT: 'tax_report',
  DASHBOARD: 'dashboard',
  BANK_STATEMENT: 'bank_statement',
  SYSTEM: 'system',
};

/* ----------------------------------
 * No-op cache (tests)
 * ---------------------------------- */
const noopAsync = async () => null;

const noopCache = {
  get: noopAsync,
  set: noopAsync,
  delete: noopAsync,
  del: noopAsync,
  clear: async () => true,
  wrap: async (_key, fn) => (typeof fn === 'function' ? fn() : null),
  mget: async () => ({}),
  mset: async () => [],
  getStats: () => ({
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    hitRate: '0%',
    memorySize: 0,
    redisStatus: 'not_configured',
  }),
};

/* ----------------------------------
 * Production CacheManager
 * ---------------------------------- */
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
        logger.warn('Redis cache error, falling back to memory cache', {
          error: err.message,
        });
      });

      this.redis.connect().catch((err) => {
        logger.warn('Redis cache failed to connect, using memory cache', {
          error: err.message,
        });
      });
    }

    if (environment !== 'test') {
      const interval = setInterval(() => this.cleanup(), 300000);
      if (typeof interval.unref === 'function') {
        interval.unref();
      }
    }
  }

  generateKey(namespace, key, params = {}) {
    const baseKey = `smartaccounting:${namespace}:${key}`;
    if (Object.keys(params).length === 0) {
      return baseKey;
    }

    const paramString = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('&');

    return `${baseKey}:${Buffer.from(paramString).toString('base64')}`;
  }

  async set(key, value, ttlSeconds = 300) {
    try {
      this.stats.sets++;

      const payload = JSON.stringify({
        data: value,
        timestamp: Date.now(),
        ttl: ttlSeconds * 1000,
      });

      if (this.redis && this.redis.status === 'ready') {
        await this.redis.setex(key, ttlSeconds, payload);
        return true;
      }

      this.memoryCache.set(key, payload);
      this.ttlMap.set(key, Date.now() + ttlSeconds * 1000);
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  async get(key) {
    try {
      let payload;

      if (this.redis && this.redis.status === 'ready') {
        payload = await this.redis.get(key);
        if (payload) {
          this.stats.hits++;
          return JSON.parse(payload).data;
        }
      }

      if (this.memoryCache.has(key)) {
        const ttl = this.ttlMap.get(key);
        if (ttl && ttl > Date.now()) {
          this.stats.hits++;
          return JSON.parse(this.memoryCache.get(key)).data;
        }
        this.memoryCache.delete(key);
        this.ttlMap.delete(key);
      }

      this.stats.misses++;
      return null;
    } catch (error) {
      this.stats.misses++;
      logger.error('Cache get error', { key, error: error.message });
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
          if (keys.length) {
            await this.redis.del(...keys);
          }
        }
      }

      this.memoryCache.clear();
      this.ttlMap.clear();
      return true;
    } catch (error) {
      logger.error('Cache clear error', { pattern, error: error.message });
      return false;
    }
  }

  cleanup() {
    const now = Date.now();
    for (const [key, ttl] of this.ttlMap.entries()) {
      if (ttl < now) {
        this.memoryCache.delete(key);
        this.ttlMap.delete(key);
      }
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
    const out = {};
    for (const key of keys) {
      out[key] = await this.get(key);
    }
    return out;
  }

  async mset(pairs, ttlSeconds = 300) {
    return Promise.all(Object.entries(pairs).map(([k, v]) => this.set(k, v, ttlSeconds)));
  }

  getStats() {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total ? ((this.stats.hits / total) * 100).toFixed(2) : 0;

    return {
      ...this.stats,
      hitRate: `${hitRate}%`,
      memorySize: this.memoryCache.size,
      redisStatus: this.redis ? this.redis.status : 'not_configured',
    };
  }
}

const cacheManager = new CacheManager();

/* ----------------------------------
 * Conditional export ONLY
 * ---------------------------------- */
module.exports = isTestEnvironment
  ? { cache: noopCache, CacheNamespaces }
  : { cache: cacheManager, CacheNamespaces };
