import Debug from 'debug';
import { Redis, RedisOptions } from 'ioredis';
import IORedis from 'ioredis';
import { createLock, Lock, Config } from '@microfleet/ioredis-lock';

const debug = Debug('fastlock');

type FastLockOpts = {
  redis?: RedisOptions;
  createRedisClient?: (RedisOptions?) => Redis;
  redislock?: Config;
};

export class FastLock {
  static create(opts?: FastLockOpts): FastLock {
    return new FastLock(opts);
  }

  private client: Redis;
  private redisLock?: Lock;
  private redisLockConfig: Config;

  private constructor(opts?: FastLockOpts) {
    this.client = opts?.createRedisClient ? opts?.createRedisClient(opts?.redis) : new IORedis(opts?.redis);
    debug(`connect redis: ${opts?.redis?.host}:${opts?.redis?.port}/${opts?.redis?.db}`);
    this.redisLockConfig = opts?.redislock ?? {
      timeout: 2000,
      retries: 10,
      delay: 200, // time in ms
      jitter: 200, // time in ms
    };
  }

  public destroy() {
    debug('destroy');
    this.client.end(true);
  }

  //--------------------------------------------------------

  public async lock(key: string, ttl: number = 2000): Promise<any> {
    debug('lock', key);
    // XXX: redlock과 달리 ioredis-lock은 ttl이 생성자 옵션임!
    this.redisLock = createLock(this.client, { ...this.redisLockConfig, timeout: ttl });
    return this.redisLock.acquire(key);
  }

  public async unlock(): Promise<Boolean> {
    await this.redisLock?.release();
    return true;
  }
}
