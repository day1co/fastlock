import Debug from 'debug';
import redis from 'redis';
import { FastLock } from './fast-lock';

const debug = Debug('fastlock:test');
const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));
const createLocker = () => {
  const redisConfig = { host: 'localhost', port: 6379, db: 0 };
  const redlockConfig = {
    driftFactor: 0.01, // time in ms
    retryCount: 1,
    retryDelay: 200, // time in ms
    retryJitter: 200, // time in ms
  };
  return FastLock.create({
    redis: redisConfig,
    createRedisClient: redis.createClient,
    redlock: redlockConfig,
  });
};
const lockKey = 'locks:hello-lock';

describe('FastLock', () => {
  let locker, locker2;

  beforeEach(async () => {
    locker = createLocker();
    locker2 = createLocker();
  });

  afterEach(() => {
    locker.destroy();
    locker2.destroy();
  });

  describe('lock, unlock', () => {
    test('lock and unlock', async () => {
      try {
        await locker.lock(lockKey, 2000);
        const test = 'test' + Math.random();
        const testArray: string[] = [];
        const testFunction = async () => {
          await locker2.lock(lockKey, 1000);
          testArray.push('bar2');
          testArray.push('foo2');
          await locker2.unlock();
        };
        debug('lock start');
        testArray.push('bar');
        testArray.push('foo');
        setTimeout(() => testFunction(), 300);
        await locker.unlock();
        await sleep(1000);
        expect(testArray).toEqual(['bar', 'foo', 'bar2', 'foo2']);
        debug('should work', testArray);
      } catch (err) {
        debug(err);
      }
    });

    test('locked', async () => {
      const testArray: string[] = [];
      try {
        await locker.lock(lockKey, 4000);
        const test = 'test' + Math.random();
        const testFunction = async () => {
          try {
            await locker2.lock(lockKey, 2000);
            testArray.push('bar2');
            testArray.push('foo2');
            await locker2.unlock();
          } catch (err) {
            debug(err);
          }
        };
        testArray.push('bar');
        testArray.push('foo');
        setTimeout(() => testFunction(), 500);
        await sleep(3000);
        await locker.unlock();
      } catch (err) {
        debug(err);
      } finally {
        debug('locked', testArray);
        expect(testArray).toEqual(['bar', 'foo']);
      }
    });
  });
});
