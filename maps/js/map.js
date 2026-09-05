(function (global) {
  var map;
  var hullLayer;
  var markerLayer;

  var HULL_STYLE = {
    color: '#c2410c',
    weight: 2,
    fillColor: '#ea580c',
    fillOpacity: 0.32,
    opacity: 0.9,
    lineJoin: 'round'
  };

  var LAND_STYLE = {
    color: '#c4b8a8',
    weight: 0.7,
    fillColor: '#efe8dc',
    fillOpacity: 1,
    interactive: false
  };

  function shiftFeatureCollection(fc, dx) {
    if (!dx) return fc;
    function shiftCoords(coords) {
      if (!coords.length) return coords;
      if (typeof coords[0] === 'number') return [coords[0] + dx, coords[1]];
      var out = [];
      for (var i = 0; i < coords.length; i++) out.push(shiftCoords(coords[i]));
      return out;
    }
    var features = [];
    for (var i = 0; i < fc.features.length; i++) {
      var g = fc.features[i].geometry;
      if (!g) continue;
      features.push({
        type: 'Feature',
        properties: {},
        geometry: { type: g.type, coordinates: shiftCoords(g.coordinates) }
      });
    }
    return { type: 'FeatureCollection', features: features };
  }

  var worldPolysCache = null;

  function flattenPolygons(fc) {
    var polys = [];
    if (!fc || !fc.features) return polys;
    for (var i = 0; i < fc.features.length; i++) {
      var g = fc.features[i].geometry;
      if (!g) continue;
      var groups = g.type === 'Polygon' ? [g.coordinates]
        : g.type === 'MultiPolygon' ? g.coordinates : [];
      for (var p = 0; p < groups.length; p++) {
        var rings = [];
        var minLat = 90, maxLat = -90, minLon = 180, maxLon = -180;
        for (var r = 0; r < groups[p].length; r++) {
          var ring = [];
          for (var k = 0; k < groups[p][r].length; k++) {
            var lon = groups[p][r][k][0];
            var lat = groups[p][r][k][1];
            ring.push([lat, lon]);
            if (r === 0) {
              if (lat < minLat) minLat = lat;
              if (lat > maxLat) maxLat = lat;
              if (lon < minLon) minLon = lon;
              if (lon > maxLon) maxLon = lon;
            }
          }
          rings.push(ring);
        }
        if (rings.length) polys.push({ rings: rings, minLat: minLat, maxLat: maxLat, minLon: minLon, maxLon: maxLon });
      }
    }
    return polys;
  }

  function init(elId) {
    map = L.map(elId, {
      worldCopyJump: true,
      zoomControl: true,
      minZoom: 1,
      maxZoom: 8,
      preferCanvas: true,
      attributionControl: true
    }).setView([20, 12], 2);

    map.attributionControl.setPrefix('');
    map.attributionControl.addAttribution(
      '<a href="https://www.naturalearthdata.com/" target="_blank" rel="noopener">Natural Earth</a>'
    );

    map.createPane('basemap');
    map.getPane('basemap').style.zIndex = 200;

    var world = global.WORLD;
    if (world) {
      var offsets = [-360, 0, 360];
      for (var i = 0; i < offsets.length; i++) {
        L.geoJSON(shiftFeatureCollection(world, offsets[i]), {
          style: LAND_STYLE,
          pane: 'basemap',
          interactive: false
        }).addTo(map);
      }
    }

    hullLayer = L.layerGroup().addTo(map);
    markerLayer = L.layerGroup().addTo(map);
    map.zoomControl.setPosition('topright');
  }

  function panelPadding() {
    var panel = document.getElementById('panel');
    var mobile = window.matchMedia('(max-width: 640px)').matches;
    if (mobile) {
      return { paddingTopLeft: [20, 20], paddingBottomRight: [20, (panel ? panel.offsetHeight : 220) + 12] };
    }
    return { paddingTopLeft: [(panel ? panel.offsetWidth : 360) + 24, 24], paddingBottomRight: [24, 24] };
  }

  function render(cities, opts) {
    opts = opts || {};
    hullLayer.clearLayers();
    markerLayer.clearLayers();

    var hull = Hull.compute(cities);
    var vertex = {};
    for (var i = 0; i < hull.vertexIds.length; i++) vertex[hull.vertexIds[i]] = true;

    for (var r = 0; r < hull.rings.length; r++) {
      L.polygon(hull.rings[r], HULL_STYLE).addTo(hullLayer);
    }

    var byId = {};
    for (var c = 0; c < cities.length; c++) byId[cities[c].id] = cities[c];
    var plot = (hull.points && hull.points.length) ? hull.points : cities;
    var wrapCopies = plot.some(function (p) { return p.lon > 180 || p.lon < -180; });
    for (var n = 0; n < plot.length; n++) {
      var pt = plot[n];
      var city = byId[pt.id] || pt;
      var isVertex = !!vertex[pt.id];
      var lons = wrapCopies ? [pt.lon - 360, pt.lon, pt.lon + 360] : [pt.lon];
      for (var w = 0; w < lons.length; w++) {
        L.circleMarker([pt.lat, lons[w]], {
          radius: isVertex ? 7 : 5,
          color: isVertex ? '#9a3412' : '#44403c',
          weight: isVertex ? 2 : 1,
          fillColor: isVertex ? '#ea580c' : '#1c1917',
          fillOpacity: 1
        }).bindTooltip(Cities.label(city), { direction: 'top' }).addTo(markerLayer);
      }
    }

    if (opts.fit !== false) fit(cities, hull, opts);
    return hull;
  }

  function fit(cities, hull, opts) {
    if (!cities.length) {
      map.setView([20, 12], 2);
      return;
    }
    var first = [cities[0].lat, cities[0].lon];
    var b = L.latLngBounds(first, first);
    if (hull && hull.vertices && hull.vertices.length) {
      for (var i = 0; i < hull.vertices.length; i++) {
        b.extend([hull.vertices[i].lat, hull.vertices[i].lon]);
      }
    } else {
      for (var k = 0; k < cities.length; k++) b.extend([cities[k].lat, cities[k].lon]);
    }
    if (!b.isValid()) return;
    map.fitBounds(b, Object.assign({ maxZoom: 6, animate: !(opts && opts.animate === false) }, panelPadding()));
  }

  function waitIdle() {
    return new Promise(function (resolve) {
      var finished = false;
      function finish() {
        if (finished) return;
        finished = true;
        resolve();
      }
      map.once('moveend', function () { setTimeout(finish, 80); });
      setTimeout(finish, 400);
    });
  }

  global.MapView = {
    init: init,
    render: render,
    fit: function (cities) { fit(cities, Hull.compute(cities), { animate: false }); },
    waitIdle: waitIdle,
    getMap: function () { return map; },
    getWorldPolygons: function () {
      if (!worldPolysCache) worldPolysCache = flattenPolygons(global.WORLD);
      return worldPolysCache;
    }
  };
})(window);
