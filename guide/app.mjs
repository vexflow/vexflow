// Tutorial cover, chapter navigation and independent editable examples in reading order.
import { examples, lessons, sections, tutorial, units } from './content.mjs';
import { highlightCode } from './runtime/editor.mjs';
import { mountExample } from './workbench.mjs';

const $ = (id) => document.getElementById(id);
const sourceRoot = $('version').href.replace('/commit/', '/blob/') + '/';
const byExample = new Map(examples.map((example) => [example.id, example]));
const byLesson = new Map(lessons.map((lesson) => [lesson.id, lesson]));
let currentLesson;
let workbenches = [];
/** DOM helpers insert dynamic values as text, including code and diagnostics. */
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
/** Construct navigation without interpreting its label as markup. */
function link(text, href) {
  const element = node('a', text);
  element.href = href;
  return element;
}
/** Search lesson titles and prose; keep the tutorial steps together. */
function navigation() {
  const query = $('search').value.toLowerCase().trim();
  const words = query.split(/\s+/);
  $('navigation').replaceChildren();
  let count = 0;
  const groups = [
    ...units.map(({ title, lessons: ids }) => ({ title, lessons: ids.map((id) => byLesson.get(id)) })),
    ...sections.map((s) => ({
      title: s.title,
      lessons: lessons.filter((l) => l.section === s.id && !tutorial.includes(l.id)),
    })),
  ];
  for (const section of groups) {
    const found = section.lessons.filter((lesson) =>
      words.every((word) =>
        `${lesson.title} ${lesson.summary} ${lesson.body.replace(/<[^>]+>/g, ' ')} ${lesson.features.map((f) => f.title).join(' ')}`
          .toLowerCase()
          .includes(word)
      )
    );
    if (!found.length) continue;
    const group = node('section', undefined, 'nav-section');
    group.append(node('h2', section.title));
    for (const lesson of found) {
      const step = tutorial.indexOf(lesson.id);
      const item = link(
        step >= 0 ? step + 1 + '. ' + lesson.title : lesson.title,
        lesson.id === 'playground' ? '#playground/first-notes' : `#lesson/${lesson.id}`
      );
      if (lesson.id === currentLesson?.id) item.setAttribute('aria-current', 'page');
      group.append(item);
      count++;
    }
    $('navigation').append(group);
  }
  if (!count) $('navigation').append(node('p', 'No lessons found. Try “voice”, “tab”, or “font”.'));
}

/** Only repository-authored lesson HTML is inserted as markup. */
function showLesson(lesson) {
  const section = sections.find((item) => item.id === lesson.section);
  $('title').textContent = lesson.title;
  const step = tutorial.indexOf(lesson.id);
  $('section-label').textContent = step < 0 ? section.title : `Tutorial · Step ${step + 1} of ${tutorial.length}`;
  $('summary').textContent = lesson.summary;
  $('lesson').innerHTML = lesson.body;
  $('lesson').querySelectorAll('code').forEach(highlightCode);
  $('exercise').textContent = lesson.exercise;
  document.title = `${lesson.title} · VexFlow Guide`;
  $('reading').replaceChildren();
  for (const [heading, items] of [
    [
      'Keep learning',
      lesson.related.map((id) => {
        const item = lessons.find((value) => value.id === id);
        return [item.title, id === 'playground' ? '#playground/first-notes' : `#lesson/${id}`];
      }),
    ],
    [
      'Illustrated features',
      lesson.features.map(({ id, title }) => [title, 'https://vexflow.com/features/#feature-' + id]),
    ],
    [
      'Sources and API details',
      lesson.sources.map((source) =>
        source.startsWith('repo:')
          ? [source.slice(5), sourceRoot + source.slice(5)]
          : [
              source.includes('wiki')
                ? 'Original EasyScore wiki'
                : source.includes('/changelog/')
                  ? 'Release notes'
                  : 'Original VexFlow tutorial',
              source,
            ]
      ),
    ],
  ]) {
    if (!items.length) continue;
    const list = node('ul');
    for (const [text, href] of items) {
      const item = node('li');
      item.append(link(text, href));
      list.append(item);
    }
    $('reading').append(node('h2', heading), list);
  }
  const sequence = tutorial.includes(lesson.id)
    ? tutorial.map((id) => byLesson.get(id))
    : lessons.filter((item) => item.section === lesson.section);
  const index = sequence.indexOf(lesson);
  for (const [id, item, prefix] of [
    ['previous', sequence[index - 1], '← '],
    [
      'next',
      sequence[index + 1] ?? (lesson.id === tutorial.at(-1) ? byLesson.get('native-lifecycle') : undefined),
      'Next: ',
    ],
  ]) {
    if (!item && lesson.id !== 'playground') {
      $(id).hidden = false;
      $(id).textContent = 'Tutorial contents';
      $(id).href = '#tutorial';
      continue;
    }
    $(id).hidden = !item;
    if (item) {
      $(id).textContent = prefix + item.title;
      $(id).href = item.id === 'playground' ? '#playground/first-notes' : `#lesson/${item.id}`;
    }
  }
  navigation();
}

$('search').oninput = navigation;
$('example-select').onchange = () => {
  location.hash = `playground/${$('example-select').value}`;
};
$('menu').onclick = () => {
  const open = document.querySelector('.sidebar').classList.toggle('open');
  $('menu').setAttribute('aria-expanded', String(open));
};
for (const group of [...new Set(examples.map((example) => example.group))]) {
  const options = node('optgroup');
  options.label = group;
  for (const example of examples.filter((item) => item.group === group)) {
    const option = node('option', example.title);
    option.value = example.id;
    options.append(option);
  }
  $('example-select').append(options);
}

/** The same sequence drives the directory, chapter numbers and page turns. */
function directory(title, ids, numbered = false, description) {
  const list = node(numbered ? 'ol' : 'ul', undefined, 'chapter-list');
  if (numbered) {
    list.start = tutorial.indexOf(ids[0]) + 1;
    list.style.setProperty('--chapter-start', list.start - 1);
  }
  for (const id of ids) {
    const lesson = byLesson.get(id);
    const item = node('li');
    item.append(link(lesson.title, '#lesson/' + id));
    list.append(item);
  }
  const contents = $('chapter-directory');
  contents.append(node('h2', title));
  if (description) contents.append(node('p', description));
  contents.append(list);
}
for (const unit of units) directory(unit.title, unit.lessons, true, unit.description);
for (const section of sections.filter((section) => section.id !== 'playground')) {
  const extra = lessons.filter((l) => l.section === section.id && !tutorial.includes(l.id));
  if (extra.length)
    directory(
      section.title,
      extra.map((l) => l.id)
    );
}

/** Reparent without unloading the iframe where supported. Other browsers reuse the cached bundle. */
function placeExample(host, example, parked, playground = false) {
  const bench = parked.shift();
  if (bench) {
    host.moveBefore(bench.panel, null);
    bench.setMode(playground);
    bench.showExample(example);
    return bench;
  }
  const prefix = workbenches.length ? `example-${workbenches.length + 1}-` : '';
  return mountExample(host, example, { sourceRoot, prefix, playground });
}

/** A lesson owns its editors. Example fragments scroll to one without replacing its siblings. */
function route(focus = false) {
  let path = [];
  try {
    path = decodeURIComponent(location.hash.slice(1)).split('/');
  } catch {
    /* Show the index for malformed links. */
  }
  const playground = path[0] === 'playground' || (path[0] === 'lesson' && path[1] === 'playground');
  const lesson = playground ? byLesson.get('playground') : path[0] === 'lesson' ? byLesson.get(path[1]) : undefined;
  const changed = lesson !== currentLesson;
  $('tutorial-index').hidden = !!lesson;
  $('chapter').hidden = !lesson;
  document.querySelector('.layout').classList.toggle('cover-layout', !lesson);
  document.querySelector('.sidebar').classList.remove('open');
  $('menu').setAttribute('aria-expanded', 'false');
  const tab = playground
    ? '#playground/first-notes'
    : lesson?.id === 'setup'
      ? '#lesson/setup'
      : lesson?.section === 'api'
        ? '#lesson/native-lifecycle'
        : '#tutorial';
  for (const a of document.querySelectorAll('.site-header nav a')) {
    if (a.hash === tab) a.setAttribute('aria-current', 'page');
    else a.removeAttribute('aria-current');
  }
  const parked = [];
  if (changed) {
    for (const bench of workbenches) {
      if (lesson && $('parked-examples').moveBefore) {
        $('parked-examples').moveBefore(bench.panel, null);
        parked.push(bench);
      } else bench.dispose();
    }
    workbenches = [];
    currentLesson = lesson;
  }
  if (!lesson) {
    document.title = 'The VexFlow Tutorial · VexFlow Guide';
  } else {
    if (changed) showLesson(lesson);
    $('playground-panel').hidden = $('example-picker').hidden = $('example-description').hidden = !playground;
    if (playground) {
      const example = byExample.get(path[1]) ?? byExample.get('first-notes');
      $('example-select').value = example.id;
      $('example-description').textContent = example.description;
      if (changed) workbenches.push(placeExample($('playground-example'), example, parked, true));
      else workbenches[0].showExample(example);
    } else if (changed) {
      for (const host of $('lesson').querySelectorAll('[data-example]')) {
        workbenches.push(placeExample(host, byExample.get(host.dataset.example), parked));
      }
    }
    for (const bench of parked) bench.dispose();
    const target =
      !playground && lesson.examples.includes(path[2]) && $('lesson').querySelector(`[data-example="${path[2]}"]`);
    if (target) {
      target.querySelector('[data-part="example-title"]').focus({ preventScroll: true });
      target.scrollIntoView();
      return;
    }
  }
  if (focus) {
    $('main').focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }
}
document.querySelector('.skip').addEventListener('click', (event) => {
  event.preventDefault();
  $('main').focus();
});
window.addEventListener('hashchange', () => route(true));
route();
