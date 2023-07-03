// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Font } from '../font';
import { CommonMetrics } from './common_metrics';
import { CustomFont } from './custom_glyphs';

export function loadCustom() {
  Font.load('Custom', CustomFont, CommonMetrics);
}
