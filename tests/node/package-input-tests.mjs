// Regression tests for package delivery and hostile score input.
// Build ESM first. Potentially hanging cases run in child processes with hard timeouts.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const coreURL = new URL('../../build/esm/entry/vexflow-core.js', import.meta.url).href;

/** A timeout or nonzero exit always fails the test, rather than freezing the runner. */
function runIsolated(source) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', source], {
    cwd: root,
    timeout: 3000,
    encoding: 'utf8',
  });
  assert.ifError(result.error);
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

/** Import the built core and exercise a single isolated regression. */
function checkCore(source) {
  runIsolated(`import assert from 'node:assert/strict';
    import { Element, Registry, Fraction, Voice, GhostNote, Tuning } from ${JSON.stringify(coreURL)};
    ${source}`);
}

test('all published ESM entries load', () => {
  const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url)));
  for (const entry of Object.values(pkg.exports)) {
    runIsolated(`await import(${JSON.stringify(new URL(`../../${entry.import}`, import.meta.url).href)});`);
  }
});

test('ESM rewrite preserves packages, URLs, comments, and explicit extensions', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vexflow-esm-'));
  try {
    const input = `import clone from 'structured-clone-es';
import scoped from '@scope/package';
import 'node:fs';
import 'https://example.com/module';
import './already.js';
import './data.json';
import './side-effect';
import value from "../value";
export * from './';
export { default } from '.';
export * from '@scope/other';
const lazy = import('./lazy');
const text = "import './not-an-import';";
// import './comment';
`;
    const filename = join(directory, 'fixture.js');
    writeFileSync(filename, input);
    const command = [join(root, 'tools/fix-esm-imports.mjs'), directory];
    assert.equal(spawnSync(process.execPath, command).status, 0);
    const expected = input
      .replace("'./side-effect'", "'./side-effect.js'")
      .replace('"../value"', '"../value.js"')
      .replace("from './'", "from './index.js'")
      .replace("from '.'", "from './index.js'")
      .replace("import('./lazy')", "import('./lazy.js')");
    assert.equal(readFileSync(filename, 'utf8'), expected);
    assert.equal(spawnSync(process.execPath, command).status, 0);
    assert.equal(readFileSync(filename, 'utf8'), expected, 'rewrite is idempotent');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('registry treats prototype-related IDs and classes as ordinary data', () => {
  checkCore(`
    const before = Object.getOwnPropertyDescriptors(Object.prototype);
    const registry = new Registry();
    for (const id of ['reviewProbe', '__proto__', 'constructor', 'toString']) {
      const element = registry.register(new Element(), id).getElementById(id);
      assert.ok(element);
      for (const name of ['__proto__', 'constructor', 'toString']) {
        element.addClass(name);
        assert.ok(registry.getElementsByClass(name).includes(element));
        element.removeClass(name);
        assert.ok(!registry.getElementsByClass(name).includes(element));
      }
    }
    for (const name of ['__proto__', 'constructor', 'toString', 'missing']) {
      assert.throws(() => registry.setIndexValue(name, 'value', 'id', new Element()), /BadArgument/);
      assert.throws(() => registry.updateIndex({id:'reviewProbe', name, value:'value'}), /BadArgument/);
      assert.deepEqual(registry.getElementsByAttribute(name, 'value'), []);
    }
    assert.deepEqual(Object.getOwnPropertyDescriptors(Object.prototype), before);
    registry.clear();
    assert.equal(registry.getElementById('__proto__'), undefined);
  `);
});

for (const duration of ["'9'.repeat(10000) + 'X'", "'4' + 'd'.repeat(100000)", "'prefix4'", "'4junk'"]) {
  test(`reject malformed duration: ${duration}`, () => checkCore(`assert.throws(() => new GhostNote(${duration}));`));
}

test('valid durations and tuning still work', () => {
  checkCore(`
    for (const duration of ['1/2', 'w', 'h', 'q', '4', '8d', '16dd', '4r', '4n', '4h', '4m', '4s']) {
      assert.ok(new GhostNote(duration).getTicks().value() > 0, duration);
    }
    assert.equal(new Tuning(' E/5 , B/4 , G/4 ').getValueForString(2), new Tuning('standard').getValueForString(2));
    assert.throws(() => new Tuning('constructor'));
    assert.throws(() => new Tuning(' '.repeat(100000) + 'X'));
  `);
});

for (const meter of [
  "'9'.repeat(100000)",
  "'9'.repeat(400) + '/4'",
  "'4/0'",
  "'0/4'",
  "'prefix4/4'",
  "'4/4suffix'",
  "''",
  '{numBeats:Infinity,beatValue:4}',
  '{numBeats:4,beatValue:NaN}',
  '{numBeats:4,beatValue:0}',
  '{numBeats:-1,beatValue:4}',
  '{numBeats:1.5,beatValue:4}',
  '{numBeats:4,beatValue:4,resolution:0}',
  '{numBeats:4,beatValue:4,resolution:Infinity}',
  '{numBeats:Number.MAX_SAFE_INTEGER,beatValue:1}',
]) {
  test(`reject invalid meter: ${meter}`, () =>
    checkCore(`assert.throws(() => new Voice(${meter}).isComplete(), /BadArgument/);`));
}

test('valid meters preserve tick counts', () => {
  checkCore(`
    assert.equal(new Voice().getTotalTicks().value(), new Voice('4/4').getTotalTicks().value());
    assert.equal(new Voice('3/8').getTotalTicks().value(), 6144);
    assert.equal(new Voice({numBeats:3,beatValue:8,resolution:480}).getTotalTicks().value(), 180);
  `);
});

for (const value of ['Infinity', '-Infinity', 'NaN']) {
  test(`fraction rejects ${value} in both operands`, () =>
    checkCore(`
    assert.throws(() => Fraction.GCD(${value}, 1), /BadArgument/);
    assert.throws(() => Fraction.GCD(1, ${value}), /BadArgument/);
    assert.throws(() => new Fraction(${value}, 1), /BadArgument/);
    assert.throws(() => new Fraction(1, ${value}), /BadArgument/);
  `));
}

test('fraction rejects zero denominators and overflow without changing its value', () => {
  checkCore(`
    assert.throws(() => new Fraction(1, 0), /BadArgument/);
    const fraction = new Fraction(1, 2);
    assert.throws(() => fraction.divide(0), /BadArgument/);
    assert.equal(fraction.value(), 0.5);
    assert.throws(() => new Fraction(Number.MAX_VALUE).multiply(2), /BadArgument/);
    assert.equal(new Fraction(0, 2).simplify().value(), 0);
    assert.equal(new Fraction(1, -2).simplify().value(), -0.5);
    assert.equal(new Fraction(0.5, 1).simplify().toString(), '1/2');
    assert.equal(Fraction.GCD(0, 0), 0);
  `);
});
