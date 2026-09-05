(function (global) {
  var OCEAN = '#c5d0d6';
  var LAND_FILL = '#efe8dc';
  var LAND_STROKE = '#c4b8a8';

  function drawWorld(ctx, map, scale) {
    var polys = MapView.getWorldPolygons();
    var offsets = [-360, 0, 360];
    ctx.fillStyle = LAND_FILL;
    ctx.strokeStyle = LAND_STROKE;
    ctx.lineWidth = Math.max(0.6, 0.7 * scale);
    ctx.lineJoin = 'round';

    var view = map.getBounds();
    var west = view.getWest() - 5;
    var east = view.getEast() + 5;
    var south = view.getSouth() - 5;
    var north = view.getNorth() + 5;

    for (var o = 0; o < offsets.length; o++) {
      var dx = offsets[o];
      for (var p = 0; p < polys.length; p++) {
        var poly = polys[p];
        var rings = poly.rings;
        if (poly.maxLat < south || poly.minLat > north) continue;
        if (poly.maxLon + dx < west || poly.minLon + dx > east) continue;
        ctx.beginPath();
        for (var r = 0; r < rings.length; r++) {
          var ring = rings[r];
          for (var i = 0; i < ring.length; i++) {
            var pt = map.latLngToContainerPoint([ring[i][0], ring[i][1] + dx]);
            if (i === 0) ctx.moveTo(pt.x * scale, pt.y * scale);
            else ctx.lineTo(pt.x * scale, pt.y * scale);
          }
          ctx.closePath();
        }
        ctx.fill('evenodd');
        ctx.stroke();
      }
    }
  }

  function drawHull(ctx, map, hull, scale) {
    if (!hull || !hull.rings) return;
    ctx.fillStyle = 'rgba(234, 88, 12, 0.32)';
    ctx.strokeStyle = 'rgba(194, 65, 12, 0.9)';
    ctx.lineWidth = 2 * scale;
    ctx.lineJoin = 'round';
    for (var r = 0; r < hull.rings.length; r++) {
      var ring = hull.rings[r];
      if (ring.length < 3) continue;
      ctx.beginPath();
      for (var i = 0; i < ring.length; i++) {
        var p = map.latLngToContainerPoint(ring[i]);
        if (i === 0) ctx.moveTo(p.x * scale, p.y * scale);
        else ctx.lineTo(p.x * scale, p.y * scale);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }
  }

  function drawCities(ctx, map, cities, hull, scale) {
    var vertex = {};
    if (hull) {
      for (var i = 0; i < hull.vertexIds.length; i++) vertex[hull.vertexIds[i]] = true;
    }
    ctx.font = (11 * scale) + 'px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'bottom';
    var byId = {};
    for (var i = 0; i < cities.length; i++) byId[cities[i].id] = cities[i];
    var plot = (hull && hull.points && hull.points.length) ? hull.points : cities;
    var wrapCopies = plot.some(function (p) { return p.lon > 180 || p.lon < -180; });
    var size = map.getSize();
    for (var c = 0; c < plot.length; c++) {
      var pt = plot[c];
      var city = byId[pt.id] || pt;
      var isV = !!vertex[pt.id];
      var lons = wrapCopies ? [pt.lon - 360, pt.lon, pt.lon + 360] : [pt.lon];
      for (var w = 0; w < lons.length; w++) {
        var p = map.latLngToContainerPoint([pt.lat, lons[w]]);
        if (p.x < -20 || p.y < -20 || p.x > size.x + 20 || p.y > size.y + 20) continue;
        var x = p.x * scale;
        var y = p.y * scale;
        ctx.beginPath();
        ctx.arc(x, y, (isV ? 7 : 5) * scale, 0, Math.PI * 2);
        ctx.fillStyle = isV ? '#ea580c' : '#1c1917';
        ctx.fill();
        ctx.lineWidth = (isV ? 2 : 1) * scale;
        ctx.strokeStyle = isV ? '#9a3412' : '#44403c';
        ctx.stroke();
        if (isV) {
          ctx.fillStyle = '#1f1b16';
          ctx.fillText(city.name, x + 8 * scale, y - 8 * scale);
        }
      }
    }
  }

  function snapshot(scale) {
    var map = MapView.getMap();
    if (map.stop) map.stop();
    var cities = State.getCities();
    var hull = Hull.compute(cities);
    var size = map.getSize();
    var canvas = document.createElement('canvas');
    canvas.width = Math.round(size.x * scale);
    canvas.height = Math.round(size.y * scale);
    var ctx = canvas.getContext('2d');
    ctx.fillStyle = OCEAN;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawWorld(ctx, map, scale);
    drawHull(ctx, map, hull, scale);
    drawCities(ctx, map, cities, hull, scale);
    return Promise.resolve(canvas);
  }

  function downloadBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function canvasToBlob(canvas) {
    return new Promise(function (resolve, reject) {
      if (!canvas.toBlob) {
        try {
          var data = canvas.toDataURL('image/png');
          var bin = atob(data.split(',')[1]);
          var arr = new Uint8Array(bin.length);
          for (var i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
          resolve(new Blob([arr], { type: 'image/png' }));
        } catch (err) { reject(err); }
        return;
      }
      canvas.toBlob(function (blob) {
        if (blob) resolve(blob);
        else reject(new Error('Could not encode PNG'));
      }, 'image/png');
    });
  }

  function exportPng(scale, fitHull) {
    var cities = State.getCities();
    var ready = Promise.resolve();
    if (fitHull && cities.length) {
      MapView.fit(cities);
      ready = MapView.waitIdle();
    }
    return ready.then(function () {
      function attempt(tryScale) {
        return snapshot(tryScale).then(canvasToBlob).then(function (blob) {
          downloadBlob(blob, 'city-hull.png');
          return tryScale;
        }).catch(function (err) {
          if (tryScale === 4) return attempt(2);
          if (tryScale === 2) return attempt(1);
          throw err;
        });
      }
      return attempt(scale);
    });
  }

  global.Exporter = { exportPng: exportPng };
})(window);
