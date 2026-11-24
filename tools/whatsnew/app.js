// Offline report navigation, list paging, search and full-size score comparisons.
(() => {
  const $ = (id) => document.getElementById(id);
  const data = JSON.parse($('report-data').textContent);
  const make = (tag, text) => {
    const e = document.createElement(tag);
    if (text !== undefined) e.textContent = text;
    return e;
  };
  // The offline report and its published copy share the same PNG names. The website adds a content hash.
  const imagePath = (path) => {
    const match = /^(?:\.\/)?assets\/(?:([a-f0-9]{64})\/)?([\w-]+\.png)$/.exec(path);
    if (!match) throw new Error('Invalid exhibit image path.');
    const directory = match[1] ? encodeURIComponent(match[1]) + '/' : '';
    return './assets/' + directory + encodeURIComponent(match[2]);
  };
  const exhibitLink = (id, label) => {
    const a = make('a', label);
    a.href = '#plate-' + encodeURIComponent(id);
    a.dataset.plate = id;
    return a;
  };
  // Every evidence link is a source file, change, or issue in the VexFlow repository.
  const repositoryLink = (source, label) => {
    const u = new URL(source);
    if (u.origin !== 'https://github.com' || !u.pathname.startsWith('/vexflow/vexflow/'))
      throw new Error('Invalid evidence source.');
    const a = make('a', label);
    a.href = 'https://github.com' + u.pathname + u.search + u.hash;
    return a;
  };
  const query = (v) => v.toLowerCase().trim().split(/\s+/).filter(Boolean);
  const matches = (words, value) => words.every((w) => value.toLowerCase().includes(w));
  const figures = new Map(data.figures.map((f) => [f.id, f]));
  const dialog = $('lightbox');
  let invoking;
  let sequence = [],
    changeTitles = [],
    position = 0;
  const exhibits = data.figures;
  const allIds = exhibits.map((f) => f.id);

  const figureMatches = (f) =>
    ($('figure-type').value === 'All exhibits' || f.status === $('figure-type').value) &&
    matches(
      query($('figure-query').value),
      [f.name, f.module, f.description, f.status, f.leftCaption, f.rightCaption].join(' ')
    );

  /** Use the entire filtered collection, including exhibits beyond the current page of tiles. */
  function chooseSequence(origin, id, historyIndex) {
    changeTitles = [];
    if (origin === 'gallery') sequence = exhibits.filter(figureMatches).map((f) => f.id);
    else if (origin === 'changes') {
      sequence = [];
      for (const row of document.querySelectorAll('.change[data-exhibits]:not([hidden])')) {
        const ids = row.dataset.exhibits.split(' ');
        sequence.push(...ids);
        changeTitles.push(...ids.map(() => row.querySelector('h4').textContent));
      }
    } else sequence = allIds;
    if (!sequence.includes(id)) {
      sequence = [...figures.keys()];
      changeTitles = [];
    }
    position = sequence[historyIndex] === id ? historyIndex : sequence.indexOf(id);
  }

  /** Replace the exhibit fragment so Close or browser Back returns directly to the report. */
  function step(direction) {
    const next = position + direction;
    if (next < 0 || next >= sequence.length) return;
    position = next;
    const id = sequence[next];
    history.replaceState({ ...history.state, index: next }, '', '#plate-' + id);
    openFigure(id);
    dialog.scrollTop = 0;
  }
  $('previous-plate').onclick = () => step(-1);
  $('next-plate').onclick = () => step(1);
  dialog.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      step(event.key === 'ArrowLeft' ? -1 : 1);
    }
  });
  function openFigure(id) {
    const figure = figures.get(id);
    if (!figure) return;
    if (!dialog.open) invoking = document.activeElement;
    $('previous-plate').disabled = position <= 0;
    $('next-plate').disabled = position >= sequence.length - 1;
    $('plate-position').textContent = position + 1 + ' of ' + sequence.length;
    $('figure-title').textContent = figure.name;
    $('figure-group').textContent = [
      changeTitles[position] !== figure.name && changeTitles[position],
      figure.module,
      figure.status,
    ]
      .filter(Boolean)
      .join(' · ');
    $('figure-desc').textContent = figure.description ?? '';
    $('figure-desc').hidden = !figure.description || figure.description === figure.name;
    $('plates').replaceChildren();
    for (const [path, label, caption, size] of [
      [figure.left, figure.leftLabel, figure.leftCaption, figure.leftSize],
      [figure.right, figure.rightLabel, figure.rightCaption, figure.rightSize],
    ]) {
      if (!path) continue;
      const frame = make('figure'),
        image = make('img'),
        full = make('a');
      if (size) [image.width, image.height] = size;
      image.src = imagePath(path);
      full.href = imagePath(path);
      image.alt = caption || label + ' — ' + figure.name;
      full.target = '_blank';
      full.rel = 'noopener';
      full.append(image);
      const heading =
        caption && !caption.toLowerCase().startsWith(label.toLowerCase()) ? label + ' · ' + caption : caption || label;
      frame.append(make('figcaption', heading), full);
      $('plates').append(frame);
    }
    $('plate-source').replaceChildren(...(figure.source ? [repositoryLink(figure.source, 'Evidence and source')] : []));
    if (!dialog.open) dialog.showModal();
  }
  function sync() {
    const hash = location.hash.slice(1);
    // Bookmarks to the former commit screenshots now open the text record.
    if (hash.startsWith('plate-commit-')) {
      const sha = hash.slice('plate-commit-'.length);
      if (data.commits.some((commit) => commit.hash === sha)) {
        const search = $('commit-query');
        search.value = sha;
        search.dispatchEvent(new Event('input'));
        const row = $('commit-' + sha);
        row.open = true;
        row.scrollIntoView();
      }
    } else if (hash.startsWith('plate-') && figures.has(hash.slice(6))) {
      chooseSequence(history.state?.origin, hash.slice(6), history.state?.index);
      openFigure(hash.slice(6));
    } else if (dialog.open) {
      dialog.close();
      // Restore focus now. A later close event could interrupt typing in another control.
      invoking?.focus({ preventScroll: true });
    }
  }
  document.addEventListener('click', (event) => {
    const a = event.target.closest('[data-plate]');
    if (!a) return;
    event.preventDefault();
    const change = a.closest('.change');
    const origin = change ? 'changes' : a.closest('#figures') ? 'gallery' : 'all';
    // A score may illustrate two changes. Start at the chosen row's occurrence.
    let index = 0;
    if (change)
      for (const row of document.querySelectorAll('.change[data-exhibits]:not([hidden])')) {
        if (row === change) break;
        index += row.dataset.exhibits.split(' ').length;
      }
    history.pushState({ plate: true, origin, index }, '', a.hash);
    sync();
  });
  const close = () => {
    if (history.state?.plate) history.back();
    else {
      history.replaceState(null, '', '#visual-index');
      sync();
    }
  };
  $('close').onclick = close;
  dialog.oncancel = (e) => {
    e.preventDefault();
    close();
  };
  window.addEventListener('hashchange', sync);
  $('search').oninput = () => {
    const words = query($('search').value);
    let count = 0;
    for (const item of document.querySelectorAll('.change')) {
      item.hidden = !matches(words, item.dataset.search);
      if (!item.hidden) count++;
    }
    for (const el of document.querySelectorAll('.chapter,.category'))
      el.hidden = !el.querySelector('.change[data-exhibits]:not([hidden])');
    $('matches').textContent = words.length ? count + ' matching changes' : '';
  };
  function paged(items, input, list, more, render, search, extra = () => true, status) {
    let limit = 24;
    const refresh = () => {
      const words = query($(input).value),
        filtered = items.filter((x) => extra(x) && matches(words, search(x)));
      const visible = filtered.slice(0, limit);
      $(list).replaceChildren(...visible.map(render));
      if (!visible.length) $(list).append(make('p', 'No matches.'));
      $(more).hidden = limit >= filtered.length;
      if (status) $(status).textContent = visible.length + ' of ' + filtered.length + ' exhibits';
    };
    const reset = () => {
      limit = 24;
      refresh();
    };
    $(input).addEventListener('input', reset);
    $(more).onclick = () => {
      limit += 48;
      refresh();
    };
    refresh();
    return reset;
  }
  const resetFigures = paged(
    exhibits,
    'figure-query',
    'figures',
    'more',
    (f) => {
      const a = exhibitLink(f.id, '');
      a.className = 'tile';
      const img = make('img');
      img.src = imagePath(f.right);
      img.alt = '';
      img.loading = 'lazy';
      const info = make('div');
      info.append(make('small', f.module + ' · ' + f.status), make('strong', f.name));
      a.append(img, info);
      return a;
    },
    (f) => [f.name, f.module, f.description, f.status, f.leftCaption, f.rightCaption].join(' '),
    (f) => $('figure-type').value === 'All exhibits' || f.status === $('figure-type').value,
    'figure-count'
  );
  $('figure-type').onchange = resetFigures;
  const detail = (name, meta) => {
    const row = make('details'),
      summary = make('summary');
    row.className = 'row';
    summary.append(make('strong', name), make('span', ' · ' + meta));
    row.append(summary);
    return row;
  };
  paged(
    data.api,
    'api-query',
    'api-list',
    'api-more',
    (item) => {
      const row = detail(item.name, item.change);
      for (const [label, value] of [
        ['5.0.0', item.before],
        ['Current', item.after],
      ])
        if (value) row.append(make('small', label), make('pre', value));
      return row;
    },
    (item) => [item.name, item.change, item.before, item.after].join(' ')
  );
  paged(
    data.commits,
    'commit-query',
    'commit-list',
    'commit-more',
    (c) => {
      const row = detail(c.subject, c.date + ' · ' + c.hash.slice(0, 8));
      row.append(
        make('p', c.body || (c.merge ? 'This merge includes ' : 'This commit touches ') + c.paths.length + ' paths.')
      );
      row.id = 'commit-' + c.hash;
      if (c.excerpt) row.append(make('small', c.excerpt.path), make('pre', c.excerpt.text));
      const refs = make('div');
      refs.className = 'refs';
      refs.append(repositoryLink('https://github.com/vexflow/vexflow/commit/' + c.hash, 'Full commit and diff'));
      row.append(refs);
      const paths = make('div');
      paths.className = 'paths';
      // Use the commit diff for deleted and renamed paths too.
      for (const path of c.paths) {
        paths.append(make('div', path));
      }
      row.append(paths);
      return row;
    },
    (c) => [c.hash, c.date, c.subject, c.body, ...c.paths].join(' ')
  );
  const menu = $('menu');
  if (matchMedia('(max-width:800px)').matches) menu.open = false;
  const nav = [...menu.querySelectorAll('a')];
  const observer = new IntersectionObserver(
    (entries) => {
      for (const e of entries)
        if (e.isIntersecting) for (const a of nav) a.classList.toggle('active', a.hash === '#' + e.target.id);
    },
    { rootMargin: '-10% 0px -68% 0px' }
  );
  for (const a of nav) {
    const el = $(a.hash.slice(1));
    if (el) observer.observe(el);
  }
  sync();
})();
