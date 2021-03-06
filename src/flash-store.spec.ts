#!/usr/bin/env ts-node
import * as fs    from 'fs'
import * as os    from 'os'
import * as path  from 'path'

// tslint:disable:no-shadowed-variable
import * as test from 'blue-tape'

// import { log }    from './config'
// log.level('silly')

import { FlashStore }  from './flash-store'

const KEY     = 'test-key'
const VAL     = 'test-val'
const VAL_OBJ = { obj_key: 'obj_val' }

test('constructor()', async t => {
  const tmpDir = path.join(
    os.tmpdir(),
    `flash-store.${process.pid}`,
  )
  t.doesNotThrow(async () => {
    const store = new FlashStore(tmpDir)

    // need to do something to create the db directory
    await store.del('init')

    t.ok(fs.existsSync(tmpDir), 'should create the workDir')
    store.destroy()
  }, 'should not throw exception with a non existing workDir')
})

test('Store as iterator', async t => {

  t.test('async iterator for empty store', async t => {
    for await (const store of storeFixture()) {
      let n = 0
      for await (const _ of store) {
        n++
        break
      }
      t.equal(n, 0, 'should get empty iterator')
    }
  })

  t.test('async iterator', async t => {
    for await (const store of storeFixture()) {
      await store.put(KEY, VAL)
      let n = 0
      for await (const [key, val] of store) {
        t.equal(key, KEY, 'should get key back')
        t.equal(val, VAL, 'should get val back')
        n++
      }
      t.equal(n, 1, 'should iterate once')
    }
  })

})

test('get()', async t => {
  t.test('return null for non existing key', async t => {
    for await (const store of storeFixture()) {
      const val = await store.get(KEY)
      t.equal(val, null, 'should get null for not exist key')
    }
  })

  t.test('store string key/val', async t => {
    for await (const store of storeFixture()) {
      await store.put(KEY, VAL)
      const val = await store.get(KEY)
      t.equal(val, VAL, 'should get VAL after set KEY')
    }
  })

  t.test('store object value', async t => {
    for await (const store of storeFixture()) {
      await store.put(KEY, VAL_OBJ)
      const val = await store.get(KEY)
      t.deepEqual(val, VAL_OBJ, 'should get VAL_OBJ after set KEY')
    }
  })
})

test('put()', async t => {
  for await (const store of storeFixture()) {
    await store.put(KEY, VAL)
    const val = await store.get(KEY)
    t.equal(val, VAL, 'should put VAL for KEY')
  }
})

test('count()', async t => {
  for await (const store of storeFixture()) {
    let count = await store.count()
    t.equal(count, 0, 'should get count 0 after init')
    await store.put(KEY, VAL)
    count = await store.count()
    t.equal(count, 1, 'should get count 1 after put')
  }
})

test('keys()', async t => {
  for await (const store of storeFixture()) {
    let count = 0
    for await (const _ of store.keys()) {
      count++
    }
    t.equal(count, 0, 'should get 0 key after init')

    await store.put(KEY, VAL)
    for await (const key of store.keys()) {
      t.equal(key, KEY, 'should get back the key')
      count++
    }
    t.equal(count, 1, 'should get 1 key after 1 put')
  }
})

test('values()', async t => {
  for await (const store of storeFixture()) {
    let count = 0
    for await (const _ of store.values()) {
      count++
    }
    t.equal(count, 0, 'should get 0 value after init')

    await store.put(KEY, VAL)

    for await (const value of store.values()) {
      t.equal(value, VAL, 'should get back the value')
      count++
    }
    t.equal(count, 1, 'should get 1 value after 1 put')
  }
})

test('deferred-leveldown json bug(fixed on version 2.0.2', async t => {
  const encoding  = (await import('encoding-down')).default
  const leveldown = (await import('leveldown')).default
  const levelup   = (await import('levelup')).default

  const encoded = encoding(leveldown('/tmp/test'), {
    valueEncoding: 'json',
  })
  const levelDb = levelup(encoded)

  const EXPECTED_OBJ = {a: 1}
  await levelDb.put('test', EXPECTED_OBJ)
  const value = await levelDb.get('test')

  t.equal(typeof value, 'object', 'value type should be object')
  t.deepEqual(value, EXPECTED_OBJ, 'should get back the original object')
})

async function* storeFixture() {
  const tmpDir = fs.mkdtempSync(
    path.join(
      os.tmpdir(),
      path.sep,
      'flash-store-',
    ),
  )
  const store = new FlashStore(tmpDir)

  yield store

  await store.destroy()
}
