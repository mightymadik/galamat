import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const REQUESTS_LIMIT = 3;
const WINDOW = "10 m";

const redisUrl = process.env.UPSTASH_REDIS_REST_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN;

const ratelimit =
  redisUrl && redisToken
    ? new Ratelimit({
        redis: Redis.fromEnv(),
        limiter: Ratelimit.slidingWindow(REQUESTS_LIMIT, WINDOW),
      })
    : null;

export async function rateLimit(ip: string) {
  if (!ratelimit) {
    // Keep API functional in environments where Upstash is not configured yet.
    return true;
  }

  const { success } = await ratelimit.limit(ip);
  return success;
}
