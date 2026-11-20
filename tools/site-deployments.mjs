// Coordinate publication and cleanup using a generation-guarded Cloud Storage deployment journal.
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { hostname } from 'node:os';
import { digest, isAsset } from './site-assets.mjs';

const journal = '.deploy/state.json';
export const retention = 365 * 24 * 60 * 60 * 1000;
const checksum = /^[a-f0-9]{64}$/;
const integer = /^\d+$/;

/** Uploads may target staging prefixes; every operation is scoped to exactly one site. */
export function cloudStore(destination, command = 'gcloud') {
  if (!/^gs:\/\/[a-z0-9][a-z0-9._-]+\/(?:[a-zA-Z0-9_-]+\/)+$/.test(destination))
    throw Error('Invalid site destination.');
  function run(args, input, optional = false) {
    const r = spawnSync(command, ['storage', ...args], { input, maxBuffer: 128 * 1024 * 1024 });
    if (r.error) throw r.error;
    if (r.status === 0) return r.stdout;
    const message = r.stderr.toString();
    if (optional && /\b404\b|matched no objects|No URLs matched|not found:/i.test(message)) return null;
    throw Error(message || 'Cloud Storage command failed.');
  }
  const url = destination + journal;
  return {
    destination,
    read() {
      const raw = run(['objects', 'describe', url, '--format=value(generation)'], undefined, true);
      if (raw === null) return { generation: '0', state: { schema: 1, destination, releases: [] } };
      const generation = raw.toString().trim();
      if (!integer.test(generation)) throw Error('Invalid journal generation.');
      return { generation, state: JSON.parse(run(['cat', url + '#' + generation])) };
    },
    save(generation, state) {
      run(
        [
          'cp',
          '-',
          url,
          '--content-type=application/json',
          '--cache-control=no-store',
          '--predefined-acl=private',
          '--if-generation-match=' + generation,
        ],
        JSON.stringify(state)
      );
    },
    list(pattern) {
      const prefix = destination.slice(destination.indexOf('/', 5) + 1);
      const raw = run(
        ['objects', 'list', destination + pattern, '--raw', '--format=json(name,size,generation)'],
        undefined,
        true
      );
      if (raw === null) return [];
      return JSON.parse(raw).map(({ name, generation, size }) => {
        if (
          !name.startsWith(prefix) ||
          typeof generation !== 'string' ||
          !integer.test(generation) ||
          !Number.isSafeInteger(Number(size)) ||
          Number(size) < 0
        )
          throw Error('Invalid object listing.');
        return { path: name.slice(prefix.length), generation, size: Number(size) };
      });
    },
    bytes(path, generation, optional = false) {
      return run(['cat', destination + path + (generation ? '#' + generation : '')], undefined, optional);
    },
    remove({ path, generation }) {
      run(['rm', '--if-generation-match=' + generation, destination + path]);
    },
  };
}

/** Derive inventory identity from a canonical ordering of page and asset hashes. */
function orderedFiles(files) {
  return Object.entries(files).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
}

/** Malformed or transplanted journals must never relax retention or supply deletion paths. */
export function readJournal(store) {
  const result = store.read(),
    s = result.state;
  if (s.schema !== 1 || s.destination !== store.destination || !Array.isArray(s.releases))
    throw Error('Invalid deployment journal.');
  const validDate = (date) => Number.isSafeInteger(date) && date > 0;
  if (s.started !== undefined && !validDate(s.started)) throw Error('Invalid retention start.');
  const ids = new Set();
  for (const r of s.releases) {
    if (
      !checksum.test(r.id) ||
      ids.has(r.id) ||
      !Array.isArray(r.assets) ||
      !r.assets.every((p) => isAsset(p)) ||
      !r.pages ||
      !r.pages['index.html'] ||
      !Object.entries(r.pages).every(
        ([k, v]) => ['index.html', 'all.html', 'changes.json', 'render-inventory.json'].includes(k) && checksum.test(v)
      ) ||
      (r.retired !== null && !validDate(r.retired))
    )
      throw Error('Invalid release inventory.');
    const files = { ...r.pages };
    for (const path of r.assets) files[path] = path.split('/')[1];
    if (digest(JSON.stringify(orderedFiles(files))) !== r.id) throw Error('Deployment inventory checksum mismatch.');
    ids.add(r.id);
  }
  if (s.current && !s.releases.some((r) => r.id === s.current && r.verified === true && r.retired === null))
    throw Error('Missing current inventory.');
  return result;
}

/** A process crash leaves a visible lock. Never infer that a running publisher is dead from its age. */
export async function withLock(store, action, work) {
  const { state, generation } = readJournal(store);
  if (state.lock) throw Error('Site is locked: ' + JSON.stringify(state.lock));
  const lock = { id: randomUUID(), action, host: hostname(), pid: process.pid, since: new Date().toISOString() };
  store.save(generation, { ...state, lock });
  let held = readJournal(store);
  if (held.state.lock?.id !== lock.id) throw Error('Lost deployment lock.');
  try {
    const checkpoint = () => {
      store.save(held.generation, { ...state, lock });
      const next = readJournal(store);
      if (next.state.lock?.id !== lock.id) throw Error('Lost deployment lock.');
      held = next;
    };
    return await work(state, checkpoint);
  } finally {
    store.save(held.generation, state);
  }
}

/** Keep the old and incoming inventories through partial publication. Only verified success starts retirement. */
export async function publishDeployment(store, files, publish, now = Date.now) {
  const ordered = orderedFiles(files);
  const id = digest(JSON.stringify(ordered));
  return withLock(store, 'upload', async (state, checkpoint) => {
    const last = state.releases.find((r) => r.id === state.current);
    const previousPages = state.incomplete ? {} : (last?.pages ?? {});
    let release = state.releases.find((r) => r.id === id);
    if (!release) {
      release = {
        id,
        assets: ordered.filter(([p]) => isAsset(p)).map(([p]) => p),
        pages: Object.fromEntries(ordered.filter(([p]) => !isAsset(p))),
        retired: null,
      };
      state.releases.push(release);
    }
    release.retired = null;
    state.incomplete = true;
    checkpoint();
    await publish(previousPages);
    const time = now();
    for (const r of state.releases) if (r.id !== id && r.retired === null) r.retired = time;
    release.verified = true;
    state.current = id;
    state.started ??= time;
    state.incomplete = false;
  });
}

/** Require individual receipt membership. Keep current, pending, two rollback versions, and a full cache lifetime. */
export function cleanupPlan(store, state, now = Date.now(), legacy) {
  if (!state.current || !state.started || state.incomplete)
    throw Error('A verified managed upload is required before cleanup.');
  const current = state.releases.find((r) => r.id === state.current);
  for (const [page, hash] of Object.entries(current.pages)) {
    if (digest(store.bytes(page)) !== hash) throw Error('Live page differs from deployment journal: ' + page);
  }
  const retired = state.releases.filter((r) => r.retired !== null).sort((a, b) => b.retired - a.retired);
  const rollback = new Set(
    retired
      .filter((r) => r.verified)
      .slice(0, 2)
      .map((r) => r.id)
  );
  const expired = new Set(retired.filter((r) => !rollback.has(r.id) && r.retired < now - retention).map((r) => r.id));
  const keep = new Set(
    state.releases.filter((r) => !expired.has(r.id) || r.id === state.current).flatMap((r) => r.assets)
  );
  const eligible = new Set(
    state.releases
      .filter((r) => expired.has(r.id))
      .flatMap((r) => r.assets)
      .filter((p) => !keep.has(p))
  );
  const objects = eligible.size ? store.list('assets/**').filter((o) => eligible.has(o.path)) : [];
  if (legacy) objects.push(...legacyObjects(store, state, now, legacy));
  objects.sort((a, b) => a.path.localeCompare(b.path));
  const token = digest(JSON.stringify([store.destination, state.current, [...expired].sort(), objects]));
  return { token, objects, expired };
}

/** Explicit migration for pre-journal releases. Authenticate every byte against the original directory fingerprint. */
function legacyObjects(store, state, now, version) {
  if (!/^[a-f0-9]{16}$/.test(version)) throw Error('Expected one legacy 16-hex asset directory.');
  if (now - state.started <= retention)
    throw Error('Legacy URLs are protected for one year after the first managed deployment.');
  if (state.legacy && state.legacy.version !== version) throw Error('Resume the unfinished legacy directory first.');
  const prefix = 'assets/' + version + '/';
  const objects = store.list(prefix + '**');
  // Resume a previously authenticated legacy plan after a partial deletion.
  if (state.legacy?.version === version) {
    const approved = new Map(state.legacy.objects.map((o) => [o.path, o.generation]));
    for (const o of objects) {
      if (
        !o.path.startsWith(prefix) ||
        approved.get(o.path) !== o.generation ||
        !isAsset(o.path.replace(prefix, 'assets/' + '0'.repeat(64) + '/'))
      )
        throw Error('Legacy inventory changed during cleanup.');
    }
    return objects;
  }
  const inputs = new Map();
  for (const obj of objects) {
    const name = obj.path.slice(prefix.length);
    if (
      !obj.path.startsWith(prefix) ||
      !/^[\w.-]+(?:\/[\w.-]+)*$/.test(name) ||
      name.split('/').some((p) => p === '.' || p === '..')
    )
      throw Error('Unexpected legacy path.');
    inputs.set(name, store.bytes(obj.path, obj.generation));
  }
  // The illustrated report hashed a sorted list of names and digests; the other builders hashed names and bytes.
  const hash = store.destination.endsWith('/reports/ai2026/')
    ? digest(JSON.stringify([...inputs.keys()].sort().map((k) => ['assets/' + k, digest(inputs.get(k))])))
    : digest(Buffer.concat([...inputs].sort().flatMap(([k, v]) => [Buffer.from(k), v])));
  if (!objects.length || hash.slice(0, 16) !== version)
    throw Error('Legacy inventory does not match its original fingerprint.');
  return objects;
}
