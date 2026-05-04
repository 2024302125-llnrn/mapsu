var map;
var markerGroup;
var routeLine;
var markersByName = new Map();
var bounds = [[0, 0], [3375, 6000]];
var imageUrl = 'assets/campus-map.png';

map = L.map('map', { 
    crs: L.CRS.Simple, 
    minZoom: -3,
    maxZoom: 2, 
    zoomControl: false,
    preferCanvas: true,
    zoomAnimation: false,
    fadeAnimation: false,
    markerZoomAnimation: false
});

map.setMaxBounds(bounds);

var image = L.imageOverlay(imageUrl, bounds).addTo(map);
markerGroup = L.layerGroup().addTo(map);

L.control.zoom({
    position: 'bottomright'
}).addTo(map);

var smallIcon = L.icon({
    iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
    iconSize: [8, 16],
    iconAnchor: [4, 16],
    popupAnchor: [0, -16]
});

function isMobile() {
    return window.innerWidth <= 768;
}

function formatInfo(info) {
    if (!info) return "No description available.";

    const lines = info.split('\n').filter(line => line.trim() !== "");
    if (lines.length <= 2) {
        return `<div style="text-align: justify;">${info.replace(/\n/g, '<br>')}</div>`;
    }

    const firstLine = lines[0];
    const secondLine = lines[1];
    const restLines = lines.slice(2);
    
    let html = `<div style="text-align: justify; margin-bottom: 8px;">${firstLine.trim()}</div>`;
    html += `<div style="text-align: justify; margin-bottom: 12px;">${secondLine.trim()}</div>`;
    
    if (restLines.length > 0) {
        html += `<ul style="padding-left: 20px; margin-top: 0;">
            ${restLines.map(line => `<li style="text-align: left;">${line.trim()}</li>`).join('')}
        </ul>`;
    }
    
    return html;
}

function showInfoPanel(building) {
    const panel = document.getElementById('infoPanel');
    if (!panel || !building) return;

    window.currentBuilding = building;
    
    document.getElementById('infoTitle').textContent = building.name;
    document.getElementById('infoDescription').innerHTML = formatInfo(building.info);

    const img = document.getElementById('infoImage');
    if (img) {
        let rawPath = building.image || building.image_path || 'assets/campus-logo.png'; 
        
        let cleanPath = typeof rawPath === 'string' 
            ? rawPath.replace(/^(\.\.\/|\/)+/, '') 
            : 'assets/campus-logo.png';
        
        const finalUrl = '/mapsu/' + cleanPath;
        
        img.src = finalUrl;
        console.log("Final URL built:", finalUrl);

        img.style.cursor = 'pointer';
        img.onclick = () => {
            if (typeof openImageDisplayer === 'function') openImageDisplayer(finalUrl);
        };
    }

    panel.style.display = 'flex';
}

function hideInfoPanel() {
    const panel = document.getElementById('infoPanel');
    if (panel) panel.style.display = 'none';
}

function renderMarkers(selectedName = "") {
    const dataSource = (typeof window.buildings !== 'undefined' && window.buildings.length > 0) 
        ? window.buildings 
        : (typeof buildings !== 'undefined' ? buildings : []);

    markerGroup.clearLayers();
    markersByName.clear();

    dataSource.forEach(b => {
        const pos = b.coordinates;

        if (pos && pos.length === 2 && !isNaN(pos[0]) && !isNaN(pos[1])) {
            const latlng = [pos[0], pos[1]];
            const marker = L.marker(latlng, { icon: smallIcon });

            marker.bindPopup(`
                <div class="building-popup">
                    <strong>${b.name}</strong>
                </div>
            `, {
                maxHeight: 250,
                autoPan: true,
                keepInView: true,
                autoPanPaddingTopLeft: [20, 80],
                autoPanPaddingBottomRight: [20, 20]
            });

            marker.on('click', () => {
                marker.openPopup();
                const searchBox = document.getElementById('searchBox');
                if (searchBox) {
                    searchBox.value = b.name;
                }
                showInfoPanel(b);
            });

            markerGroup.addLayer(marker);
            markersByName.set(b.name, { marker, building: b, latlng });
        } else {
            console.warn("Invalid coordinates for:", b);
        }
        });

        if (selectedName !== "" && markersByName.has(selectedName)) {
            const selected = markersByName.get(selectedName);
            map.setView(selected.latlng, 1, { animate: false });
            selected.marker.openPopup();
        }
}

function focusBuilding(buildingName) {
    renderMarkers(buildingName);
}

async function loadBuildingsFromDB() {
    try {
        const response = await fetch('php/get_buildings.php');
        const data = await response.json();
        
        if (data.success && data.data) {
            window.buildings = data.data;
            renderMarkers();
            updateDropdowns();
            return window.buildings;
        } else {
            console.error('Failed to load buildings:', data.error);
            return [];
        }
    } catch (error) {
        console.error('Error loading buildings from database:', error);
        return [];
    }
}

function updateDropdowns() {
    const startSelect = document.getElementById('startPoint');
    const destSelect = document.getElementById('destSelect');
    
    if (startSelect && destSelect && window.buildings) {
        while (startSelect.options.length > 1) startSelect.remove(1);
        while (destSelect.options.length > 1) destSelect.remove(1);

        window.buildings.forEach(b => {
            startSelect.add(new Option(b.name, b.name));
            destSelect.add(new Option(b.name, b.name));
        });
    }
}

function resetMap() {
    const centerY = (bounds[0][0] + bounds[1][0]) / 2;
    const centerX = (bounds[0][1] + bounds[1][1]) / 2;

    map.setView([centerY, centerX], -2); 
    
    if (routeLine) {
        map.removeLayer(routeLine);
        routeLine = null;
    }

    if (window.startMarker) {
        map.removeLayer(window.startMarker);
        window.startMarker = null;
    }
    if (window.endMarker) {
        map.removeLayer(window.endMarker);
        window.endMarker = null;
    }

    markerGroup.eachLayer((layer) => {
        if (layer.closePopup) layer.closePopup();
    });

    document.getElementById("startPoint").value = "";
    document.getElementById("destSelect").value = "";

    const searchBox = document.getElementById("searchBox");
    if (searchBox) searchBox.value = "";

    window.currentBuilding = null;
    hideInfoPanel();
}

function setupMapHandlers() {
    const closeUI = () => {
        hideInfoPanel();
        markerGroup.eachLayer((layer) => {
            if (layer.closePopup) layer.closePopup();
        });
        const sidebar = document.getElementById("sidebar");
        if (sidebar) sidebar.classList.remove("open");
        const mapDiv = document.getElementById("map");
        if (mapDiv) mapDiv.style.pointerEvents = "auto";
    };

    map.on('click', (e) => {
        console.log(`[${e.latlng.lat}, ${e.latlng.lng}]`);
        closeUI();
    });

    image.on('click', closeUI);
}

function toggleSheet() {
    const sidebar = document.getElementById("sidebar");
    const mapDiv = document.getElementById("map");
    sidebar.classList.toggle("open");

    if (sidebar.classList.contains("open")) {
        mapDiv.style.pointerEvents = "none";
    } else {
        mapDiv.style.pointerEvents = "auto";
    }
}

document.addEventListener('DOMContentLoaded', async () => {
    if (typeof initGraphData === 'function') {
        await initGraphData();
    }
    
    await loadBuildingsFromDB();

    if (!window.buildings || window.buildings.length === 0) {
        if (typeof buildings !== 'undefined') {
            window.buildings = buildings;
            renderMarkers();
        }
    }
    
    const centerY = (bounds[0][0] + bounds[1][0]) / 2;
    const centerX = (bounds[0][1] + bounds[1][1]) / 2;
    map.setView([centerY, centerX], -2);

    setupMapHandlers();
});