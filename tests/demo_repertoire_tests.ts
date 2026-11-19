// Register each gallery arrangement as its own runnable module in the visual test suite.
import { VexFlowTests } from './vexflow_test_helpers';

import { ballade } from './demos/ballade';
import { drums } from './demos/drums';
import { electric } from './demos/electric';
import { fugue } from './demos/fugue';
import { greensleeves } from './demos/greensleeves';
import { joy } from './demos/joy';
import { kesh } from './demos/kesh';
import { prelude } from './demos/prelude';
import { quartertones } from './demos/quartertones';
import { saints } from './demos/saints';

/** Pair the lead sheet's handwritten music with engraved words and chord names. */
const repertoire = [
  { title: 'When the Saints Go Marching In', render: saints, fonts: ['Petaluma with Academico'] },
  { title: 'Greensleeves', render: greensleeves },
  { title: 'Prelude in C major', render: prelude },
  { title: 'Fugue No. 6 in D minor', render: fugue },
  { title: 'Ballade No. 3 in A-flat major', render: ballade },
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
