// Release entry points shared by the staged GitHub workflow and the legacy Grunt release hook.
import { execFileSync } from 'node:child_process';
import { access } from 'node:fs/promises';
import { join } from 'node:path';
import { buildReport, git, output, releaseRevision, root } from './build.mjs';
import { uploadReport } from './upload.mjs';

/** Check the published tag before associating a public report with that release. Peel annotated tags. */
export function verifyPublishedTag({ tag, commit }, repository = 'https://github.com/vexflow/vexflow.git') {
  const ref = 'refs/tags/' + tag;
  const lines = git(root, 'ls-remote', '--tags', repository, ref, ref + '^{}').split('\n');
  const refs = new Map(
    lines.map((line) => {
      const [hash, name] = line.split('\t');
      return [name, hash];
    })
  );
  if ((refs.get(ref + '^{}') ?? refs.get(ref)) !== commit)
    throw Error(`Push release tag ${tag} at ${commit} before publishing its report.`);
}

/** Upload the report for the tagged revision before making a staged GitHub release public. */
export async function publishRelease(tag, { github = false, dryRun = false } = {}) {
  const release = releaseRevision(tag);
  const { commit, version } = release;
  const directory = join(root, 'releases', version);
  const notes = join(directory, 'notes.md');
  const tarball = join(directory, `vexflow-${version}.tgz`);
  const sums = join(directory, 'SHA256SUMS');
  if (github) await Promise.all([notes, tarball, sums].map((file) => access(file)));
  if (!dryRun) verifyPublishedTag(release);
  await buildReport(release);
  await uploadReport({ directory: output, commit, dryRun });
  if (github) {
    const args = [
      'release',
      'create',
      tag,
      '--repo',
      'vexflow/vexflow',
      '--verify-tag',
      ...(version.split('+')[0].includes('-') ? ['--prerelease', '--latest=false'] : ['--latest']),
      '--title',
      `VexFlow ${version}`,
      '--notes-file',
      notes,
      tarball,
      sums,
    ];
    if (dryRun) console.log(`Dry run: create GitHub release ${tag} with its tarball and checksum file.`);
    else execFileSync('gh', args, { cwd: root, stdio: 'inherit' });
  }
}
