/* CrossRun illustration on a real OpenStreetMap basemap.
   Two distinct routes join at the east end of the Croisette, run west
   along one shared segment, then split: Alex continues; Julie loops home.
   Demo only: coordinates are illustrative, not actual GPS recordings. */
(function () {
  const el = document.getElementById('crossrun-map');
  if (!el || typeof L === 'undefined') return;
  const map = L.map(el, {
    zoomControl: false, scrollWheelZoom: false, dragging: false,
    touchZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false
  });
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}{r}.png', {
    maxZoom: 19,
    subdomains: 'abcd',
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
  }).addTo(map);

  const blue = '#1769FF', coral = '#F07864', together = '#138E60';
  // Shared direction: EAST -> WEST. Exactly the same coordinates for both runners.
  const shared = [
    [43.5460,7.0275], [43.5466,7.0263], [43.5471,7.0254],
    [43.5477,7.0243], [43.5482,7.0233], [43.5487,7.0224],
    [43.5490,7.0215], [43.5495,7.0205], [43.5500,7.0194],
    [43.5504,7.0184], [43.5507,7.0174]
  ];
  // Alex: starts in eastern Cannes, follows a northern route to the sea,
  // shares the seafront heading west, then carries on into the western hills.
  const alexStart = [43.5545,7.0324];
  const alexBefore = [alexStart,[43.5528,7.0316],[43.5514,7.0301],[43.5495,7.0295],[43.5478,7.0284],shared[0]];
  const alexAfter = [shared[shared.length-1],[43.5514,7.0162],[43.5525,7.0147],[43.5541,7.0133],[43.5560,7.0122]];
  // Julie: starts further east via another approach; after the common
  // kilometre she makes a northern loop and returns to her own start.
  const julieHome = [43.5525,7.0353];
  const julieBefore = [julieHome,[43.5514,7.0340],[43.5497,7.0326],[43.5482,7.0311],[43.5470,7.0294],shared[0]];
  const julieAfter = [shared[shared.length-1],[43.5518,7.0183],[43.5533,7.0204],[43.5544,7.0230],[43.5550,7.0263],[43.5552,7.0299],[43.5544,7.0328],julieHome];

  const draw = (points,color,width) => L.polyline(points,{
    color,weight:width,opacity:1,lineCap:'round',lineJoin:'round',interactive:false
  }).addTo(map);
  draw(alexBefore,blue,6);
  draw(alexAfter,blue,6);
  draw(julieBefore,coral,6);
  draw(julieAfter,coral,6);
  // One single green line is the common 1 km stretch, not a crossing point.
  draw(shared,'#FFFFFF',11);
  draw(shared,together,7);

  const marker = (point,color,title) => L.circleMarker(point,{
    radius:7,color:'#FFFFFF',weight:3,fillColor:color,fillOpacity:1
  }).addTo(map).bindTooltip(title,{direction:'top'});
  marker(alexStart,blue,'Départ Alex');
  marker(julieHome,coral,'Départ et arrivée Julie');
  marker(shared[0],together,'Ils se rejoignent ici');
  marker(shared[shared.length-1],together,'Ils se séparent ici');
  marker(alexAfter[alexAfter.length-1],blue,'Alex continue sa course');

  // Compute actual polyline length; avoid asserting an exact 1 km if geometry changes.
  let metres=0;
  for(let i=1;i<shared.length;i++) metres+=map.distance(shared[i-1],shared[i]);
  const km=(metres/1000).toLocaleString('fr-FR',{maximumFractionDigits:1});
  document.querySelectorAll('[data-shared-distance]').forEach(n=>{n.textContent=km+' km';});
  const all=[...alexBefore,...alexAfter,...julieBefore,...julieAfter,...shared];
  map.fitBounds(L.latLngBounds(all),{padding:[24,24],maxZoom:13});
  // Refresh layout after the hero section has finished rendering on mobile.
  requestAnimationFrame(() => map.invalidateSize());
  window.addEventListener('resize',()=>map.invalidateSize());
})();
