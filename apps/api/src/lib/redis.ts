import Redis from 'ioredis'
import { env } from '../env'

let _redis: Redis | null = null

export function getRedis(): Redis {
  if (!_redis) {
    _redis = new Redis(env.REDIS_URL, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    })
    _redis.on('error', (err) => {
      console.error('[Redis] Error:', err.message)
    })
  }
  return _redis
}

// Creates a dedicated Redis connection for pub/sub (ioredis requires separate connection)
export function createSubConnection(): Redis {
  return new Redis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    lazyConnect: true,
  })
}

export const LIVE_CHANNEL = (tenantId: string) => `tenant:${tenantId}:live`
