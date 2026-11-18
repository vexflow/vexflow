// Executable VF6 design study. These two small versioned formats cover the M1 passage.
const durations = new Map([
  ['1/1', 'w'],
  ['1/2', 'h'],
  ['1/4', 'q'],
  ['1/8', '8'],
  ['1/16', '16'],
]);
const fractions = new Map([...durations].map(([a, b]) => [b, a]));

/** Before returning any file, identify the source and phase of a failed conversion. */
function fail(code, sourceId, phase) {
  const diagnostic = { code, sourceId, severity: 'error', phase };
  throw Object.assign(new Error(`${code} at ${sourceId}`), { diagnostic });
}

/** The experiment uses exact sixteenth units internally; the two encodings keep rational time. */
function ticks(at, owner, phase) {
  const match = /^(0|[1-9]\d*)\/(1|2|4|8|16)$/.exec(at);
  if (!match || +match[1] > +match[2]) fail('UnsupportedTime', owner, phase);
  const value = (+match[1] * 16) / +match[2];
  if (at !== rational(value)) fail('UnsupportedTime', owner, phase);
  return value;
}
function rational(t) {
  if (!t) return '0/1';
  for (const denominator of [1, 2, 4, 8, 16]) {
    if (Number.isInteger((t * denominator) / 16)) return `${(t * denominator) / 16}/${denominator}`;
  }
}

/** Reject extra fields including authored overrides without a portable interpretation. */
function fields(object, names, id, phase) {
  if (
    !object ||
    Object.getPrototypeOf(object) !== Object.prototype ||
    Object.keys(object).some((k) => !names.includes(k))
  )
    fail('UnsupportedInput', object?.getAttribute?.('id') ?? object?.id ?? id, phase);
}

/** Validate identity, ownership, meter fill, closed references and the supported input vocabulary. */
function validate(score, phase) {
  const ids = new Set();
  const events = new Set();
  const claim = (id) => {
    if (typeof id !== 'string' || !id || ids.has(id)) fail('InvalidId', id, phase);
    ids.add(id);
  };
  fields(score, ['staves', 'measures', 'marks'], 'score', phase);
  if (![score.staves, score.measures, score.marks].every(Array.isArray)) fail('UnsupportedInput', 'score', phase);
  if (!score.staves.length || !score.measures.length) fail('EmptyScore', 'score', phase);
  for (const staff of score.staves) {
    fields(staff, ['id', 'voice', 'clef', 'key', 'time'], staff?.id ?? 'staff', phase);
    claim(staff.id);
    claim(staff.voice);
    if (!['treble', 'bass'].includes(staff.clef) || !['C', 'G'].includes(staff.key) || staff.time !== '4/4')
      fail('UnsupportedContext', staff.id, phase);
  }
  for (const bar of score.measures) {
    fields(bar, ['id', 'key', 'voices'], bar?.id ?? 'measure', phase);
    claim(bar.id);
    if (bar.key !== undefined && !['C', 'G'].includes(bar.key)) fail('UnsupportedContext', bar.id, phase);
    fields(
      bar.voices,
      score.staves.map((s) => s.voice),
      bar.id,
      phase
    );
    for (const staff of score.staves) {
      let t = 0;
      if (!Array.isArray(bar.voices[staff.voice])) fail('MissingVoice', bar.id, phase);
      for (const event of bar.voices[staff.voice]) {
        fields(event, ['id', 'pitch', 'at', 'duration'], bar.id, phase);
        claim(event.id);
        events.add(event.id);
        if (
          !durations.has(event.duration) ||
          ticks(event.at, event.id, phase) !== t ||
          !/^[a-g](#|b)?\/[0-9]$/.test(event.pitch)
        )
          fail('UnsupportedEvent', event.id, phase);
        t += ticks(event.duration, event.id, phase);
      }
      if (t !== 16) fail('IncompleteMeasure', bar.id, phase);
    }
  }
  const barIndex = (id, owner) => {
    const index = score.measures.findIndex((b) => b.id === id);
    if (index < 0) fail('DanglingAnchor', owner, phase);
    return index;
  };
  for (const mark of score.marks) {
    claim(mark?.id);
    if (mark.kind === 'dynamic') {
      fields(mark, ['id', 'kind', 'event', 'text', 'offset'], mark.id, phase);
      if (!events.has(mark.event)) fail('DanglingAnchor', mark.id, phase);
      if (!Number.isFinite(mark.offset) || mark.text !== 'p') fail('UnsupportedMark', mark.id, phase);
      continue;
    }
    if (!score.staves.some((s) => s.id === mark.staff)) fail('DanglingAnchor', mark.id, phase);
    if (mark.kind === 'rehearsal') {
      fields(mark, ['id', 'kind', 'measure', 'staff', 'text'], mark.id, phase);
      barIndex(mark.measure, mark.id);
      if (typeof mark.text !== 'string') fail('UnsupportedMark', mark.id, phase);
    } else if (mark.kind === 'pedal') {
      fields(mark, ['id', 'kind', 'staff', 'start', 'end'], mark.id, phase);
      const positions = [mark.start, mark.end].map((anchor, i) => {
        fields(anchor, ['measure', 'at', 'continuation'], mark.id, phase);
        const bar = barIndex(anchor.measure, mark.id);
        const at = ticks(anchor.at, mark.id, phase);
        if (
          anchor.continuation !== undefined &&
          (anchor.continuation !== true || (i ? bar !== score.measures.length - 1 || at !== 16 : bar !== 0 || at !== 0))
        )
          fail('InvalidContinuation', mark.id, phase);
        return bar * 16 + at;
      });
      if (positions[0] >= positions[1]) fail('InvalidSpan', mark.id, phase);
    } else fail('UnsupportedMark', mark.id, phase);
  }
  return score;
}

/** Project into actual EasyScore composition input. Its native API infers onsets from duration. */
export function compositionInput(score) {
  return {
    staves: score.staves.map((staff) => ({
      id: staff.id,
      clef: staff.clef,
      key: staff.key,
      time: staff.time,
      measures: score.measures.map((bar) => ({
        ...(bar.key && { key: bar.key }),
        voices: [
          {
            notes: bar.voices[staff.voice].map((e) => ({
              id: e.id,
              note: { clef: staff.clef, keys: [e.pitch], duration: durations.get(e.duration) },
            })),
          },
        ],
      })),
    })),
  };
}

/** Compare a measure-first document with a staff-first EasyScore file and its required sidecar. */
export function saveScore(score, format) {
  validate(score, 'encode');
  if (format === 'logical') return JSON.stringify({ format, version: 1, score });
  if (format !== 'easyscore') fail('UnsupportedFormat', 'score', 'encode');
  return JSON.stringify({
    format,
    version: 1,
    composition: compositionInput(score),
    measureIds: score.measures.map((b) => b.id),
    voiceIds: score.staves.map((s) => s.voice),
    marks: score.marks,
  });
}

/** Reconstruct the same logical passage without a Factory or retained native object. */
export function loadScore(text) {
  let file;
  try {
    file = JSON.parse(text);
  } catch {
    fail('InvalidDocument', 'score', 'decode');
  }
  if (file?.version !== 1) fail('UnsupportedVersion', 'score', 'decode');
  if (file.format === 'logical') {
    fields(file, ['format', 'version', 'score'], 'score', 'decode');
    return validate(file.score, 'decode');
  }
  if (file.format !== 'easyscore') fail('UnsupportedFormat', 'score', 'decode');
  fields(file, ['format', 'version', 'composition', 'measureIds', 'voiceIds', 'marks'], 'score', 'decode');
  if (
    ![file.composition?.staves, file.measureIds, file.voiceIds, file.marks].every(Array.isArray) ||
    !file.composition.staves.length ||
    file.composition.staves.length !== file.voiceIds.length
  )
    fail('InvalidDocument', 'score', 'decode');
  for (const staff of file.composition.staves) {
    if (!Array.isArray(staff?.measures) || staff.measures.length !== file.measureIds.length)
      fail('InvalidDocument', staff?.id ?? 'staff', 'decode');
  }
  const staves = file.composition.staves.map(({ id, clef, key, time }, i) => ({
    id,
    clef,
    key,
    time,
    voice: file.voiceIds[i],
  }));
  const measures = file.measureIds.map((id, i) => {
    const voices = Object.create(null);
    const key = file.composition.staves[0].measures[i]?.key;
    for (const [j, staff] of file.composition.staves.entries()) {
      const bar = staff.measures[i];
      if (
        !bar ||
        bar.key !== key ||
        !Array.isArray(bar.voices) ||
        bar.voices.length !== 1 ||
        !Array.isArray(bar.voices[0]?.notes)
      )
        fail('UnsupportedContext', id, 'decode');
      let t = 0;
      voices[staves[j].voice] = bar.voices[0].notes.map((item) => {
        const { id, note } = item ?? {};
        if (!Array.isArray(note?.keys) || note.keys.length !== 1 || !fractions.has(note.duration))
          fail('UnsupportedEvent', id, 'decode');
        const event = { id, pitch: note.keys[0], duration: fractions.get(note.duration), at: rational(t) };
        t += ticks(event.duration, id, 'decode');
        return event;
      });
    }
    return { id, ...(key && { key }), voices: { ...voices } };
  });
  const score = validate({ staves, measures, marks: file.marks }, 'decode');
  // Only the supported composition grammar may round-trip. Reject additional native properties.
  const reconstructed = compositionInput(score);
  const canonical = (value) =>
    Array.isArray(value)
      ? value.map(canonical)
      : value && typeof value === 'object'
        ? Object.fromEntries(
            Object.keys(value)
              .sort()
              .map((k) => [k, canonical(value[k])])
          )
        : value;
  if (JSON.stringify(canonical(reconstructed)) !== JSON.stringify(canonical(file.composition)))
    fail('UnsupportedInput', 'composition', 'decode');
  return score;
}

/** A contiguous excerpt has a self-contained initial context and explicit clipped pedal ends. */
export function excerpt(score, firstId, lastId = firstId) {
  validate(score, 'excerpt');
  const index = (id) => score.measures.findIndex((b) => b.id === id);
  const first = index(firstId),
    last = index(lastId);
  if (first < 0 || last < first) fail('InvalidRange', firstId, 'excerpt');
  const measures = structuredClone(score.measures.slice(first, last + 1));
  const events = new Set(
    measures.flatMap((b) =>
      Object.values(b.voices)
        .flat()
        .map((e) => e.id)
    )
  );
  const staves = score.staves.map((staff) => {
    let key = staff.key;
    for (const bar of score.measures.slice(0, first + 1)) key = bar.key ?? key;
    return { ...staff, key };
  });
  const marks = [];
  for (const mark of structuredClone(score.marks)) {
    if (mark.kind === 'dynamic' && events.has(mark.event)) marks.push(mark);
    if (mark.kind === 'rehearsal' && index(mark.measure) >= first && index(mark.measure) <= last) marks.push(mark);
    if (mark.kind !== 'pedal' || index(mark.end.measure) < first || index(mark.start.measure) > last) continue;
    if (index(mark.start.measure) < first) mark.start = { measure: firstId, at: '0/1', continuation: true };
    if (index(mark.end.measure) > last) mark.end = { measure: lastId, at: '1/1', continuation: true };
    if (
      mark.start.measure !== mark.end.measure ||
      ticks(mark.start.at, mark.id, 'excerpt') < ticks(mark.end.at, mark.id, 'excerpt')
    )
      marks.push(mark);
  }
  return validate({ staves, measures, marks }, 'excerpt');
}
