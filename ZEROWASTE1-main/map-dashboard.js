// Map configuration
const MAP_CONFIG = {
    defaultCenter: [20.5937, 78.9629], // Default to India center
    defaultZoom: 5,
    maxZoom: 18,
    minZoom: 2
};

// Initialize map
let map;
let currentMapType = 'osm';
let markers = [];
let selectedDonor = null;
let selectedReceiver = null;
let routeLayer = null;

// Initialize the map
function initMap() {
    map = L.map('map').setView(MAP_CONFIG.defaultCenter, MAP_CONFIG.defaultZoom);
    
    // Add OpenStreetMap layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    // Load initial donor data
    loadDonorData();
    
    // Setup event listeners
    setupEventListeners();
}

// Load donor data from backend
async function loadDonorData() {
    try {
        const response = await fetch('/api/donors');
        const donors = await response.json();
        
        // Clear existing markers
        clearMarkers();
        
        // Add new markers
        donors.forEach(donor => {
            addDonorMarker(donor);
        });
    } catch (error) {
        console.error('Error loading donor data:', error);
    }
}

// Add donor marker to map
function addDonorMarker(donor) {
    const marker = L.marker([donor.latitude, donor.longitude], {
        icon: getStatusIcon(donor.status)
    });
    
    marker.bindPopup(createDonorPopup(donor));
    marker.on('click', () => handleMarkerClick(donor));
    
    marker.addTo(map);
    markers.push(marker);
}

// Get appropriate icon based on status
function getStatusIcon(status) {
    const iconClass = {
        'fresh': 'marker-fresh',
        'near-expiry': 'marker-near-expiry',
        'expired': 'marker-expired'
    }[status];
    
    return L.divIcon({
        className: iconClass,
        iconSize: [16, 16]
    });
}

// Create popup content for donor marker
function createDonorPopup(donor) {
    return `
        <div class="donor-popup">
            <h3>${donor.name}</h3>
            <p>Status: ${donor.status}</p>
            <p>Food Type: ${donor.foodType}</p>
            <p>Quantity: ${donor.quantity}</p>
            <button onclick="openInGoogleMaps(${donor.latitude}, ${donor.longitude})">
                Open in Google Maps
            </button>
        </div>
    `;
}

// Handle marker click
function handleMarkerClick(donor) {
    selectedDonor = donor;
    updateRoute();
}

// Update route between selected donor and receiver
async function updateRoute() {
    if (!selectedDonor || !selectedReceiver) return;
    
    try {
        const response = await fetch(`/api/route?origin=${selectedDonor.latitude},${selectedDonor.longitude}&destination=${selectedReceiver.latitude},${selectedReceiver.longitude}`);
        const routeData = await response.json();
        
        // Clear existing route
        if (routeLayer) {
            map.removeLayer(routeLayer);
        }
        
        // Draw new route
        routeLayer = L.geoJSON(routeData).addTo(map);
        
        // Update info panel
        updateInfoPanel(routeData);
    } catch (error) {
        console.error('Error updating route:', error);
    }
}

// Update info panel with route details
function updateInfoPanel(routeData) {
    const distance = routeData.properties.distance;
    const duration = routeData.properties.duration;
    
    document.getElementById('routeDistance').textContent = `${distance} km`;
    document.getElementById('routeDuration').textContent = duration;
}

// Open location in Google Maps
function openInGoogleMaps(lat, lng) {
    window.open(`https://www.google.com/maps?q=${lat},${lng}`, '_blank');
}

// Clear all markers
function clearMarkers() {
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];
}

// Filter markers by range
function filterMarkersByRange(range) {
    if (!selectedReceiver) return;
    
    markers.forEach(marker => {
        const distance = marker.getLatLng().distanceTo(
            L.latLng(selectedReceiver.latitude, selectedReceiver.longitude)
        ) / 1000; // Convert to kilometers
        
        if (distance <= range) {
            marker.addTo(map);
        } else {
            map.removeLayer(marker);
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Range slider
    const rangeSlider = document.getElementById('rangeSlider');
    const rangeValue = document.getElementById('rangeValue');
    
    rangeSlider.addEventListener('input', (e) => {
        const value = e.target.value;
        rangeValue.textContent = `${value} km`;
        filterMarkersByRange(parseInt(value));
    });
    
    // Map type toggle
    document.getElementById('mapTypeToggle').addEventListener('click', () => {
        if (currentMapType !== 'osm') {
            switchToOSM();
        }
    });
    
    document.getElementById('googleMapToggle').addEventListener('click', () => {
        if (currentMapType !== 'google') {
            switchToGoogleMaps();
        }
    });
    
    // Info panel close button
    document.getElementById('closeInfoPanel').addEventListener('click', () => {
        document.querySelector('.map-info-panel').style.display = 'none';
    });
}

// Switch to OpenStreetMap
function switchToOSM() {
    map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    currentMapType = 'osm';
    updateMapTypeButtons();
}

// Switch to Google Maps
function switchToGoogleMaps() {
    map.eachLayer((layer) => {
        if (layer instanceof L.TileLayer) {
            map.removeLayer(layer);
        }
    });
    
    L.tileLayer('https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
        attribution: '© Google Maps'
    }).addTo(map);
    
    currentMapType = 'google';
    updateMapTypeButtons();
}

// Update map type toggle buttons
function updateMapTypeButtons() {
    document.getElementById('mapTypeToggle').classList.toggle('active', currentMapType === 'osm');
    document.getElementById('googleMapToggle').classList.toggle('active', currentMapType === 'google');
}

// Initialize the map when the page loads
document.addEventListener('DOMContentLoaded', initMap); 