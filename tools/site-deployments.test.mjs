// Exercise upload interruption, overlapping releases, stale cleanup plans and migration of legacy directories.
import assert from 'node:assert/strict';
import test from 'node:test';
import { digest, linkAssets } from './site-assets.mjs';
import { clean, recover } from './site-cleanup.mjs';
import { cleanupPlan, publishDeployment, readJournal, retention, withLock } from './site-deployments.mjs';
import { memoryStore } from './site-storage.fixture.mjs';

const url = 'gs://example/guide/';
const firstDay = Date.now() - retention - 10000;
const asset = (name) => 'assets/' + digest(name) + '/' + name;
const stable = asset('font.woff2');

/** Publish test bytes using the same journal transitions as the real uploader. */
async function release(store, day, label, extra = []) {
  const page = Buffer.from(label),
    keys = [asset(label), ...extra];
  const files = { 'index.html': digest(page) };
  for (const key of keys) files[key] = key.split('/')[1];
  await publishDeployment(
    store,
    files,
    async () => {
      store.objects.set('index.html', { generation: String(day), bytes: page });
      for (const key of keys)
        store.objects.set(key, { generation: String(day), bytes: Buffer.from(key.split('/').pop()) });
    },
    () => day
  );
}

test('link edits invalidate only the changed file and its importing ancestors', () => {
  const files = new Map(
    Object.entries({
      'app.mjs': "import './unused';\nimport { x } from './lib/x.mjs';",
      'lib/x.mjs': "export const x = new URL('../font.json', import.meta.url);",
      'font.json': '{}',
      'style.css': 'h1{}',
    }).map(([k, v]) => [k, Buffer.from(v)])
  );
  const a = linkAssets(files);
  files.set('style.css', Buffer.from('h1{color:red}'));
  const b = linkAssets(files);
  assert.equal(a.paths['app.mjs'], b.paths['app.mjs']);
  assert.equal(a.paths['font.json'], b.paths['font.json']);
  assert.notEqual(a.paths['style.css'], b.paths['style.css']);
  files.set('font.json', Buffer.from('{"changed":1}'));
  const c = linkAssets(files);
  assert.notEqual(b.paths['app.mjs'], c.paths['app.mjs']);
  assert.equal(b.paths['style.css'], c.paths['style.css']);
});

test('preview, revalidation and cleanup preserve shared assets, recent retirements and rollback versions', async () => {
  const store = memoryStore(url);
  await release(store, firstDay, 'a', [stable]);
  for (const [i, label] of ['b', 'c', 'd'].entries()) await release(store, firstDay + i + 1, label, [stable]);
  await release(store, Date.now(), 'e', [stable]);
  store.objects.set(asset('unknown'), { generation: '1', bytes: Buffer.from('unknown') });
  const plan = await clean(store);
  assert.deepEqual(plan.objects.map((o) => o.path).sort(), [asset('a'), asset('b')].sort());
  const target = store.objects.get(asset('a'));
  target.generation = '999';
  await assert.rejects(clean(store, { apply: plan.token }), /plan changed/);
  assert.ok(store.objects.has(asset('a')));
  const fresh = await clean(store);
  await clean(store, { apply: fresh.token });
  for (const k of [stable, asset('c'), asset('d'), asset('e'), asset('unknown')]) assert.ok(store.objects.has(k));
  assert.ok(!store.objects.has(asset('a')));
  assert.equal((await clean(store)).objects.length, 0);
});

test('lock contention, interrupted publication and mismatched live entry points block deletion', async () => {
  const store = memoryStore(url);
  await release(store, firstDay, 'a');
  await withLock(store, 'upload', async () => {
    await assert.rejects(clean(store), /locked/);
    await assert.rejects(release(store, firstDay, 'b'), /locked/);
  });
  await assert.rejects(
    publishDeployment(store, { 'index.html': digest('broken') }, async () => {
      throw Error('interrupted');
    }),
    /interrupted/
  );
  await assert.rejects(clean(store), /verified managed upload/);
  await release(store, firstDay + 1, 'b');
  store.objects.get('index.html').bytes = Buffer.from('other');
  await assert.rejects(clean(store), /differs/);
  const { generation, state } = readJournal(store);
  store.save(generation, { ...state, lock: { id: 'owner' } });
  assert.throws(() => recover(store, 'other'), /does not match/);
  recover(store, 'owner');
  await assert.rejects(clean(store), /verified managed upload/);
});

test('legacy cleanup requires an explicit authenticated inventory and a full migration grace period', async () => {
  const store = memoryStore(url);
  const version = digest('example.jsold').slice(0, 16),
    path = 'assets/' + version + '/example.js';
  await release(store, firstDay, 'current');
  store.objects.set(path, { generation: '123', bytes: Buffer.from('old') });
  const { state } = readJournal(store);
  assert.throws(() => cleanupPlan(store, state, firstDay + 1, version), /protected/);
  store.objects.get(path).bytes = Buffer.from('unexpected');
  assert.throws(() => cleanupPlan(store, state, Date.now(), version), /fingerprint/);
  store.objects.get(path).bytes = Buffer.from('old');
  const plan = await clean(store, { legacy: version });
  await clean(store, { legacy: version, apply: plan.token });
  assert.ok(!store.objects.has(path));
  assert.ok(store.objects.has(asset('current')));
});

test('interrupted legacy deletion resumes only for original object generations', async () => {
  const store = memoryStore(url);
  await release(store, firstDay, 'current');
  const version = digest('a.jsoneb.jstwo').slice(0, 16);
  const prefix = 'assets/' + version + '/';
  for (const [name, value] of [
    ['a.js', 'one'],
    ['b.js', 'two'],
  ]) {
    store.objects.set(prefix + name, { generation: '101', bytes: Buffer.from(value) });
  }
  const plan = await clean(store, { legacy: version });
  const remove = store.remove;
  store.remove = (obj) => {
    if (obj.path.endsWith('/b.js')) throw Error('interrupted');
    remove(obj);
  };
  await assert.rejects(clean(store, { legacy: version, apply: plan.token }), /interrupted/);
  assert.ok(!store.objects.has(prefix + 'a.js'));
  const remaining = store.objects.get(prefix + 'b.js');
  remaining.generation = '102';
  await assert.rejects(clean(store, { legacy: version }), /changed during cleanup/);
  remaining.generation = '101';
  store.remove = remove;
  await assert.rejects(clean(store, { legacy: version, apply: plan.token }), /plan changed/);
  const resumed = await clean(store, { legacy: version });
  assert.equal(resumed.objects.length, 1);
  await clean(store, { legacy: version, apply: resumed.token });
  assert.ok(!store.objects.has(prefix + 'b.js'));
});
