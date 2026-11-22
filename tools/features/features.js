// Enhance the static score catalog with shareable filters, a rotating selection and a full-size viewer.
(() => {
  const $ = (id) => document.getElementById(id);
  const cards = [...document.querySelectorAll('.card')];
  const categories = [...document.querySelectorAll('.category')];
  const byId = new Map(cards.map((card) => [card.dataset.id, card]));
  const title = (card) => card.querySelector('h3').textContent;
  const description = (card) => card.querySelector('p').textContent;
  const categoryName = (card) => card.closest('.category').querySelector('h2').textContent;
  const normalize = (text) =>
    text
      .normalize('NFKD')
      .replace(/\p{Mark}/gu, '')
      .toLowerCase()
      .replace(/[-’']/g, ' ');
  const searchable = new Map(
    cards.map((card) => [card, normalize([title(card), description(card), card.dataset.keywords].join(' '))])
  );
  const hero = document.querySelector('.hero');
  const slides = hero.dataset.highlights.split(' ');
  const viewer = $('viewer');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  let rotating = !motion.matches,
    explicitlyPlaying = false,
    onScreen = true,
    slide = 0,
    timer,
    opener,
    sequence = [],
    position = 0;

  /** Keep one timeout and respect readers who are interacting with or have left the carousel. */
  function schedule() {
    clearTimeout(timer);
    $('rotate').textContent = rotating ? 'Pause' : 'Play';
    $('rotate').setAttribute('aria-label', rotating ? 'Pause slideshow' : 'Play slideshow');
    if (
      rotating &&
      onScreen &&
      !document.hidden &&
      !viewer.open &&
      (explicitlyPlaying || !hero.matches(':hover, :focus-within'))
    ) {
      timer = setTimeout(() => showSlide(slide + 1), 8000);
    }
  }
  function showSlide(index) {
    slide = (index + slides.length) % slides.length;
    const card = byId.get(slides[slide]);
    $('position').textContent = String(slide + 1).padStart(2, '0') + ' / ' + slides.length;
    $('slide-title').textContent = title(card);
    $('slide-category').textContent = categoryName(card);
    $('slide-desc').textContent = description(card);
    $('slide-img').src = card.querySelector('img').src;
    $('slide-img').alt = title(card) + ' notation excerpt';
    for (const a of hero.querySelectorAll('a')) a.href = '#' + card.id;
    schedule();
  }
  function manualSlide(step) {
    rotating = false;
    showSlide(slide + step);
  }
  $('slide-prev').onclick = () => manualSlide(-1);
  $('slide-next').onclick = () => manualSlide(1);
  $('rotate').onclick = () => {
    rotating = !rotating;
    explicitlyPlaying = rotating;
    schedule();
  };
  hero.onmouseenter = hero.onfocusin = () => {
    explicitlyPlaying = false;
    schedule();
  };
  hero.onmouseleave = schedule;
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    schedule();
  }).observe(hero);
  hero.onfocusout = () => setTimeout(schedule, 0);
  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', () => {
    rotating = !motion.matches;
    schedule();
  });

  /** The category and text query combine. Keep their state when opening or sharing an example. */
  function filter(category, text, updateURL = true) {
    const words = normalize(text.trim()).split(/\s+/).filter(Boolean);
    let count = 0;
    for (const group of categories) {
      let matches = 0;
      for (const card of group.querySelectorAll('.card')) {
        card.hidden =
          !(category === 'all' || group.dataset.index === category) ||
          !words.every((w) => searchable.get(card).includes(w));
        if (!card.hidden) matches++;
      }
      group.hidden = matches === 0;
      count += matches;
    }
    $('category-select').value = category;
    for (const a of document.querySelectorAll('[data-category]')) {
      if (a.dataset.category === category) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    }
    $('count').textContent = count + (count === 1 ? ' feature' : ' features');
    $('empty').hidden = count !== 0;
    if (updateURL) {
      const url = new URL(location.href);
      if (category === 'all') url.searchParams.delete('category');
      else url.searchParams.set('category', categories[Number(category)].id);
      if (text.trim()) url.searchParams.set('q', text.trim());
      else url.searchParams.delete('q');
      if (location.protocol !== 'file:') history.replaceState(null, '', url);
    }
  }
  $('query').oninput = () => filter($('category-select').value, $('query').value);
  function select(category) {
    filter(category, $('query').value);
    $('catalog').scrollIntoView({ block: 'start' });
  }
  for (const a of document.querySelectorAll('[data-category]'))
    a.onclick = (event) => {
      if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      select(a.dataset.category);
    };
  $('category-select').onchange = () => select($('category-select').value);
  $('reset').onclick = () => {
    $('query').value = '';
    filter('all', '');
    $('query').focus();
  };

  /** A single history entry represents the open viewer, however many examples the reader visits. */
  function display(id) {
    const card = byId.get(id);
    if (!card) return;
    if (!sequence.includes(id)) sequence = cards.map((c) => c.dataset.id);
    position = sequence.indexOf(id);
    $('view-title').textContent = title(card);
    $('view-category').textContent = categoryName(card);
    $('view-desc').textContent = description(card);
    $('view-img').src = card.dataset.full;
    $('original').href = card.dataset.full;
    $('availability').textContent = card.dataset.availability;
    $('availability').hidden = !card.dataset.availability;
    $('view-img').alt = title(card) + ' — ' + description(card);
    const source = card.querySelector('.source');
    $('view-source').href = source.href;
    $('view-source').textContent = source.textContent;
    $('view-count').textContent = position + 1 + ' / ' + sequence.length;
    $('view-prev').disabled = position === 0;
    $('view-next').disabled = position === sequence.length - 1;
    if (!viewer.open) viewer.showModal();
    viewer.scrollTop = 0;
    schedule();
  }
  function syncLocation() {
    const url = new URL(location.href);
    const category = categories.find((c) => c.id === url.searchParams.get('category'));
    $('query').value = url.searchParams.get('q') || '';
    filter(category?.dataset.index || 'all', $('query').value, false);
    const id = url.hash.replace(/^#feature-/, '');
    if (byId.has(id)) {
      sequence = history.state?.fromHero ? slides : cards.filter((c) => !c.hidden).map((c) => c.dataset.id);
      display(id);
    } else if (viewer.open) {
      viewer.close();
      opener?.focus({ preventScroll: true });
      schedule();
    }
  }
  function open(event, id, fromHero) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    opener = event.currentTarget;
    sequence = fromHero ? slides : cards.filter((c) => !c.hidden).map((c) => c.dataset.id);
    history.pushState({ featureViewer: true, fromHero }, '', '#feature-' + id);
    display(id);
  }
  for (const card of cards) card.querySelector('.open').onclick = (e) => open(e, card.dataset.id, false);
  for (const a of hero.querySelectorAll('a')) a.onclick = (e) => open(e, slides[slide], true);
  function step(direction) {
    const id = sequence[position + direction];
    if (id) {
      history.replaceState(history.state, '', '#feature-' + id);
      display(id);
    }
  }
  $('view-prev').onclick = () => step(-1);
  $('view-next').onclick = () => step(1);
  function close() {
    if (history.state?.featureViewer) history.back();
    else {
      const url = new URL(location.href);
      url.hash = '';
      history.replaceState(null, '', url);
      viewer.close();
      const anchor = byId.get(sequence[position])?.querySelector('.open');
      (anchor?.closest('.card').hidden ? $('query') : anchor)?.focus();
      schedule();
    }
  }
  $('close').onclick = close;
  viewer.oncancel = (e) => {
    e.preventDefault();
    close();
  };
  viewer.onkeydown = (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
      e.preventDefault();
      step(e.key === 'ArrowLeft' ? -1 : 1);
    }
  };
  window.addEventListener('hashchange', syncLocation);
  syncLocation();
  schedule();
})();
