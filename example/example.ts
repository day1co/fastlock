import { LoggerFactory } from '@day1co/pebbles';
import { FastLock } from '../src/fast-lock';

const logger = LoggerFactory.getLogger('fastlock:example');
const sleep = async (ms) => new Promise((res) => setTimeout(res, ms));

const myArray = [];
const anotherProcess = async () => {
  const locker = FastLock.create({ redis: { host: 'localhost', port: 6379, db: 0 } });
  await locker.lock('locks:example', 2000);
  myArray.push(4);
  myArray.push(5);
  myArray.push(6);
  await sleep(2000);
};

const main = async () => {
  const locker = FastLock.create({ redis: { host: 'localhost', port: 6379, db: 0 } });
  await locker.lock('locks:example', 2000);
  myArray.push(1);
  myArray.push(2);
  myArray.push(3);
  setTimeout(async () => anotherProcess(), 100);
  await sleep(2000);
  await locker.unlock();
  locker.destroy();
  logger.debug('%o', myArray);
};

main().then(console.info).catch(console.error);
