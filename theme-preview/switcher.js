/* Theme preview switcher. Preview pages only. */
(function () {
  "use strict";
  var KEY = "gm-theme-preview";
  var FONTS = [
    ["source-sans-3", "Source Sans 3"],
    ["ibm-plex-sans", "IBM Plex Sans"],
    ["inter", "Inter"],
    ["public-sans", "Public Sans"],
    ["system", "System default"]
  ];
  var PALETTES = [
    ["scarlet", "Scarlet"],
    ["gray", "Gray with scarlet accents"],
    ["teal", "Scarlet with teal accents"]
  ];
  var DEFAULTS = { font: "source-sans-3", palette: "scarlet", open: true };

  function valid(list, v) {
    for (var i = 0; i < list.length; i++) if (list[i][0] === v) return true;
    return false;
  }
  function load() {
    var s = {};
    try { s = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { s = {}; }
    return {
      font: valid(FONTS, s.font) ? s.font : DEFAULTS.font,
      palette: valid(PALETTES, s.palette) ? s.palette : DEFAULTS.palette,
      open: typeof s.open === "boolean" ? s.open : (window.innerWidth >= 576)
    };
  }
  function save(s) {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  function apply(s) {
    var root = document.documentElement;
    root.setAttribute("data-font", s.font);
    root.setAttribute("data-palette", s.palette);
  }

  var state = load();
  apply(state);

  function select(id, text, list, value, onChange) {
    var label = document.createElement("label");
    label.setAttribute("for", id);
    label.appendChild(document.createTextNode(text));
    var sel = document.createElement("select");
    sel.id = id;
    for (var i = 0; i < list.length; i++) {
      var o = document.createElement("option");
      o.value = list[i][0];
      o.textContent = list[i][1];
      if (list[i][0] === value) o.selected = true;
      sel.appendChild(o);
    }
    sel.addEventListener("change", function () { onChange(sel.value); });
    label.appendChild(sel);
    return label;
  }

  function build() {
    var wrap = document.createElement("div");
    wrap.className = "gm-switcher";
    wrap.setAttribute("role", "region");
    wrap.setAttribute("aria-label", "Theme options");

    var panel = document.createElement("div");
    panel.className = "gm-switcher-panel";
    panel.id = "gm-switcher-panel";
    panel.hidden = !state.open;

    var fontSel = select("gm-switcher-font", "Font", FONTS, state.font, function (v) {
      state.font = v; apply(state); save(state);
    });
    var palSel = select("gm-switcher-palette", "Colors", PALETTES, state.palette, function (v) {
      state.palette = v; apply(state); save(state);
    });
    var reset = document.createElement("button");
    reset.type = "button";
    reset.className = "gm-switcher-reset";
    reset.textContent = "Reset";
    reset.addEventListener("click", function () {
      state.font = DEFAULTS.font; state.palette = DEFAULTS.palette;
      fontSel.querySelector("select").value = state.font;
      palSel.querySelector("select").value = state.palette;
      apply(state); save(state);
    });
    panel.appendChild(fontSel);
    panel.appendChild(palSel);
    panel.appendChild(reset);

    var toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "gm-switcher-toggle";
    toggle.setAttribute("aria-controls", panel.id);
    toggle.setAttribute("aria-expanded", String(state.open));
    toggle.textContent = "Theme";
    toggle.addEventListener("click", function () {
      state.open = panel.hidden;
      panel.hidden = !state.open;
      toggle.setAttribute("aria-expanded", String(state.open));
      save(state);
    });

    wrap.appendChild(panel);
    wrap.appendChild(toggle);
    document.body.appendChild(wrap);
  }

  window.addEventListener("storage", function (e) {
    if (e.key !== KEY) return;
    state = load(); apply(state);
    var f = document.getElementById("gm-switcher-font");
    var p = document.getElementById("gm-switcher-palette");
    if (f) f.value = state.font;
    if (p) p.value = state.palette;
  });

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", build);
  else build();
})();
