// Initialize base map
const map = L.map("map").setView([55, -70], 5);

// Add base tile layer (OpenStreetMap)
const osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  maxZoom: 19,
	attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);

// Carto Dark basemap (works from GitHub Pages without API key)
const cartoDark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
  minZoom: 0,
  maxZoom: 20,
  attribution: '&copy; <a href="https://carto.com/" target="_blank">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});

// PART 1
// Load GeoJSON of weather stations
const stationsURL = "https://raw.githubusercontent.com/brubcam/GEOG-464_Lab-8/refs/heads/main/DATA/climate-stations.geojson";

// Year to filter climate API results to (new variable)
const DATA_YEAR = 2025;

// Fetch GeoJSON and add to map
function loadStations(url) {
  fetch(url)
    .then(response => {
      if (!response.ok) throw new Error("Failed to load GeoJSON");
      return response.json();
    })
    .then(data => {
      const stationLayer = L.geoJSON(data, {
        onEachFeature: onEachStation,
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, stationStyle(feature))
      });
            // Add marker cluster group
      const markers = L.markerClusterGroup();
      stationLayer.eachLayer(layer => {
        markers.addLayer(layer);
      });
      markers.addTo(map);
      
      // Add layer control
      const baseMaps = {
        "OpenStreetMap": osm,
        "Carto Dark": cartoDark
      };
      const overlayMaps = {
        "Climate Stations": markers
      };
      L.control.layers(baseMaps, overlayMaps).addTo(map);
      L.control.scale().addTo(map);
    })
    .catch(err => console.error("Error loading GeoJSON:", err));
   
    };

// Popup and click handler for each station
function onEachStation(feature, layer) {
  const props = feature.properties || {};
  // Property names in the GeoJSON: STN_ID, STATION_NAME, PROV_STATE_TERR_CODE, ELEVATION
  const stationId = props.STN_ID ?? props.stn_id ?? props.id ?? 'N/A';
  const stationName = props.STATION_NAME ?? props.STATION_NAME ?? props.name ?? 'Unknown';
  const province = props.PROV_STATE_TERR_CODE ?? props.province ?? '';
  const elevation = props.ELEVATION ?? props.elevation ?? 'N/A';

  const popup = `
    <strong>${stationName}</strong><br>
    <strong>Station ID:</strong> ${stationId}<br>
    <strong>Elevation:</strong> ${elevation} m<br>
    ${province ? `<strong>Province:</strong> ${province}<br>` : ''}
  `;

  layer.bindPopup(popup);
  // Fetch API data on click
  layer.on("click", () => {
    document.getElementById("station-name").innerHTML = "<strong>" + props.STATION_NAME + "</strong>";
    document.getElementById("climate-data").innerHTML = "<p>Loading climate data...</p>";
    fetchClimateData(props.CLIMATE_IDENTIFIER);
  });
}

// PART 2
// Function to fetch Environment Canada climate data
function fetchClimateData(climateID) {
  const apiURL = `https://api.weather.gc.ca/collections/climate-daily/items?limit=10&sortby=-LOCAL_DATE&CLIMATE_IDENTIFIER=${climateID}&LOCAL_YEAR=${DATA_YEAR}`;

  fetch(apiURL)
    .then(response => {
      if (!response.ok) throw new Error("Network response was not ok");
      return response.json();
    })
    .then(json => {
      if (!json.features || json.features.length === 0) {
        document.getElementById("climate-data").innerHTML = `<p>No climate data available for ${DATA_YEAR}.</p>`;
       // console.log(`No climate data available for ${DATA_YEAR}.`);
        return;
      }

      const props = json.features[0].properties;
     // console.log("Date:", props.LOCAL_DATE);
     // console.log("Mean Temp (°C):", props.MEAN_TEMPERATURE);
     // console.log("total precip:", props.TOTAL_PRECIPITATION);
        
      // Build the climate-data HTML, only showing fields that are present (not null/undefined)
      const container = document.getElementById("climate-data");
      let html = "";

      // Date (show if available)
      if (props.LOCAL_DATE != null) {
        html += `<p><strong>Date:</strong> ${props.LOCAL_DATE}</p>`;
      }

      // Temperatures
      if (props.MAX_TEMPERATURE != null) {
        html += `<p><strong>Max Temp:</strong> ${props.MAX_TEMPERATURE} °C</p>`;
      }
      if (props.MIN_TEMPERATURE != null) {
        html += `<p><strong>Min Temp:</strong> ${props.MIN_TEMPERATURE} °C</p>`;
      }
      if (props.MEAN_TEMPERATURE != null) {
        html += `<p><strong>Mean Temp:</strong> ${props.MEAN_TEMPERATURE} °C</p>`;
      }

      // Precipitation: total, rain, snow (only show if values are present)
      if (props.TOTAL_PRECIPITATION != null) {
        html += `<p><strong>Total Precipitation:</strong> ${props.TOTAL_PRECIPITATION} mm</p>`;
      }
      if (props.TOTAL_RAIN != null) {
        html += `<p><strong>Total Rain:</strong> ${props.TOTAL_RAIN} mm</p>`;
      }
      if (props.TOTAL_SNOW != null) {
        html += `<p><strong>Total Snow:</strong> ${props.TOTAL_SNOW} mm</p>`;
      }

      // If nothing to show, display a message
        if (html === "") {
        container.innerHTML = `<p>No data available for ${DATA_YEAR}.</p>`;
      } else {
        container.innerHTML = html;
      }
    })
    .catch(error => {
      console.error("Error fetching climate data:", error);
      document.getElementById("climate-data").innerHTML = `<p>Error loading climate data.</p>`;
    });
}

// PART 3
// Style for stations based on elevation
function stationStyle(feature) {
  const elevation = feature.properties.ELEVATION;
  let fillColor;

  // Categorize elevation: low (<200m), medium (200-500m), high (>500m)
  if (elevation < 200) {
    fillColor = "#9ac7e3ff"; // Blue for low elevation
  } else if (elevation >= 200 && elevation <= 500) {
    fillColor = "#f8f871ff"; // Yellow for medium elevation
  } else {
    fillColor = "#fc8d59"; // Orange for high elevation
  }

  return {
    radius: 6,
    fillColor: fillColor,
    color: "#fff",
    weight: 1,
    opacity: 1,
    fillOpacity: 0.8
};
}


// PART 5
// Add elevation color legend
const legend = L.control({ position: 'bottomright' });
legend.onAdd = function(map) {
  const div = L.DomUtil.create('div', 'info legend');
  const grades = [0, 200, 500];
  const colors = ['#9ac7e3ff', '#f8f871ff', '#fc8d59'];
  const labels = ['Low (<200m)', 'Medium (200-500m)', 'High (>500m)'];
  
  div.innerHTML += '<b>Elevation</b><br>';
  for (let i = 0; i < grades.length; i++) {
    div.innerHTML += `<i style="background:${colors[i]}"></i> ${labels[i]}<br>`;
  }
  return div;
};
legend.addTo(map);

// Load map
loadStations(stationsURL);
