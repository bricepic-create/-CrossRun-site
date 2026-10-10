/* CrossRun: illustrative paths on a genuine OpenStreetMap base.
   These are demonstration coordinates, not recorded user activities. */
(function () {
  const target = document.getElementById('crossrun-map');
  if (!target || typeof L === 'undefined') return;
  const map = L.map(target, { zoomControl: false, scrollWheelZoom: false, dragging: false, touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: true });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>'
  }).addTo(map);
  // Shared promenade segment, approximately 1 km along the Cannes waterfront.
  const common = [[43.5507,7.0174],[43.5500,7.0194],[43.5490,7.0215],[43.5482,7.0233],[43.5471,7.0254],[43.5460,7.0275]];
  const blueApproach = [[43.5544,7.0128],[43.5530,7.0144],[43.5518,7.0160],common[0]];
  const coralApproach = [[43.5481,7.0122],[43.5488,7.0141],[43.5499,7.0158],common[0]];
  const blueExit = [[43.5450,7.0290],[43.5438,7.0306]];
  const coralExit = [[43.5464,7.0291],[43.5470,7.0311]];
  const blue = '#1769FF', coral = '#F07864';
  function line(points, color, width, dash) {
    return L.polyline(points, { color, weight: width, opacity: 1, dashArray: dash || null, lineCap: 'round', lineJoin: 'round', interactive: false }).addTo(map);
  }
  line([...blueApproach,...common,...blueExit], blue, 6);
  line([...coralApproach,...common,...coralExit], coral, 4, '9 10');
  line(common, '#16A085', 8);
  const pin = (point, color, label) => L.circleMarker(point, { radius: 8, weight: 3, color: '#fff', fillColor: color, fillOpacity: 1 }).addTo(map).bindTooltip(label, { direction: 'top' });
  pin(blueApproach[0], blue, 'Runner 1');
  pin(coralApproach[0], coral, 'Runner 2');
  pin(common[0], '#16A085', 'Début du parcours commun');
  pin(common[common.length - 1], '#16A085', 'Fin du parcours commun');
  const all = [...blueApproach,...coralApproach,...common,...blueExit,...coralExit];
  map.fitBounds(L.latLngBounds(all), { padding: [25,25], maxZoom: 14 });
  window.addEventListener('resize', () => map.invalidateSize());
})();
