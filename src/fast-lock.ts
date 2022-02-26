import Debug from 'debug';
import { Redis, RedisOptions } from 'ioredis';
import IORedis from 'ioredis';
import Redlock, { Lock } from 'redlock';

const debug = Debug('fastlock');

export type RedlockConfig = {
  driftFactor: number;
  retryCount: number;
  retryDelay: number;
  retryJitter: number;
};

type FastLockOpts = {
  redis?: RedisOptions;
  createRedisClient?: (RedisOptions?) => Redis;
  redlock?: RedlockConfig;
};

export class FastLock {
  static create(opts?: FastLockOpts): FastLock {
    return new FastLock(opts);
  }

  private client: Redis;
  private redlock: Redlock;
  private locker!: Redlock.Lock;
  private constructor(opts?: FastLockOpts) {
    this.client = opts?.createRedisClient ? opts?.createRedisClient(opts?.redis) : new IORedis(opts?.redis);
    debug(`connect redis: ${opts?.redis?.host}:${opts?.redis?.port}/${opts?.redis?.db}`);

    this.redlock = new Redlock(
      [this.client],
      opts?.redlock
        ? opts?.redlock
        : {
            // the expected clock drift; for more details
            // see http://redis.io/topics/distlock
            driftFactor: 0.01, // time in ms

            // the max number of times Redlock will attempt
            // to lock a resource before erroring
            retryCount: 10,

            // the time in ms between attempts
            retryDelay: 200, // time in ms

            // the max time in ms randomly added to retries
            // to improve performance under high contention
            // see https://www.awsarchitectureblog.com/2015/03/backoff.html
            retryJitter: 200, // time in ms
          }
    );
    this.redlock.on('clientError', function (err: Error) {
      debug('A redis error has occured:', err);
    });
  }

  public destroy() {
    debug('destroy');
    this.client.disconnect();
  }

  //--------------------------------------------------------

  public async lock(key: string, ttl: number = 2000): Promise<any> {
    debug('lock', key);
    this.locker = await this.redlock.lock(key, ttl);
    return this.locker;
  }

  public async unlock(): Promise<Boolean> {
    await this.locker.unlock();
    return true;
  }
}
