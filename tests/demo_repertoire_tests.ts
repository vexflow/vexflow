// Register each gallery arrangement as its own runnable module in the visual test suite.
import { VexFlowTests } from './vexflow_test_helpers';

import { drums } from './demos/drums';
import { electric } from './demos/electric';
import { greensleeves } from './demos/greensleeves';
import { joy } from './demos/joy';
import { kesh } from './demos/kesh';
import { prelude } from './demos/prelude';
import { quartertones } from './demos/quartertones';
import { saints } from './demos/saints';

/** Keep the lead sheet in its handwritten face on every enabled backend. */
const repertoire = [
  { title: 'When the Saints Go Marching In', render: saints, fonts: ['Petaluma'] },
  { title: 'Greensleeves', render: greensleeves },
  { title: 'Prelude in C major', render: prelude },
  { title: 'The Kesh Jig', render: kesh },
  { title: 'Ode to Joy', render: joy },
  { title: 'High Wire', render: electric },
  { title: 'Pocket Change', render: drums },
  { title: 'Narrow Steps', render: quartertones },
];
for (const piece of repertoire) {
  VexFlowTests.register({
    Start() {
      QUnit.module('Demo - ' + piece.title);
      VexFlowTests.runTests(piece.title, piece.render, undefined, piece.fonts);
    },
  });
}
