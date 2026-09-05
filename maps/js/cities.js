(function (global) {
  var list = global.CITIES || [];
  var byIdMap = Object.create(null);
  for (var i = 0; i < list.length; i++) {
    byIdMap[list[i].id] = list[i];
  }

  function countryName(city) {
    return (global.COUNTRIES && global.COUNTRIES[city.country]) || city.country;
  }

  function label(city) {
    return city.name + ', ' + countryName(city);
  }

  function matches(city, q) {
    var name = city.name.toLowerCase();
    var ascii = (city.ascii || '').toLowerCase();
    var country = countryName(city).toLowerCase();
    var hay = name + ', ' + country;
    if (name.indexOf(q) === 0 || ascii.indexOf(q) === 0) return 0;
    if (name.indexOf(q) !== -1 || ascii.indexOf(q) !== -1) return 1;
    if (hay.indexOf(q) !== -1 || (city.country && city.country.toLowerCase().indexOf(q) === 0)) return 2;
    return -1;
  }

  function search(query, opts) {
    opts = opts || {};
    var q = String(query || '').trim().toLowerCase();
    if (!q) return [];
    var limit = opts.limit || 20;
    var exclude = opts.exclude || {};
    var prefixOnly = q.length === 1;
    var scored = [];
    for (var i = 0; i < list.length; i++) {
      var city = list[i];
      if (exclude[city.id]) continue;
      var score = matches(city, q);
      if (score < 0) continue;
      if (prefixOnly && score !== 0) continue;
      scored.push({ city: city, score: score });
    }
    scored.sort(function (a, b) {
      return a.score - b.score || b.city.pop - a.city.pop || a.city.name.localeCompare(b.city.name);
    });
    var out = [];
    for (var j = 0; j < scored.length && out.length < limit; j++) out.push(scored[j].city);
    return out;
  }

  function byId(id) {
    return byIdMap[id] || byIdMap[Number(id)] || null;
  }

  global.Cities = {
    list: list,
    byId: byId,
    search: search,
    label: label,
    countryName: countryName
  };
})(window);
