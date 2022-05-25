import { ClientOpts, RedisClient, createClient } from 'redis';
import Redlock from 'redlock';
import { LoggerFactory } from '@day1co/pebbles';
import type { Logger } from '@day1co/pebbles';

type FastLockOpts = {
  redis?: ClientOpts;
  createRedisClient?: (ClientOpts) => RedisClient;
  redlock?: any;
};

export class FastLock {
  static create(opts?: FastLockOpts): FastLock {
    return new FastLock(opts);
  }

  private client: any;
  private redlock: any;
  private locker: any;
  private logger: Logger;

  private constructor(opts?: FastLockOpts) {
    this.logger = LoggerFactory.getLogger('fastlock');
    const createRedisClient = opts?.createRedisClient || createClient;
    this.client = createRedisClient(opts?.redis);
    this.logger.debug(`connect redis: ${opts?.redis?.host}:${opts?.redis?.port}/${opts?.redis?.db}`);

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
      this.logger.error('A redis error has occured: %o', err);
    });
  }

  public destroy() {
    this.logger.debug('destroy');
    this.client.end(true);
  }

  //--------------------------------------------------------

  public async lock(key: string, ttl: number = 2000): Promise<any> {
    this.logger.debug('lock: %o', key);
    this.locker = await this.redlock.lock(key, ttl);
    return this.locker;
  }

  public async unlock(): Promise<Boolean> {
    await this.locker.unlock();
    return true;
  }
}
