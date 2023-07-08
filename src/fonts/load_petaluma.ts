// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Font, FontMetrics } from '../font';
import { CommonMetrics } from './common_metrics';
import { PetalumaFont } from './petaluma_glyphs';

export function loadPetaluma() {
  const metrics: FontMetrics = JSON.parse(JSON.stringify(CommonMetrics));
  Font.load('Petaluma', PetalumaFont, metrics);
}
