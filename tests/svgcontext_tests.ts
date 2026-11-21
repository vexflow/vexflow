// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// SVGContext security-boundary and presentation-compatibility tests.
// MIT License

import { VexFlowTests } from './vexflow_test_helpers';

import { SVGContext } from '../src/index';

const SVGContextTests = {
  Start(): void {
    QUnit.module('SVGContext');
    QUnit.test('Rejects executable attributes', rejectsExecutableAttributes);
    QUnit.test('Preserves presentation attributes', preservesPresentationAttributes);
  },
};

/** Verify that public attribute records cannot install script-capable SVG attributes. */
function rejectsExecutableAttributes(assert: Assert): void {
  const context = new SVGContext(document.createElement('div'));
  context.rect(1, 2, 3, 4, {
    fill: 'red',
    'pointer-events': 'all',
    oNcLiCk: 'ignored',
  });
  const rectangle = context.svg.querySelector('rect') as SVGRectElement;

  assert.notOk(rectangle.hasAttribute('oNcLiCk'), 'mixed-case event attributes are rejected');
  assert.equal(rectangle.getAttribute('fill'), 'red', 'ordinary presentation attributes remain');
  assert.equal(rectangle.getAttribute('pointer-events'), 'all', 'pointer rectangles remain interactive');

  context.beginPath().moveTo(0, 0).lineTo(1, 1).fill({ fill: 'green', oNlOaD: 'ignored' });
  const filledPath = context.svg.querySelector('path') as SVGPathElement;
  assert.notOk(filledPath.hasAttribute('oNlOaD'), 'path event attributes are rejected');
  assert.equal(filledPath.getAttribute('fill'), 'green', 'safe path attributes remain');

  const path = context.create('path');
  const inheritedAttributes = Object.create({ onfocus: 'ignored', opacity: 0.5 });
  Object.assign(inheritedAttributes, {
    style: 'opacity: 0.5',
    href: '#unused',
    'xlink:href': '#unused',
    stroke: 'blue',
  });
  context.applyAttributes(path, inheritedAttributes);

  assert.notOk(path.hasAttribute('onfocus'), 'inherited event attributes are rejected');
  assert.notOk(path.hasAttribute('opacity'), 'inherited presentation attributes are ignored');
  assert.notOk(path.hasAttribute('style'), 'caller-supplied raw styles are rejected');
  assert.notOk(path.hasAttribute('href'), 'unqualified links are rejected');
  assert.notOk(path.hasAttribute('xlink:href'), 'namespaced links are rejected');
  assert.equal(path.getAttribute('stroke'), 'blue', 'safe direct attributes remain');
}

/** Verify that geometry, presentation, paths, and trusted shadow rendering still work. */
function preservesPresentationAttributes(assert: Assert): void {
  const context = new SVGContext(document.createElement('div'));
  context.rect(1, 2, 3, 4, { fill: 'red', stroke: 'blue', opacity: 0.5 });
  const rectangle = context.svg.querySelector('rect') as SVGRectElement;

  assert.equal(rectangle.getAttribute('x'), '1', 'rectangle geometry remains');
  assert.equal(rectangle.getAttribute('fill'), 'red', 'rectangle fill remains');
  assert.equal(rectangle.getAttribute('stroke'), 'blue', 'rectangle stroke remains');
  assert.equal(rectangle.getAttribute('opacity'), '0.5', 'rectangle opacity remains');

  context.setShadowBlur(3).setShadowColor('green');
  context.beginPath().moveTo(0, 0).lineTo(2, 2).fill({ fill: 'purple', stroke: 'none' });
  const path = context.svg.querySelector('path') as SVGPathElement;

  assert.equal(path.getAttribute('d'), 'M0 0L2 2', 'path geometry remains');
  assert.equal(path.getAttribute('fill'), 'purple', 'path presentation remains');
  // Browsers can serialize the color first and give zero lengths a unit.
  const expected = document.createElement('div').style;
  expected.filter = 'drop-shadow(0 0 2px green)';
  assert.ok(expected.filter, 'the browser supports a CSS drop shadow');
  assert.equal(path.style.filter, expected.filter, 'trusted shadows retain their color, offset, and blur');
}

VexFlowTests.register(SVGContextTests);
export { SVGContextTests };
