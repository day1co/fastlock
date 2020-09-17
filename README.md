# fastlock

fast and simple distributed lock using redis

[![npm version](https://badge.fury.io/js/%40fastcampus%2Ffastcache.svg)](https://badge.fury.io/js/%40fastcampus%2Ffastlock)

## Getting Started

```[js](js)
const { FastLock } = require('@fastcampus/fastlock');

const locker = FastLock.create({ redis: { host: 'localhost', port: 6379, db: 0 } });
const array = [];
locker.lock('locks:fastlock',5000);
array.push(1);
array.push(2);
locker.unlock();


```

## Contributing

### test

```console
$ npm run ci:test
```

### build

```console
$ npm run build
```

### watch(continuous build)

```console
$ npm start
```

---

may the **SOURCE** be with you...
