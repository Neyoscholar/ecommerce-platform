"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const ioredis_1 = __importDefault(require("ioredis"));
// Redis client configuration
const redis = new ioredis_1.default({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    lazyConnect: true,
});
// Cache configuration
const DEFAULT_TTL = 60; // 60 seconds default TTL
// Cache service class
class CacheService {
    constructor() {
        this.redis = redis;
    }
    /**
     * Get value from cache
     * @param key Cache key
     * @returns Cached value or null if not found
     */
    async get(key) {
        try {
            const value = await this.redis.get(key);
            if (value) {
                console.log('✅ Cache HIT for key:', key);
                return JSON.parse(value);
            }
            console.log('❌ Cache MISS for key:', key);
            return null;
        }
        catch (error) {
            console.error('Cache get error:', error);
            return null;
        }
    }
    /**
     * Set value in cache with TTL
     * @param key Cache key
     * @param value Value to cache
     * @param ttl Time to live in seconds (default: 60s)
     */
    async set(key, value, ttl = DEFAULT_TTL) {
        try {
            const serializedValue = JSON.stringify(value);
            await this.redis.setex(key, ttl, serializedValue);
            console.log('💾 Cache SET for key:', key, `(TTL: ${ttl}s)`);
        }
        catch (error) {
            console.error('Cache set error:', error);
        }
    }
    /**
     * Delete cache key
     * @param key Cache key to delete
     */
    async del(key) {
        try {
            await this.redis.del(key);
            console.log('🗑️ Cache DEL for key:', key);
        }
        catch (error) {
            console.error('Cache delete error:', error);
        }
    }
    /**
     * Delete multiple cache keys
     * @param keys Array of cache keys to delete
     */
    async delMultiple(keys) {
        try {
            if (keys.length > 0) {
                await this.redis.del(...keys);
                console.log('🗑️ Cache DEL multiple keys:', keys);
            }
        }
        catch (error) {
            console.error('Cache delete multiple error:', error);
        }
    }
    /**
     * Delete cache keys by pattern
     * @param pattern Redis pattern (e.g., 'products:*')
     */
    async delByPattern(pattern) {
        try {
            const keys = await this.redis.keys(pattern);
            if (keys.length > 0) {
                await this.redis.del(...keys);
                console.log('🗑️ Cache DEL by pattern:', pattern, `(${keys.length} keys)`);
            }
        }
        catch (error) {
            console.error('Cache delete by pattern error:', error);
        }
    }
    /**
     * Check if cache key exists
     * @param key Cache key to check
     * @returns True if key exists, false otherwise
     */
    async exists(key) {
        try {
            const result = await this.redis.exists(key);
            return result === 1;
        }
        catch (error) {
            console.error('Cache exists error:', error);
            return false;
        }
    }
    /**
     * Get TTL for a cache key
     * @param key Cache key
     * @returns TTL in seconds, -1 if no TTL, -2 if key doesn't exist
     */
    async getTTL(key) {
        try {
            return await this.redis.ttl(key);
        }
        catch (error) {
            console.error('Cache TTL error:', error);
            return -2;
        }
    }
    /**
     * Set TTL for existing key
     * @param key Cache key
     * @param ttl Time to live in seconds
     */
    async setTTL(key, ttl) {
        try {
            await this.redis.expire(key, ttl);
            console.log('⏰ Cache TTL SET for key:', key, `(TTL: ${ttl}s)`);
        }
        catch (error) {
            console.error('Cache set TTL error:', error);
        }
    }
    /**
     * Clear all cache (use with caution in production)
     */
    async clearAll() {
        try {
            await this.redis.flushall();
            console.log('🧹 Cache CLEAR ALL');
        }
        catch (error) {
            console.error('Cache clear all error:', error);
        }
    }
    /**
     * Get cache statistics
     */
    async getStats() {
        try {
            const info = await this.redis.info();
            const keys = await this.redis.dbsize();
            return {
                info: info.split('\r\n').filter(line => line.includes(':')),
                keys: keys,
                status: this.redis.status
            };
        }
        catch (error) {
            console.error('Cache stats error:', error);
            return { error: error.message };
        }
    }
    /**
     * Health check for Redis connection
     */
    async healthCheck() {
        try {
            await this.redis.ping();
            return true;
        }
        catch (error) {
            console.error('Redis health check failed:', error);
            return false;
        }
    }
    /**
     * Close Redis connection
     */
    async close() {
        try {
            await this.redis.quit();
            console.log('🔌 Redis connection closed');
        }
        catch (error) {
            console.error('Redis close error:', error);
        }
    }
}
// Create and export singleton instance
const cacheService = new CacheService();
// Graceful shutdown handling
process.on('SIGINT', async () => {
    console.log('Shutting down Redis connection...');
    await cacheService.close();
    process.exit(0);
});
process.on('SIGTERM', async () => {
    console.log('Shutting down Redis connection...');
    await cacheService.close();
    process.exit(0);
});
exports.default = cacheService;
