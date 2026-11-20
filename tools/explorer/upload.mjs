// Publish the deprecation notice at the existing Explorer URL.
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { upload as uploadSite, validate } from '../static-site-upload.mjs';
import { build, output } from './cli.mjs';

export { validate };

/** Keep the Explorer's existing programmatic upload defaults. */
export function upload({ destination = 'gs://vexflow.com/explorer/', directory = output, ...options } = {}) {
  return uploadSite({
    destination,
    directory,
    publicURL: destination === 'gs://vexflow.com/explorer/' ? 'https://vexflow.com/explorer/' : undefined,
    ...options,
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.some((arg) => arg !== '--dry-run' && !arg.startsWith('--destination=')))
      throw new Error('Usage: npm run explorer:upload -- [--dry-run] [--destination=gs://bucket/prefix/]');
    await build();
    await upload({
      dryRun: args.includes('--dry-run'),
      destination: args.find((arg) => arg.startsWith('--destination='))?.slice(14),
    });
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
