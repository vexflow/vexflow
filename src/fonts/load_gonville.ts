// Copyright (c) 2023-present VexFlow contributors: https://github.com/vexflow/vexflow/graphs/contributors
// MIT License

import { Font } from '../font';
import { CommonMetrics } from './common_metrics';
import { GonvilleSmuflFont } from './gonville_glyphs';

export function loadGonville() {
  Font.load('Gonville', GonvilleSmuflFont, CommonMetrics);
}
