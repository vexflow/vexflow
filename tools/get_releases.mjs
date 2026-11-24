/* eslint-disable no-console */
// Fetch historical release builds. Versions are validated before any filesystem or process work.

import { execFileSync } from 'child_process';
import fs from 'fs';
import path, { dirname } from 'path';
import copy from 'recursive-copy';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RELEASES_DIR = path.join(__dirname, '../releases');

// Add a suffix to worktrees / temporary folders, to make sure they don't collide with existing worktrees / folders.
const TEMP_SUFFIX = '-delete-me-later';

// Determine which versions the user wants to extract/download.
const versionsRequested = process.argv.slice(2);

// Accept release versions, never paths, flags, npm specs, or shell fragments.
const releaseVersion = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:[.-][0-9A-Za-z]+)*)?$/;
for (const version of versionsRequested) {
  if (version.length > 100 || version !== version.trim() || !releaseVersion.test(version)) {
    throw new Error(`Invalid release version: ${version}`);
  }
}

if (versionsRequested.length === 0) {
  console.log('Usage:   node get_releases.mjs <release-version>');
  console.log('Usage:   node get_releases.mjs <release-version> <release-version> <release-version> ...');
  console.log('Example: node get_releases.mjs 3.0.9');
  process.exit(1);
}
const versions3OrEarlier = versionsRequested.filter((ver) => parseFloat(ver) < 4.0);
const versions4OrLater = versionsRequested.filter((ver) => parseFloat(ver) >= 4.0);

// Helper function for the command line interface.
const pressAnyKeyToProceed = async () => {
  process.stdin.setRawMode(true);
  return new Promise((resolve) =>
    process.stdin.once('data', (data) => {
      const byteArray = [...data];
      if (byteArray.length > 0) {
        if (byteArray[0] === 3) {
          console.log('^C');
          process.exit(1);
        }
        if (byteArray[0] === 81 || byteArray[0] === 113) {
          console.log('QUIT');
          process.exit(0);
        }
      }
      process.stdin.setRawMode(false);
      resolve();
    })
  );
};

console.log('Check out release files for the following versions?');
for (const ver of versionsRequested) {
  console.log('    ' + ver + ' --> ' + path.join(RELEASES_DIR, ver, '/'));
}

console.log('\nPress any key to proceed. Press Q or CTRL+C to quit.\n');

await pressAnyKeyToProceed();

// Make the target directory if it doesn't exist.
function createTargetDirs() {
  if (!fs.existsSync(RELEASES_DIR)) {
    console.log('mkdir releases/ --> ' + RELEASES_DIR);
    fs.mkdirSync(RELEASES_DIR);
  }

  versionsRequested.forEach((ver) => {
    const targetDir = path.join(RELEASES_DIR, ver);
    if (!fs.existsSync(targetDir)) {
      console.log(`mkdir releases/${ver}/ --> ${targetDir}`);
      fs.mkdirSync(targetDir);
    }
  });

  versions4OrLater.forEach((ver) => {
    const tempDir = path.join(RELEASES_DIR, ver + TEMP_SUFFIX);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir);
    }
  });
}
createTargetDirs();

// For versions <= 3.0.9, we create a git worktree to check out the release/ folder from each tag.
async function getReleasesForVersion3OrEarlier() {
  const worktrees = [];

  console.log('\nCreating temporary worktrees for versions:', versions3OrEarlier);
  for (const ver of versions3OrEarlier) {
    const worktreePath = path.join(RELEASES_DIR, ver + TEMP_SUFFIX);
    worktrees.push(worktreePath);

    if (fs.existsSync(worktreePath)) {
      console.log('Removing existing worktree:', worktreePath);
      execFileSync('git', ['worktree', 'remove', '--', worktreePath]);
    }

    const output = execFileSync('git', ['worktree', 'add', '--detach', '--', worktreePath, ver]).toString();
    console.log(output);
  }

  console.log('\nExtract build files.');
  for (const ver of versions3OrEarlier) {
    const sourceDir = path.join(RELEASES_DIR, ver + TEMP_SUFFIX, 'releases');
    const targetDir = path.join(RELEASES_DIR, ver);
    // copy all files from sourceDir to targetDir.
    try {
      const results = await copy(sourceDir, targetDir);
      console.info('Copied ' + results.length + ' files to: ' + targetDir);
    } catch (error) {
      console.error('Copy failed: ' + error);
    }
  }

  console.log('\nRemove temporary worktrees.');
  for (const worktreePath of worktrees) {
    execFileSync('git', ['worktree', 'remove', '--force', '--', worktreePath]);
  }

  // Prune worktree information.
  execFileSync('git', ['worktree', 'prune']);
}
await getReleasesForVersion3OrEarlier();

// Rebuild the test suite for production-only packages, using the release's own source and lockfile.
function buildTaggedTests(version, tempDir) {
  const repo = path.resolve(__dirname, '..');
  const commit = execFileSync('git', ['rev-parse', '--verify', `refs/tags/${version}^{commit}`], {
    cwd: repo,
    encoding: 'utf8',
  }).trim();
  const cwd = path.join(tempDir, 'source');
  console.log(`Building visual tests from tag ${version} (${commit}).`);
  execFileSync('git', ['clone', '--quiet', '--local', '--no-checkout', '--', repo, cwd]);
  execFileSync('git', ['checkout', '--quiet', '--detach', commit], { cwd });
  const options = { cwd, stdio: 'inherit', env: { ...process.env, PUPPETEER_SKIP_DOWNLOAD: 'true' } };
  execFileSync('npm', ['ci'], options);
  execFileSync(process.execPath, ['node_modules/grunt/bin/grunt', 'webpack:debug', 'build:esm'], options);
  return path.join(cwd, 'build');
}

// For versions >= 4.0, use the published production files and obtain a matching visual test suite.
async function getReleasesForVersion4OrLater() {
  for (const ver of versions4OrLater) {
    // Download & extract the package in a temporary directory.
    const tempDir = path.join(RELEASES_DIR, ver + TEMP_SUFFIX);
    // Remove the temporary directory if it already exists.
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true });
    }
    // Make the temporary directory.
    fs.mkdirSync(tempDir);

    console.log('\nDownload', ver, 'from npm.');
    execFileSync('npm', ['pack', `vexflow@${ver}`, '--pack-destination', tempDir, '--ignore-scripts'], {
      stdio: ['ignore', 'pipe', 'inherit'],
    });

    const packageFile = `vexflow-${ver}.tgz`;
    console.log('Extract', packageFile);
    const tgzFile = path.join(tempDir, packageFile);
    execFileSync('tar', ['-xf', tgzFile, '-C', tempDir]);

    // Copy the files from the temporary directory to the target directory.
    const sourceDir = path.join(tempDir, 'package', 'build');
    const targetDir = path.join(RELEASES_DIR, ver);
    try {
      if (!fs.existsSync(path.join(sourceDir, 'cjs/vexflow-debug-with-tests.js'))) {
        const tests = buildTaggedTests(ver, tempDir);
        // Preserve the published bytes wherever the two builds overlap.
        fs.cpSync(tests, sourceDir, { recursive: true, force: false });
      }
      fs.cpSync(sourceDir, targetDir, { recursive: true });
      console.info('Copied release builds to: ' + targetDir);
    } finally {
      fs.rmSync(tempDir, { recursive: true });
    }
  }
}

await getReleasesForVersion4OrLater();

process.exit(0);
