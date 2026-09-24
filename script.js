const STORE_LINKS = {
  apple: '',
  google: '',
};

document.querySelectorAll('[data-store]').forEach((button) => {
  const key = button.dataset.store;
  const url = STORE_LINKS[key];
  if (!url) return;
  button.href = url;
  button.classList.remove('is-disabled');
  button.removeAttribute('aria-disabled');
  const small = button.querySelector('small');
  if (small) small.textContent = key === 'apple' ? 'Télécharger sur' : 'Disponible sur';
});

document.querySelectorAll('a[aria-disabled="true"]').forEach((button) => {
  button.addEventListener('click', (event) => event.preventDefault());
});

const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

const year = document.getElementById('year');
if (year) year.textContent = new Date().getFullYear();


// Real Cannes basemap + geographically grounded CrossRun routes.
(() => {
  const el = document.getElementById('cannes-crossing-map');
  if (!el || typeof L === 'undefined') return;
  const map = L.map(el, { zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, boxZoom: false, keyboard: false, attributionControl: true })
    .setView([43.5481, 7.0290], 14);
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  const runnerA = [
    [43.55055,7.01155],[43.55078,7.01555],[43.55102,7.01920],[43.55138,7.02270],
    [43.55155,7.02575],[43.55108,7.02930],[43.55042,7.03320],[43.54970,7.03710],
    [43.54875,7.04105],[43.54790,7.04420]
  ];
  const runnerB = [
    [43.54175,7.04795],[43.54315,7.04695],[43.54445,7.04600],[43.54585,7.04495],
    [43.54705,7.04365],[43.54790,7.04420],[43.54875,7.04105],[43.54970,7.03710],
    [43.55020,7.03435],[43.55075,7.03125]
  ];
  L.polyline(runnerA, { color:'#247ee8', weight:6, opacity:.96, lineCap:'round' }).addTo(map);
  L.polyline(runnerB, { color:'#1d2733', weight:6, opacity:.90, lineCap:'round' }).addTo(map);
  L.circleMarker([43.54790,7.04420], { radius:9, color:'#fff', weight:4, fillColor:'#247ee8', fillOpacity:1 }).addTo(map);
  L.circle([43.54790,7.04420], { radius:80, color:'#247ee8', weight:2, fillColor:'#247ee8', fillOpacity:.10 }).addTo(map);
  map.fitBounds(L.latLngBounds(runnerA.concat(runnerB)).pad(.12));
})();
