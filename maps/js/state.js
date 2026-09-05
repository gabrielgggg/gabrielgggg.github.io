(function (global) {
  var KEY = 'cityhull.ids';
  var ids = [];
  var listeners = [];

  function validId(id) {
    return !!Cities.byId(id);
  }

  function persist() {
    try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch (err) { /* ignore quota */ }
    var next = location.pathname + location.search + (ids.length ? '#c=' + ids.join(',') : '');
    if (location.pathname + location.search + location.hash !== next) {
      try { history.replaceState(null, '', next); } catch (err) { /* file:// */ }
    }
  }

  function notify() {
    persist();
    var cities = getCities();
    for (var i = 0; i < listeners.length; i++) listeners[i](cities);
  }

  function load() {
    ids = [];
    var match = /(?:^|#|&)c=([\d,]+)/.exec(location.hash);
    var raw = null;
    if (match) {
      raw = match[1].split(',').map(Number);
    } else {
      try { raw = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (err) { raw = []; }
    }
    var seen = {};
    for (var i = 0; i < (raw || []).length; i++) {
      var id = raw[i];
      if (!validId(id) || seen[id]) continue;
      seen[id] = true;
      ids.push(id);
    }
  }

  function getCities() {
    var out = [];
    for (var i = 0; i < ids.length; i++) {
      var city = Cities.byId(ids[i]);
      if (city) out.push(city);
    }
    return out;
  }

  function add(id) {
    id = Number(id);
    if (!validId(id) || ids.indexOf(id) !== -1) return false;
    ids.push(id);
    notify();
    return true;
  }

  function remove(id) {
    id = Number(id);
    var next = ids.filter(function (x) { return x !== id; });
    if (next.length === ids.length) return false;
    ids = next;
    notify();
    return true;
  }

  function clear() {
    if (!ids.length) return;
    ids = [];
    notify();
  }

  function selectedSet() {
    var o = {};
    for (var i = 0; i < ids.length; i++) o[ids[i]] = true;
    return o;
  }

  global.State = {
    init: load,
    getCities: getCities,
    add: add,
    remove: remove,
    clear: clear,
    selectedSet: selectedSet,
    onChange: function (fn) { listeners.push(fn); }
  };
})(window);
