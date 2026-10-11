import maplibregl from "https://unpkg.com/maplibre-gl@6.13.0/dist/maplibre-gl.mjs";

const mapElement = document.getElementById("cannes-map");
const statusElement = document.getElementById("map-status");

if (mapElement) {
  try {
    const map = new maplibregl.Map({
      container: mapElement,
      style: "https://tiles.openfreemap.org/styles/liberty",
      center: [7.027, 43.547],
      zoom: 13.6,
      minZoom: 13,
      maxZoom: 16,
      interactive: false,
      attributionControl: false,
      pitchWithRotate: false,
      dragRotate: false,
    });

    map.addControl(new maplibregl.AttributionControl({
      compact: true,
      customAttribution: "Tracés CrossRun illustratifs",
    }), "bottom-right");

    const common = [
      [7.032902, 43.541642], // Port Canto
      [7.0311, 43.5432],
      [7.0292, 43.5446],
      [7.0270, 43.5460],
      [7.0246, 43.5481],
    ];

    const alex = [
      [7.0367, 43.5470],
      [7.0354, 43.5461],
      [7.0346, 43.5446],
      [7.0336, 43.5433],
      ...common,
      [7.0227, 43.5497],
      [7.0203, 43.5505],
      [7.01793, 43.55091], // Palais des Festivals
      [7.0177, 43.5522],
      [7.0205, 43.5531],
      [7.0260, 43.5528],
      [7.0312, 43.5515],
      [7.0350, 43.5495],
      [7.0367, 43.5470],
    ];

    const julie = [
      [7.0380, 43.5439],
      [7.0361, 43.5434],
      [7.0348, 43.5426],
      ...common,
      [7.0241, 43.5496],
      [7.0267, 43.5508],
      [7.0310, 43.5506],
      [7.0353, 43.5496],
      [7.0374, 43.5474],
      [7.0380, 43.5439],
    ];

    map.once("load", () => {
      map.addSource("runner-routes", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [
            { type: "Feature", properties: { color: "#f05e68" }, geometry: { type: "LineString", coordinates: alex } },
            { type: "Feature", properties: { color: "#1769ff" }, geometry: { type: "LineString", coordinates: julie } },
          ],
        },
      });
      map.addLayer({
        id: "route-outline",
        type: "line",
        source: "runner-routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#fff", "line-width": 10, "line-opacity": 0.96 },
      });
      map.addLayer({
        id: "runner-route-lines",
        type: "line",
        source: "runner-routes",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 6,
          "line-opacity": 0.98,
        },
      });
      map.addSource("shared-route", {
        type: "geojson",
        data: { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: common } },
      });
      map.addLayer({
        id: "shared-route-outline",
        type: "line",
        source: "shared-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#fff", "line-width": 13, "line-opacity": 1 },
      });
      map.addLayer({
        id: "shared-route-line",
        type: "line",
        source: "shared-route",
        layout: { "line-cap": "round", "line-join": "round" },
        paint: { "line-color": "#e5ac12", "line-width": 8, "line-opacity": 1 },
      });

      const homePoints = [
        { coordinates: [7.0367, 43.5470], name: "Alex", color: "#f05e68", className: "map-home-pin map-home-alex" },
        { coordinates: [7.0380, 43.5439], name: "Julie", color: "#1769ff", className: "map-home-pin map-home-julie" },
      ];
      homePoints.forEach((point) => {
        const marker = document.createElement("div");
        marker.className = point.className;
        marker.style.setProperty("--pin-color", point.color);
        marker.innerHTML = `<span>${point.name}<small>départ + retour</small></span>`;
        new maplibregl.Marker({ element: marker, anchor: "left" })
          .setLngLat(point.coordinates)
          .addTo(map);
      });

      map.fitBounds([[7.014, 43.539], [7.041, 43.555]], {
        padding: { top: 54, right: 24, bottom: 46, left: 24 },
        maxZoom: 14.6,
        duration: 0,
      });
      if (statusElement) statusElement.remove();
    });

    map.on("error", (event) => {
      if (statusElement && statusElement.isConnected && event?.error) {
        statusElement.textContent = "La carte ne se charge pas pour le moment.";
        statusElement.classList.add("is-error");
      }
    });
  } catch (error) {
    if (statusElement) {
      statusElement.textContent = "La carte ne se charge pas pour le moment.";
      statusElement.classList.add("is-error");
    }
  }
}
