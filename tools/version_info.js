// Provide version, source revision and timestamp for package and reproducible website builds.

const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');

let VEXFLOW_VERSION;
let GIT_COMMIT_ID;
let DATE;

function updateInfo() {
  VEXFLOW_VERSION = JSON.parse(fs.readFileSync('package.json')).version;
  // Website bundles identify the last runtime change so editing a lesson does not invalidate the library.
  if (process.env.VF_WEBSITE_BUILD === '1') {
    const inputs = [
      'src',
      'entry',
      'Gruntfile.js',
      'tools/version_info.js',
      'package.json',
      'package-lock.json',
      'tsconfig.json',
    ];
    const [commit, epoch] = execFileSync('git', ['log', '-1', '--format=%H %ct', '--', ...inputs], { encoding: 'utf8' })
      .trim()
      .split(' ');
    GIT_COMMIT_ID = commit;
    DATE = new Date(Number(epoch) * 1000).toISOString();
  } else {
    GIT_COMMIT_ID = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    DATE = new Date().toISOString();
  }
}

updateInfo();

module.exports = {
  VERSION: VEXFLOW_VERSION,
  ID: GIT_COMMIT_ID,
  DATE: DATE,

  // Save the build information to build/esm/src/version.js
  saveESMVersionFile() {
    const parentDir = path.join(__dirname, '..', 'build', 'esm', 'src');
    const outputFile = path.join(parentDir, 'version.js');

    const V = `export const VERSION = '${VEXFLOW_VERSION}';`;
    const I = `export const ID = '${GIT_COMMIT_ID}';`;
    const D = `export const DATE = '${DATE}';`;

    console.log(`Writing ESM version data to ${outputFile}`);
    fs.mkdirSync(parentDir, { recursive: true });
    fs.writeFileSync(outputFile, `${V}\n${I}\n${D}`);
  },

  update: updateInfo,
};
