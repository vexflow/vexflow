// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Font } from '../font';
import { CommonMetrics } from './common_metrics';
import { LelandFont } from './leland_glyphs';

export function loadLeland() {
  Font.load('Leland', LelandFont, CommonMetrics);
}
