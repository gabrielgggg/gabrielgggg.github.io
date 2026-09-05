(function () {
  MapView.init('map');
  State.init();
  UI.init();

  function refresh(cities) {
    MapView.render(cities);
    UI.render(cities);
  }

  State.onChange(refresh);
  refresh(State.getCities());
})();
