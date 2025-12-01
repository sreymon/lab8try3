// -----------------------------------------------------
// PART 0 - Base Map Setup
// --------------------------------------------------------

const stationsURL = "https://raw.githubusercontent.com/brubcam/GEOG-464_Lab-8/refs/heads/main/DATA/climate-stations.geojson";

const map = L.map("map").setView([52, -72], 5);

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution: "© OpenStreetMap contributors"
}).addTo(map);

// Q7 - Additional basemap
const esriSat = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { attribution: "Tiles © Esri" }
);

// -----------------------------------------------------
// PART 1 - Load GeoJSON
// -----------------------------------------------------

function onEachStation(feature, layer) {
  const p = feature.properties;
  console.log("Feature Properties:", p); // Add this line to log the feature properties

  layer.bindPopup(`
    <strong>${p.STATION_NAME}</strong><br>
    Province: ${p.PROVINCE_CODE}<br>
    Station ID: ${p.CLIMATE_IDENTIFIER}<br>
    Elevation: ${p.ELEVATION} m
  `);

  layer.on("click", () => {
    document.getElementById("station-name").innerHTML = 
    `<strong>${p.STATION_NAME}</strong>`;
    document.getElementById("climate-data").innerHTML = "<p>Loading data…</p>";
    fetchClimateData(p.CLIMATE_IDENTIFIER);
  });
}

// PART 3 - Point style (Q5 three elevation categories)
function stationStyle(feature) {
  const elev = feature.properties.ELEVATION;
  let fillColor;

  if (elev < 100) fillColor = "#edf8fb";        // low
  else if (elev < 500) fillColor = "#b3cde3";   // medium
  else fillColor = "#084081";                   // high

  return {
    radius: 6,
    fillColor,
    color: "#000",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
  };
}


function loadStations(url) {
  fetch(url)
    .then(res => res.json())
    .then(data => {

      const stationLayer = L.geoJSON(data, {
        onEachFeature: onEachStation,
        pointToLayer: (feature, latlng) =>
          L.circleMarker(latlng, stationStyle(feature))
      });

      // Q6 - do NOT add stationLayer before clustering
      const markers = L.markerClusterGroup();
      stationLayer.eachLayer(l => markers.addLayer(l));
      markers.addTo(map);

      // PART 4 - Layer control
      const baseMaps = {
        "OpenStreetMap": osm,
        "Satellite Imagery": esriSat
      };

      const overlayMaps = {
        "Climate Stations": markers
      };

      L.control.layers(baseMaps, overlayMaps).addTo(map);
      L.control.scale().addTo(map);

    })
    .catch(err => console.error("Error loading GeoJSON:", err));
}




// -----------------------------------------------------
// PART 2 - Fetch Climate Daily API Data (Q3-Q4-Q9)
//------------------------------------------------------

function fetchClimateData(climateID) {
  // let year = 2025; // Q4 requirement - removed as it was unused and could cause confusion

  // To reliably get the latest climate data, sort by LOCAL_DATE in descending order and limit to 1.
  const apiURL =
    `https://api.weather.gc.ca/collections/climate-daily/items?` +
    `CLIMATE_IDENTIFIER=${climateID}&sortby=-LOCAL_DATE&limit=1`;

  fetch(apiURL)
    .then(res => res.json())
    .then(json => {
      if (!json.features || json.features.length === 0) {
        document.getElementById("climate-data").innerHTML =
          "<p>No climate data available.</p>";
        return;
      }

      const props = json.features[0].properties;
      console.log("API Response Properties:", props); // Add this line to log the properties

      // Build HTML conditionally - Q9
      let html = `<p><strong>Date:</strong> ${props.LOCAL_DATE}</p>`;

      if (props.MAX_TEMPERATURE != null) {
        html += `<p><strong>Max Temp:</strong> ${props.MAX_TEMPERATURE} °C</p>`;
      }
      if (props.MIN_TEMPERATURE != null) {
        html += `<p><strong>Min Temp:</strong> ${props.MIN_TEMPERATURE} °C</p>`;
      }
      
      if (props.MEAN_TEMPERATURE !== null) {
        html += `<p><strong>Mean Temp:</strong> ${props.MEAN_TEMPERATURE} &deg;C</p>`;
      }

      if (props.TOTAL_PRECIPITATION !== null) {
        html += `<p><strong>Total Precip:</strong> ${props.TOTAL_PRECIPITATION} mm</p>`;
      }

      // Rain (supports both possible fields)
      if (props.TOTAL_RAIN !== null) {
        html += `<p>Rain: ${props.TOTAL_RAIN} mm</p>`;
      }

      // Snow (supports both possible fields)
      if (props.TOTAL_SNOW !== null) {
        html += `<p>Snow: ${props.TOTAL_SNOW} cm</p>`;
      }


      document.getElementById("climate-data").innerHTML = html;
    })
    .catch(err => {
      console.error("API error:", err);
      document.getElementById("climate-data").innerHTML =
        "<p>Error loading climate data.</p>";
    });
}


// -----------------------------------------------------
// PART 5 - Legend (Q8)
// -----------------------------------------------------

const legend = L.control({ position: "bottomright" });

legend.onAdd = function (map) {
  const div = L.DomUtil.create("div", "info legend");
  const grades = ["<100", "100-499", "500+"];
  const colors = ["#edf8fb", "#b3cde3", "#084081"];

  div.innerHTML += "<b>Elevation (m)</b><br>";

  grades.forEach((g, i) => {
    div.innerHTML += `<i style="background:${colors[i]}"></i> ${g}<br>`;
  });

  return div;
};

legend.addTo(map);


loadStations(stationsURL);


