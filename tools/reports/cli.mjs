// npm entry points for local quality reports and explicit archive publication.
import { buildReport, git, output, root } from './build.mjs';
import { publishRelease } from './release.mjs';
import { uploadReport } from './upload.mjs';

try {
  const [command = 'build', ...args] = process.argv.slice(2);
  if (command === 'build' && !args.length) await buildReport();
  else if (
    (command === 'release' || command === 'github') &&
    (args.length === 1 || (args.length === 2 && args[1] === '--dry-run'))
  ) {
    await publishRelease(args[0], { github: command === 'github', dryRun: args.includes('--dry-run') });
  } else if (
    command === 'upload' &&
    args.every(
      (arg) =>
        arg === '--dry-run' ||
        /^--commit=[0-9a-f]{40}$/.test(arg) ||
        /^--destination=gs:\/\/[a-z0-9][a-z0-9._-]+\/(?:[a-zA-Z0-9_-]+\/)+$/.test(arg)
    )
  ) {
    const option = (name) => args.find((arg) => arg.startsWith('--' + name + '='))?.split('=')[1];
    await uploadReport({
      directory: output,
      commit: option('commit') ?? git(root, 'rev-parse', 'HEAD'),
      destination: option('destination'),
      dryRun: args.includes('--dry-run'),
    });
  } else
    throw Error(
      'Usage: npm run report | npm run report:release -- <tag> [--dry-run] | npm run release:github -- <tag> [--dry-run] | npm run report:upload -- [--dry-run] [--commit=<full SHA>] [--destination=gs://bucket/reports/]'
    );
} catch (err) {
  console.error(err.message);
  process.exitCode = 1;
}
