// Render an offline-first report. Every source link and image has the same meaning when the folder moves.
import { repo } from './history.mjs';
const esc = (v) =>
  String(v ?? '').replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]
  );
const slug = (t) =>
  t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-$/, '');
const anchor = (url, title) => '<a href="' + esc(url) + '">' + esc(title) + '</a>';
const src = (head, path) => repo + (/^(commit|issues)\//.test(path) ? '/' : '/blob/' + head + '/') + path;
const groups = (a, key) => [...new Set(a.map((x) => x[key]))];
const button = (id, text) =>
  '<a class="open-score" href="#plate-' + esc(id) + '" data-plate="' + esc(id) + '">' + esc(text) + '</a>';

/** Offer a direct preview for each feature family, then link the individually named exhibits. */
function chapters(d, section) {
  return d.topics
    .filter((t) => t[0] === section)
    .map(([category, group, items]) => {
      const id = slug(group);
      const exhibit = d.figures.find((f) => f.id === items.find((x) => x[3])?.[3]);
      return (
        '<article class="chapter" id="' +
        id +
        '"><h3>' +
        esc(group) +
        '</h3>' +
        (exhibit
          ? '<a class="sample open-score" href="#plate-' +
            exhibit.id +
            '" data-plate="' +
            exhibit.id +
            '"><img loading="lazy" src="' +
            exhibit.right +
            '" alt="' +
            esc(exhibit.name) +
            '"><span>' +
            esc(exhibit.name) +
            ' <b>↗</b></span></a>'
          : '') +
        '<div>' +
        items
          .map(
            ([title, body, path, figure]) =>
              '<div class="change" data-search="' +
              esc([category, group, title, body].join(' ')) +
              '"><h4>' +
              esc(title) +
              '</h4><p>' +
              esc(body) +
              '</p><div class="refs">' +
              anchor(
                src(d.head, path),
                path.startsWith('issues/')
                  ? 'Issue #' + path.split('/')[1]
                  : path.startsWith('commit/')
                    ? 'Commit ' + path.split('/')[1]
                    : path.split('/').at(-1)
              ) +
              (figure ? button(figure, 'View exhibit') : '') +
              '</div></div>'
          )
          .join('') +
        '</div></article>'
      );
    })
    .join('');
}

export function renderReport(d) {
  const sections = groups(d.topics, 0),
    count = d.topics.reduce((n, row) => n + row[2].length, 0);
  const nav = [...sections, 'Visual index', 'API inventory', 'Documentation', 'Commit history', 'Method'];
  const lead = d.figures.find((f) => f.id === 'm3-choir');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="An illustrated, searchable account of VexFlow changes since 5.0.0."><title>VexFlow · Changes since 5.0.0</title><link rel="stylesheet" href="assets/report.css"><script src="assets/app.js" defer></script></head><body>
<a class="skip" href="#main">Skip to report</a><header class="mast"><a href="#main" class="wordmark">VexFlow</a><span>Engineering reports</span><a class="download" href="changes.json" download>Download data ↓</a></header>
<div class="shell"><aside><nav aria-label="Report sections"><details id="menu" open><summary>Contents</summary>${nav.map((t) => anchor('#' + slug(t), t.replace(' and accessibility', ' & accessibility'))).join('')}</details></nav></aside>
<main id="main"><div class="hero"><div class="dateline">Change report <span> / </span> ${esc(d.date)}</div><h1>VexFlow since<br><i>5.0.0</i></h1><p>From a note on a stave to a score you can reflow, read by keyboard and prepare for print.</p><div class="range">${anchor(repo + '/releases/tag/5.0.0', '5.0.0')} <span>→</span> ${anchor(repo + '/commit/' + d.head, d.head.slice(0, 8))}</div></div>
<a class="cover open-score" data-plate="${lead.id}" href="#plate-${lead.id}"><img src="${lead.right}" alt="A two-verse vocal score with syllable connectors"><span>Two verses over a skipped attack <b>Explore the score ↗</b></span></a>
<div class="stats">${[
    [d.commits.length, 'commits'],
    [count, 'change summaries'],
    [d.figures.length, 'visual exhibits'],
    [d.api.length, 'declaration changes'],
  ]
    .map(([n, label]) => '<div><strong>' + n + '</strong><span>' + label + '</span></div>')
    .join('')}</div>
<section class="release"><h2>Release trail</h2><p>The range includes the tagged releases below and subsequent changes on main. The commit history gives the exact endpoint for each change.</p><div class="tags">${d.releases.map((r) => '<a href="' + repo + '/releases/tag/' + r.tag + '"><strong>' + r.tag + '</strong><small>' + r.date + '</small></a>').join('')}</div></section>
<label class="search">Find a change <input id="search" type="search" placeholder="Search features, fixes, tools…" autocomplete="off"></label><p id="matches" role="status"></p>
${sections.map((section) => '<section class="category" id="' + slug(section) + '"><h2>' + esc(section) + '</h2>' + chapters(d, section) + '</section>').join('')}
<section id="visual-index"><h2>Visual index</h2><p>Open an exhibit at full size. Paired images identify both versions. Each new example has its own current rendering.</p><div class="filters"><label>Find an exhibit<input id="figure-query" type="search" placeholder="Title or notation family"></label><label>Evidence<select id="figure-type"><option>All exhibits</option>${groups(
    d.figures,
    'status'
  )
    .map((s) => '<option>' + esc(s) + '</option>')
    .join('')}</select></label></div>
<p id="figure-count" role="status"></p><div class="tiles" id="figures"></div><button class="more" id="more" type="button">Show more exhibits</button></section>
<section id="api-inventory"><h2>API inventory</h2><p>Public TypeScript declarations compared by exported name and member. Expand a row for the exact signatures. An added overload or a spelling change can appear here alongside a behavioral change.</p><label class="search">Find a declaration<input type="search" id="api-query" placeholder="Class, member or signature"></label><div id="api-list"></div><button class="more" id="api-more">Show more declarations</button></section>
<section id="documentation"><h2>Documentation</h2><p>Open a guide from the revision that contains it. The inventory includes added, modified, moved and removed Markdown files between the two endpoints.</p><details><summary>${d.docs.length} documentation files</summary><ul class="doclist">${d.docs.map((r) => '<li><code>' + esc(r.status) + '</code>' + anchor(repo + '/blob/' + (r.status === 'D' ? d.before : d.head) + '/' + (r.newPath || r.path), r.newPath ? r.path + ' → ' + r.newPath : r.path) + '</li>').join('')}</ul></details></section>
<section id="commit-history"><h2>Commit history</h2><p>Every commit reachable from the endpoint after the 5.0.0 tag, including merges, release preparation, dependency updates and follow-up corrections. Expand for the author’s description and changed paths.</p><label class="search">Find a commit<input type="search" id="commit-query" placeholder="Subject, SHA, date or file"></label><div id="commit-list"></div><button class="more" id="commit-more">Show more commits</button></section>
<section id="method"><h2>Method and limits</h2><p>The release images come from the browser bundle stored in the 5.0.0 Git tag. The current bundle was built from <a href="${repo}/commit/${d.head}">${d.head.slice(0, 12)}</a>. Both ran in Chromium ${esc(d.version)} on a white background at device scale 1. The native suites produced ${d.stats.old} and ${d.stats.current} score captures respectively. The current examples include ${d.stats.examples} guide, Explorer and supplementary studies.</p>
<p>Native comparisons match module, test name and font at both revisions. Test source can also evolve. Shared roadmap studies use the same authored score and the release’s native soft-voice equivalent where needed. When the 5.0.0 input is unavailable, a changed intermediate roadmap control is explicitly labeled 5.2.0. A current-only image means the old test or drawing was unavailable. Some studies exercise familiar notation through a new API. Original issue evidence has separate before-fix and after-fix labels. Reference controls that render identically are identified in the index.</p>
<p>The declaration inventory includes exported types and public members, excludes private and protected members, and compares emitted TypeScript. Compiler changes can affect a printed declaration. The complete Git comparison also covers internal implementations, configuration, generated files and assets. The proposed VF6 requirements and future specialist work are documented in their own section.</p>
<div class="refs">${anchor(repo + '/compare/5.0.0...' + d.head, 'Full source comparison')}${anchor('render-inventory.json', 'Complete render inventory')}${anchor('changes.json', 'Report data')}${anchor('assets/font-license.txt', 'Typeface license')}</div></section>
</main></div>
<dialog id="lightbox" aria-labelledby="figure-title"><header><div><small id="figure-group"></small><h2 id="figure-title"></h2></div><button id="close" aria-label="Close exhibit">Close ×</button></header><p id="figure-desc"></p><div id="plates"></div><div id="plate-source"></div></dialog>
<script type="application/json" id="report-data">${JSON.stringify({ figures: d.figures, api: d.api, commits: d.commits, repo }).replaceAll('<', '\\u003c')}</script></body></html>`;
}
