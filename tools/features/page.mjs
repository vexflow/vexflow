// Render the catalog as readable HTML. Search, previews and the carousel enhance these links in the browser.
import { sections, highlights } from './catalog.mjs';
const esc = (v) =>
  String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const slug = (title) => title.toLowerCase().replaceAll(' ', '-');
const arrow = (direction) => (direction === 'prev' ? '←' : '→');

/** Keep the score, description and provenance link together on every feature card. */
function card(f, paths) {
  return `<article class="card" id="feature-${f.id}" data-id="${f.id}" data-keywords="${esc(f.keywords)}" data-availability="${esc(f.availability)}" data-full="./${paths[f.id + '.png']}">
  <a class="open" href="./${paths[f.id + '.png']}" aria-label="Enlarge ${esc(f.title)}"><div class="sample"><img src="./${paths[f.id + '-preview.png']}" loading="lazy" decoding="async" alt="${esc(f.title)} notation"></div>
  <h3>${esc(f.title)}</h3></a><p>${esc(f.description)}</p><a class="source" href="${esc(f.url)}">${esc(f.label)} ↗</a></article>`;
}

export function page(features, paths) {
  const first = features.find((f) => f.id === highlights[0]);
  const nav = sections
    .map(
      (s, i) =>
        `<a href="#${slug(s.title)}" data-category="${i}"><span>${esc(s.title)}</span><small>${s.entries.length}</small></a>`
    )
    .join('');
  const buttons = (prefix) =>
    ['prev', 'next']
      .map(
        (dir) =>
          `<button id="${prefix}-${dir}" type="button" aria-label="${dir === 'prev' ? 'Previous' : 'Next'} ${prefix === 'slide' ? 'highlight' : 'feature'}">${arrow(dir)}</button>`
      )
      .join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Features · VexFlow</title><meta name="description" content="Explore illustrated VexFlow notation features, from notes and chords to guitar tablature, orchestral scores and early music.">
  <link rel="canonical" href="https://vexflow.com/features/"><link rel="stylesheet" href="./${paths['features.css']}"><script src="./${paths['features.js']}" defer></script></head>
  <body><a href="#catalog" class="skip">Skip to features</a><header class="mast"><div><a class="wordmark" href="https://vexflow.com/">VexFlow</a><nav aria-label="VexFlow resources"><a href="https://vexflow.com/features/" aria-current="page">Features</a><a href="https://vexflow.com/guide/">User guide</a><a href="https://vexflow.com/tests/">Tests</a><a href="https://github.com/vexflow/vexflow">GitHub ↗</a></nav></div></header>
  <main><h1>Features</h1><p class="intro">Explore what you can engrave with VexFlow, from your first bar of music to a full conductor’s score.</p>
  <section class="hero" aria-label="Featured notation" aria-roledescription="carousel" data-highlights="${highlights.join(' ')}">
  <div class="hero-copy"><div class="feature-label"><span>Featured notation</span><span id="position">01 / 15</span></div>
  <div id="slide-text"><p id="slide-category">${esc(sections[first.category].title)}</p><h2 id="slide-title">${esc(first.title)}</h2><p id="slide-desc">${esc(first.description)}</p>
  <a id="hero-open" href="#feature-${first.id}">View full example <span aria-hidden="true">↗</span></a></div>
  <div class="controls">${buttons('slide')}<button id="rotate" type="button" aria-label="Pause slideshow">Pause</button></div></div>
  <a class="hero-image" href="#feature-${first.id}" aria-label="Enlarge featured score"><img id="slide-img" fetchpriority="high" src="./${paths[first.id + '-preview.png']}" alt="${esc(first.title)} notation excerpt"></a></section>
  <div class="catalog-head" id="catalog"><div><h2>Feature catalog</h2><span id="count" role="status">${features.length} features</span></div>
  <label class="search"><span aria-hidden="true">⌕</span><span class="sr">Search features</span><input type="search" id="query" placeholder="Search notes, instruments, techniques…" autocomplete="off"></label></div>
  <div class="layout"><aside><nav aria-label="Filter by category"><h2>Categories</h2><a href="#catalog" data-category="all" aria-current="true"><span>All features</span><small>${features.length}</small></a>${nav}</nav></aside>
  <label class="mobile-category">Category <select id="category-select"><option value="all">All features</option>${sections.map((s, i) => `<option value="${i}">${esc(s.title)}</option>`).join('')}</select></label>
  <div id="results">${sections
    .map(
      (s, i) =>
        `<section class="category" data-index="${i}" id="${slug(s.title)}"><h2>${esc(s.title)}</h2><p>${esc(s.description)}</p><div class="cards">${features
          .filter((f) => f.category === i)
          .map((f) => card(f, paths))
          .join('')}</div></section>`
    )
    .join('')}
  <div id="empty" hidden><h2>No matching features</h2><p>Try another term or browse all categories.</p><button type="button" id="reset">Clear filters</button></div></div></div></main>
  <footer><span>VexFlow</span><a href="https://vexflow.com/reports/whatsnew/">What's New? ↗</a></footer>
  <dialog id="viewer" aria-labelledby="view-title"><div class="viewer-top"><span id="view-category"></span><button id="close" aria-label="Close example">Close ×</button></div>
  <h2 id="view-title"></h2><p id="view-desc"></p><p id="availability" hidden></p><a class="plate" id="original" target="_blank" rel="noopener" aria-label="Open original screenshot at full resolution in a new tab"><img id="view-img" alt=""></a><div class="viewer-bottom"><a class="source" id="view-source"></a><div class="viewer-controls">${buttons('view')}<span id="view-count"></span></div></div></dialog>
  </body></html>`;
}
