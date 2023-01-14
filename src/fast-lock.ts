import IORedis, { type RedisOptions, type Redis } from 'ioredis';
import Redlock from 'redlock';
import { LoggerFactory } from '@day1co/pebbles';

const logger = LoggerFactory.getLogger('fastlock');

type FastLockOpts = {
  redis?: RedisOptions;
  createRedisClient?: (opts: RedisOptions) => Redis;
  redlock?: any;
};

export class FastLock {
  static create(opts?: FastLockOpts): FastLock {
    return new FastLock(opts);
  }

  private client: any;
  private redlock: Redlock;
  private locker: any;

  private constructor(opts?: FastLockOpts) {
    this.client = opts?.createRedisClient ? opts?.createRedisClient(opts?.redis ?? {}) : new IORedis(opts?.redis ?? {});
    logger.debug(`connect redis: ${opts?.redis?.host}:${opts?.redis?.port}/${opts?.redis?.db}`);

    this.redlock = new Redlock(
      [this.client],
      opts?.redlock ?? {
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
      logger.error('A redis error has occured: %o', err);
    });
  }

  public destroy() {
    logger.debug('destroy');
    this.client.end(true);
  }

  //--------------------------------------------------------

  public async lock(key: string, ttl = 2000): Promise<any> {
    logger.debug('lock: %o', key);
    this.locker = await this.redlock.lock(key, ttl);
    return this.locker;
  }

  public async unlock(): Promise<boolean> {
    await this.locker.unlock();
    return true;
  }
}
