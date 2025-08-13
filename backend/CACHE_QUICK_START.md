# 🚀 Quick Start - Redis Caching System

## ⚡ Get Started in 3 Steps

### 1. Install & Start Redis
```bash
# macOS
brew install redis
brew services start redis

# Ubuntu
sudo apt-get install redis-server
sudo systemctl start redis-server

# Verify Redis is running
redis-cli ping
# Should return: PONG
```

### 2. Test the Caching System
```bash
cd backend

# Run automated test
./test-cache.sh

# Or test manually:
# First call (cache MISS - slower)
curl "http://localhost:4000/api/products?limit=3"

# Second call (cache HIT - faster)
curl "http://localhost:4000/api/products?limit=3"
```

### 3. Monitor Performance
```bash
# Check cache health
curl "http://localhost:4000/cache/healthz"

# View cache statistics
curl "http://localhost:4000/cache/stats"

# Monitor Redis in real-time
redis-cli monitor
```

## 🎯 Expected Results

- **First Call**: Slower (database query + cache set)
- **Second Call**: Much faster (cache hit)
- **Performance Improvement**: 70-90% faster response times
- **Cache TTL**: 60 seconds
- **Console Logs**: Cache MISS → Cache SET → Cache HIT

## 🔍 What's Happening

1. **First Request**: API queries database, returns data, caches response
2. **Subsequent Requests**: API checks cache first, returns cached data
3. **Cache Expiry**: After 60 seconds, cache expires and process repeats
4. **Automatic Invalidation**: Cache clears when products are modified

## 🚨 Troubleshooting

### Redis Not Running
```bash
# Check status
brew services list | grep redis

# Start Redis
brew services start redis
```

### Cache Not Working
```bash
# Check backend logs for cache operations
# Look for: Cache MISS, Cache SET, Cache HIT

# Verify Redis keys
redis-cli keys "products:*"
```

### Performance Not Improving
```bash
# Check cache hit ratio
curl "http://localhost:4000/cache/stats"

# Verify TTL is set
redis-cli ttl "products:1:3:all:none"
```

## 🔗 Key Endpoints

- **Products**: `GET /api/products` (cached)
- **Cache Health**: `GET /cache/healthz`
- **Cache Stats**: `GET /cache/stats`

## 💡 Pro Tips

- **Cache Keys**: Generated based on query parameters
- **TTL Strategy**: 60 seconds for product data
- **Invalidation**: Automatic when data changes
- **Monitoring**: Use console logs and Redis CLI
- **Debugging**: Check `/cache/healthz` endpoint

---

**🎉 Your Redis caching system is ready to boost performance!**

Test it now and see the dramatic improvement in response times! 🚀
