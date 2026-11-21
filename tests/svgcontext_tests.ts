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
    oNcLiCk: 'alert(1)',
  });
  const rectangle = context.svg.querySelector('rect') as SVGRectElement;

  assert.notOk(rectangle.hasAttribute('oNcLiCk'), 'mixed-case event attributes are rejected');
  assert.equal(rectangle.getAttribute('fill'), 'red', 'ordinary presentation attributes remain');
  assert.equal(rectangle.getAttribute('pointer-events'), 'all', 'pointer rectangles remain interactive');

  context.beginPath().moveTo(0, 0).lineTo(1, 1).fill({ fill: 'green', oNlOaD: 'alert(2)' });
  const filledPath = context.svg.querySelector('path') as SVGPathElement;
  assert.notOk(filledPath.hasAttribute('oNlOaD'), 'path event attributes are rejected');
  assert.equal(filledPath.getAttribute('fill'), 'green', 'safe path attributes remain');

  const path = context.create('path');
  const inheritedAttributes = Object.create({ onfocus: 'alert(3)' });
  Object.assign(inheritedAttributes, {
    style: 'filter: url(javascript:alert(4))',
    href: 'javascript:alert(5)',
    'xlink:href': 'javascript:alert(6)',
    stroke: 'blue',
  });
  context.applyAttributes(path, inheritedAttributes);

  assert.notOk(path.hasAttribute('onfocus'), 'inherited event attributes are rejected');
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
  assert.equal(path.style.filter, 'drop-shadow(0 0 2px green)', 'trusted shadows remain');
}

VexFlowTests.register(SVGContextTests);
export { SVGContextTests };
