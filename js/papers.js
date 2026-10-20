/* Publications: filter chips and live citation counts from OpenAlex.
   Counts written in index.html are the fallback; badges with zero
   citations stay hidden. */
(function () {
  'use strict';

  function onReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  function initFilter(papers) {
    var chips = Array.prototype.slice.call(document.querySelectorAll('.paper-chip'));
    chips.forEach(function (chip) {
      var kind = chip.getAttribute('data-filter');
      var count = chip.querySelector('span');
      if (count) {
        count.textContent = kind === 'all' ? papers.length : papers.filter(function (p) {
          return p.getAttribute('data-kind') === kind;
        }).length;
      }
      chip.addEventListener('click', function () {
        chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c === chip)); });
        papers.forEach(function (p) {
          p.hidden = !(kind === 'all' || p.getAttribute('data-kind') === kind);
        });
      });
    });
  }

  function showCount(badge, n) {
    badge.setAttribute('data-cites', String(n));
    badge.textContent = 'Cited by ' + n;
    badge.hidden = n < 1;
  }

  function initCitations(grid) {
    var badges = Array.prototype.slice.call(grid.querySelectorAll('.p-cite[data-doi]'));
    if (!badges.length || !window.fetch) return;
    var dois = badges.map(function (b) { return b.getAttribute('data-doi').toLowerCase(); });
    var url = 'https://api.openalex.org/works?per-page=50&select=doi,cited_by_count&filter=doi:' + dois.join('|');
    fetch(url)
      .then(function (res) { return res.ok ? res.json() : null; })
      .then(function (data) {
        if (!data || !data.results) return;
        var byDoi = {};
        data.results.forEach(function (w) {
          if (w.doi) byDoi[w.doi.toLowerCase().replace('https://doi.org/', '')] = w.cited_by_count;
        });
        badges.forEach(function (b) {
          var n = byDoi[b.getAttribute('data-doi').toLowerCase()];
          if (typeof n === 'number') showCount(b, n);
        });
      })
      .catch(function () {});
  }

  onReady(function () {
    var grid = document.querySelector('.paper-grid');
    if (!grid) return;
    var papers = Array.prototype.slice.call(grid.querySelectorAll('.paper'));
    initFilter(papers);
    initCitations(grid);
  });
})();
