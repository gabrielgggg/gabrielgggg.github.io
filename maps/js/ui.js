(function (global) {
  var searchInput;
  var resultsEl;
  var listEl;
  var hintEl;
  var activeIndex = -1;
  var currentHits = [];

  function formatArea(km2) {
    if (!km2) return '—';
    if (km2 >= 1e6) return (km2 / 1e6).toFixed(2) + ' M km²';
    if (km2 >= 10000) return Math.round(km2).toLocaleString() + ' km²';
    return Math.round(km2) + ' km²';
  }

  function hideResults() {
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
    searchInput.setAttribute('aria-expanded', 'false');
    activeIndex = -1;
    currentHits = [];
  }

  function showResults(hits) {
    currentHits = hits;
    activeIndex = hits.length ? 0 : -1;
    resultsEl.innerHTML = '';
    if (!hits.length) {
      hideResults();
      return;
    }
    for (var i = 0; i < hits.length; i++) {
      var city = hits[i];
      var li = document.createElement('li');
      li.id = 'hit-' + i;
      li.setAttribute('role', 'option');
      li.setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
      li.dataset.id = String(city.id);
      li.innerHTML = '<span>' + escapeHtml(Cities.label(city)) + '</span><span class="meta">' +
        Number(city.pop).toLocaleString() + '</span>';
      li.addEventListener('mousedown', function (ev) {
        ev.preventDefault();
        State.add(Number(this.dataset.id));
        searchInput.value = '';
        hideResults();
        searchInput.focus();
      });
      resultsEl.appendChild(li);
    }
    resultsEl.hidden = false;
    searchInput.setAttribute('aria-expanded', 'true');
  }

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function moveActive(delta) {
    if (!currentHits.length) return;
    activeIndex = (activeIndex + delta + currentHits.length) % currentHits.length;
    var items = resultsEl.querySelectorAll('li');
    for (var i = 0; i < items.length; i++) {
      items[i].setAttribute('aria-selected', i === activeIndex ? 'true' : 'false');
    }
    items[activeIndex].scrollIntoView({ block: 'nearest' });
  }

  function pickActive() {
    if (activeIndex < 0 || !currentHits[activeIndex]) return;
    State.add(currentHits[activeIndex].id);
    searchInput.value = '';
    hideResults();
  }

  function onSearchInput() {
    var q = searchInput.value;
    if (!q.trim()) {
      hideResults();
      return;
    }
    showResults(Cities.search(q, { limit: 20, exclude: State.selectedSet() }));
  }

  function render(cities) {
    var hull = Hull.compute(cities);
    document.getElementById('stat-cities').textContent = String(cities.length);
    document.getElementById('stat-vertices').textContent = String(hull.vertexIds.length);
    document.getElementById('stat-area').textContent = cities.length >= 3 ? formatArea(hull.areaKm2) : '—';

    if (cities.length === 0) hintEl.textContent = 'Add at least three cities to draw a hull.';
    else if (cities.length < 3) hintEl.textContent = 'Need ' + (3 - cities.length) + ' more to close a polygon.';
    else hintEl.textContent = 'Interior cities sit inside the hull; vertices define the edge.';

    var vertex = {};
    for (var i = 0; i < hull.vertexIds.length; i++) vertex[hull.vertexIds[i]] = true;

    var sorted = cities.slice().sort(function (a, b) {
      return Cities.label(a).localeCompare(Cities.label(b));
    });
    listEl.innerHTML = '';
    for (var j = 0; j < sorted.length; j++) {
      var city = sorted[j];
      var li = document.createElement('li');
      if (vertex[city.id]) li.className = 'vertex';
      li.innerHTML = '<span>' + escapeHtml(Cities.label(city)) + '</span>';
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.setAttribute('aria-label', 'Remove ' + Cities.label(city));
      btn.textContent = '×';
      btn.addEventListener('click', function (id) {
        return function () { State.remove(id); };
      }(city.id));
      li.appendChild(btn);
      listEl.appendChild(li);
    }
  }

  function setStatus(msg, show) {
    var el = document.getElementById('export-status');
    el.hidden = !show;
    el.textContent = msg || '';
  }

  function init() {
    searchInput = document.getElementById('city-search');
    resultsEl = document.getElementById('city-results');
    listEl = document.getElementById('selected-list');
    hintEl = document.getElementById('hint');

    searchInput.addEventListener('input', onSearchInput);
    searchInput.addEventListener('keydown', function (ev) {
      if (ev.key === 'ArrowDown') { ev.preventDefault(); moveActive(1); }
      else if (ev.key === 'ArrowUp') { ev.preventDefault(); moveActive(-1); }
      else if (ev.key === 'Enter') { ev.preventDefault(); pickActive(); }
      else if (ev.key === 'Escape') { hideResults(); }
    });
    searchInput.addEventListener('blur', function () {
      setTimeout(hideResults, 150);
    });

    document.getElementById('btn-clear').addEventListener('click', function () {
      if (!State.getCities().length) return;
      if (window.confirm('Remove all cities?')) State.clear();
    });

    document.getElementById('btn-export').addEventListener('click', function () {
      var btn = document.getElementById('btn-export');
      var scale = Number(document.getElementById('export-scale').value) || 2;
      var fit = document.getElementById('export-fit').checked;
      btn.disabled = true;
      setStatus('Rendering PNG…', true);
      Exporter.exportPng(scale, fit).then(function (used) {
        setStatus(used < scale ? 'Exported at ' + used + '× (requested ' + scale + '× was too large).' : 'Saved city-hull.png', true);
      }).catch(function (err) {
        setStatus((err && err.message) || 'Export failed', true);
      }).then(function () {
        btn.disabled = false;
      });
    });
  }

  global.UI = { init: init, render: render };
})(window);
