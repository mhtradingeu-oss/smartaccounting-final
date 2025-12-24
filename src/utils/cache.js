const logger = require('../lib/logger');

const CACHE_ENABLED = process.env.CACHE_ENABLED === 'true';
const CACHE_STORE = (process.env.CACHE_STORE || 'memory').toLowerCase();
const CACHE_ENABLED_REDISTORE = CACHE_ENABLED && CACHE_STORE === 'redis';
const CACHE_DEFAULT_TTL = Math.max(Number.parseInt(process.env.CACHE_DEFAULT_TTL, 10) || 60, 0);

const memoryStore = new Map();

const serialize = (value) => {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return JSON.stringify(value);
  } catch (error) {
    logger.warn('Cache serialization failed, storing fallback string', error);
    return String(value);
  }
};

const deserialize = (value) => {
  if (value === null || value === undefined) {
    return null;
  }
  if (typeof value !== 'string') {
    return value;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

let redisClient = null;
let redisInitPromise = null;

const ensureRedisClient = async () => {
  if (!CACHE_ENABLED_REDISTORE) {
    return false;
  }
  if (redisClient) {
    return true;
  }
  if (!redisInitPromise) {
    redisInitPromise = (async () => {
      try {
        // eslint-disable-next-line global-require
        const { createClient } = require('redis');
        redisClient = createClient({
          url: process.env.REDIS_URL,
          username: process.env.REDIS_USERNAME,
          password: process.env.REDIS_PASSWORD,
        });
        redisClient.on('error', (error) => {
          logger.warn('Redis cache error', error);
        });
        await redisClient.connect();
        return true;
      } catch (error) {
        logger.warn('Redis cache initialization failed, falling back to memory cache', error);
        redisClient = null;
        redisInitPromise = null;
        return false;
      }
    })();
  }

  return redisInitPromise;
};

const getFromMemory = (key) => {
  const entry = memoryStore.get(key);
  if (!entry) {
    return null;
  }
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
};

const setInMemory = (key, value, ttlSeconds) => {
  const expiresAt = ttlSeconds && ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
  memoryStore.set(key, { value, expiresAt });
  return true;
};

const get = async (key) => {
  if (!CACHE_ENABLED || !key) {
    return null;
  }
  if (CACHE_ENABLED_REDISTORE && (await ensureRedisClient())) {
    try {
      const value = await redisClient.get(key);
      return deserialize(value);
    } catch (error) {
      logger.warn('Redis cache get failed, falling back to memory', error);
    }
  }
  return getFromMemory(key);
};

const set = async (key, value, ttlSeconds = CACHE_DEFAULT_TTL) => {
  if (!CACHE_ENABLED || !key) {
    return false;
  }
  const serialized = serialize(value);
  if (CACHE_ENABLED_REDISTORE && (await ensureRedisClient())) {
    try {
      if (ttlSeconds && ttlSeconds > 0) {
        await redisClient.set(key, serialized, { EX: ttlSeconds });
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error) {
      logger.warn('Redis cache set failed, falling back to memory', error);
    }
  }
  return setInMemory(key, value, ttlSeconds);
};

module.exports = {
  get,
  set,
  isEnabled: CACHE_ENABLED,
  store: CACHE_STORE,
};
