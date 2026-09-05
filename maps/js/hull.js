(function (global) {
  function cross(o, a, b) {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  }

  function unwrap(points) {
    if (points.length === 0) return points;
    var lons = points.map(function (p) { return p.lon; }).sort(function (a, b) { return a - b; });
    var maxGap = -1;
    var start = lons[0];
    for (var i = 0; i < lons.length; i++) {
      var a = lons[i];
      var b = i === lons.length - 1 ? lons[0] + 360 : lons[i + 1];
      var gap = b - a;
      if (gap > maxGap) {
        maxGap = gap;
        start = i === lons.length - 1 ? lons[0] : lons[i + 1];
      }
    }
    return points.map(function (p) {
      return {
        id: p.id,
        lat: p.lat,
        lon: p.lon < start ? p.lon + 360 : p.lon
      };
    });
  }

  function monotoneChain(pts) {
    var p = pts.slice().sort(function (a, b) {
      return a.x - b.x || a.y - b.y;
    });
    if (p.length <= 1) return p;

    var lower = [];
    for (var i = 0; i < p.length; i++) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p[i]) <= 0) {
        lower.pop();
      }
      lower.push(p[i]);
    }
    var upper = [];
    for (var j = p.length - 1; j >= 0; j--) {
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p[j]) <= 0) {
        upper.pop();
      }
      upper.push(p[j]);
    }
    lower.pop();
    upper.pop();
    return lower.concat(upper);
  }

  function uniquePoints(points) {
    var seen = {};
    var out = [];
    for (var i = 0; i < points.length; i++) {
      var key = points[i].lat.toFixed(5) + ',' + points[i].lon.toFixed(5);
      if (seen[key]) continue;
      seen[key] = true;
      out.push(points[i]);
    }
    return out;
  }

  function sphericalAreaKm2(ringLatLon) {
    if (ringLatLon.length < 3) return 0;
    var R = 6371.0088;
    var pts = ringLatLon.slice();
    var first = pts[0];
    var last = pts[pts.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) pts.push(first);
    var area = 0;
    for (var i = 0; i < pts.length - 1; i++) {
      var lat1 = pts[i][0] * Math.PI / 180;
      var lon1 = pts[i][1] * Math.PI / 180;
      var lat2 = pts[i + 1][0] * Math.PI / 180;
      var lon2 = pts[i + 1][1] * Math.PI / 180;
      area += (lon2 - lon1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    return Math.abs(area) * R * R / 2;
  }

  function ringsFromVertices(vertices) {
    var ring = vertices.map(function (v) { return [v.lat, v.lon]; });
    var minLon = Infinity;
    var maxLon = -Infinity;
    for (var i = 0; i < vertices.length; i++) {
      if (vertices[i].lon < minLon) minLon = vertices[i].lon;
      if (vertices[i].lon > maxLon) maxLon = vertices[i].lon;
    }
    if (maxLon <= 180 && minLon >= -180) return [ring];
    return [
      ring,
      vertices.map(function (v) { return [v.lat, v.lon - 360]; }),
      vertices.map(function (v) { return [v.lat, v.lon + 360]; })
    ];
  }

  function compute(cities) {
    var empty = { rings: [], vertexIds: [], areaKm2: 0, vertices: [], points: [] };
    var points = uniquePoints(cities.map(function (c) {
      return { id: c.id, lat: c.lat, lon: c.lon };
    }));
    var unwrapped = unwrap(points).map(function (p) {
      return { id: p.id, lat: p.lat, lon: p.lon, x: p.lon, y: p.lat };
    });
    if (points.length < 3) {
      empty.points = unwrapped;
      return empty;
    }

    var hull = monotoneChain(unwrapped);
    if (hull.length < 3) {
      return { rings: [], vertexIds: [], areaKm2: 0, vertices: [], points: unwrapped };
    }

    return {
      rings: ringsFromVertices(hull),
      vertexIds: hull.map(function (h) { return h.id; }),
      areaKm2: sphericalAreaKm2(hull.map(function (h) { return [h.lat, h.lon]; })),
      vertices: hull,
      points: unwrapped
    };
  }

  global.Hull = { compute: compute };
})(window);
