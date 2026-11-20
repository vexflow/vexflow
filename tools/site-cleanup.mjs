// Preview and apply generation-pinned cleanup for the four managed public website prefixes.
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { cleanupPlan, cloudStore, readJournal, withLock } from './site-deployments.mjs';

/** A reviewed token binds the exact objects, generations, active release and retirement set. */
export async function clean(store, { apply, legacy } = {}) {
  function plan(state) {
    const result = cleanupPlan(store, state, Date.now(), legacy);
    for (const o of result.objects) console.log(`${store.destination}${o.path}#${o.generation} (${o.size} bytes)`);
    console.log(
      `${result.objects.length} objects; ${result.objects.reduce((n, o) => n + o.size, 0)} bytes; plan ${result.token}`
    );
    return result;
  }
  if (!apply) {
    const { state } = readJournal(store);
    if (state.lock) throw Error('Site is locked: ' + JSON.stringify(state.lock));
    return plan(state);
  }
  return withLock(store, 'cleanup', async (state, checkpoint) => {
    const { token, objects, expired } = plan(state);
    if (token !== apply) throw Error('Cleanup plan changed. Preview again.');
    if (legacy && objects.length) {
      state.legacy = { version: legacy, objects: objects.filter((o) => o.path.startsWith('assets/' + legacy + '/')) };
      checkpoint();
    }
    for (const object of objects) store.remove(object);
    state.releases = state.releases.filter((r) => !expired.has(r.id));
    if (legacy === state.legacy?.version) delete state.legacy;
  });
}

/** Recovery requires the observed lock ID. Operators must first verify the original process has stopped. */
export function recover(store, id) {
  const { generation, state } = readJournal(store);
  if (!id || state.lock?.id !== id) throw Error('Lock ID does not match.');
  delete state.lock;
  state.incomplete = true;
  store.save(generation, state);
  console.log('Lock cleared. Publish a complete release before cleanup.');
}

/** Limit the public CLI to the known managed roots; keep error output suitable for release operators. */
async function main() {
  const [site, ...args] = process.argv.slice(2);
  if (
    !['guide', 'explorer', 'tests', 'reports/ai2026'].includes(site) ||
    args.some((a) => !/^(--apply=[a-f0-9]{64}|--legacy=[a-f0-9]{16}|--recover=[a-f0-9-]{36})$/.test(a)) ||
    new Set(args.map((a) => a.split('=')[0])).size !== args.length
  ) {
    throw Error(
      'Usage: npm run sites:clean -- <guide|explorer|tests|reports/ai2026> [--legacy=16hex] [--apply=plan] or --recover=lock-id'
    );
  }
  const store = cloudStore('gs://vexflow.com/' + site + '/');
  const opts = Object.fromEntries(args.map((arg) => arg.slice(2).split('=')));
  if (opts.recover) {
    if (args.length !== 1) throw Error('Recover a lock separately.');
    recover(store, opts.recover);
  } else await clean(store, opts);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
