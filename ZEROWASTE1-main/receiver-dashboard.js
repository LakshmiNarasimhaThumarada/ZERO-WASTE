let map;
let currentLocation = null;
let markers = [];
let requestHistory = []; // to store the request history
let currentRoute = null;
let directionsService;
let directionsRenderer;
let currentLocationMarker = null;

const donations = [
    { id: 1, food: "Veg Biryani", type: "veg", freshness: "perishable", lat: 17.39, lng: 78.48 },
    { id: 2, food: "Chicken Curry", type: "non-veg", freshness: "perishable", lat: 17.41, lng: 78.49 },
    { id: 3, food: "Rice Bag", type: "veg", freshness: "non-perishable", lat: 17.38, lng: 78.45 }
];

// Status colors
const STATUS_COLORS = {
    'available': '#4CAF50', // Green
    'near-expiry': '#FFC107', // Yellow
    'expired': '#F44336', // Red
    'picked': '#9E9E9E' // Grey
};

// Initialize map
function initMap() {
    // Initialize Leaflet map
    map = L.map('map').setView([20.5937, 78.9629], 5); // India center

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
    }).addTo(map);

    // Initialize Google Directions
    directionsService = new google.maps.DirectionsService();
    directionsRenderer = new google.maps.DirectionsRenderer({
        suppressMarkers: true,
        polylineOptions: {
            strokeColor: '#2196F3',
            strokeWeight: 5
        }
    });

    // Add status legend
    const legend = L.control({position: 'bottomleft'});
    legend.onAdd = function(map) {
        const div = L.DomUtil.create('div', 'legend');
        div.innerHTML = `
            <div><span class="dot" style="background: ${STATUS_COLORS.available}"></span>Fresh & Available</div>
            <div><span class="dot" style="background: ${STATUS_COLORS['near-expiry']}"></span>Near Expiry</div>
            <div><span class="dot" style="background: ${STATUS_COLORS.expired}"></span>Picked / Expired</div>
        `;
        return div;
    };
    legend.addTo(map);

    // Get user's location
    getCurrentLocation();
}

// Get current location
async function getCurrentLocation() {
    try {
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });

        currentLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
        };

        // Update map center
        map.setView([currentLocation.lat, currentLocation.lng], 13);

        // Add current location marker
        if (currentLocationMarker) {
            map.removeLayer(currentLocationMarker);
        }

        currentLocationMarker = L.marker([currentLocation.lat, currentLocation.lng], {
            icon: L.divIcon({
                className: 'current-location-marker',
                html: '<div class="pulse-marker"></div>',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(map).bindPopup('You are here').openPopup();

        // Add accuracy circle
        L.circle([currentLocation.lat, currentLocation.lng], {
            color: '#2196F3',
            fillColor: '#2196F3',
            fillOpacity: 0.1,
            radius: currentLocation.accuracy
        }).addTo(map);

        await loadDonations();
    } catch (error) {
        console.error('Error getting location:', error);
        showNotification('Error getting location. Please enable location services.');
    }
}

// Load donations from backend
async function loadDonations() {
    try {
        const foodType = document.getElementById('filterType').value;
        const freshness = document.getElementById('filterFreshness').value;
        const distance = document.getElementById('filterDistance').value;

        const response = await fetch(`/api/receiver/donations?lat=${currentLocation.lat}&lng=${currentLocation.lng}&foodType=${foodType}&freshness=${freshness}&distance=${distance}`, {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load donations');

        const donations = await response.json();
        updateMapMarkers(donations);
        updateDonationList(donations);
    } catch (error) {
        console.error('Error loading donations:', error);
        showNotification('Error loading donations. Please try again.');
    }
}

// Update map markers
function updateMapMarkers(donations) {
    // Clear existing markers
    markers.forEach(marker => map.removeLayer(marker));
    markers = [];

    // Add new markers
    donations.forEach(donation => {
        const status = getDonationStatus(donation);
        const marker = L.marker([donation.latitude, donation.longitude], {
            icon: L.divIcon({
                className: '',
                html: `<div style="background:${STATUS_COLORS[status]}; width:16px; height:16px; border-radius:50%; border: 2px solid white;"></div>`,
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            })
        }).addTo(map);

        // Add popup with donation details
        marker.bindPopup(`
            <div class="donation-popup">
                <h4>${donation.food_type}</h4>
                <p>Type: ${donation.type}</p>
                <p>Quantity: ${donation.quantity}</p>
                <p>Status: ${status.replace('-', ' ').toUpperCase()}</p>
                <p>Expiry: ${new Date(donation.expiry_date).toLocaleDateString()}</p>
                <button onclick="showRoute(${donation.latitude}, ${donation.longitude})" class="route-btn">
                    Show Route
                </button>
            </div>
        `);

        markers.push(marker);
    });
}

// Update donation list
function updateDonationList(donations) {
    const list = document.getElementById('donationList');
    list.innerHTML = '';

    donations.forEach(donation => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h5>${donation.food_type}</h5>
                    <p class="mb-1">Quantity: ${donation.quantity}</p>
                    <p class="mb-1">Distance: ${donation.distance_km.toFixed(2)} km</p>
                    <p class="mb-1">Donor: ${donation.donor_name}</p>
                </div>
                <button class="btn btn-primary" onclick="requestPickup(${donation.id})">
                    Request Pickup
                </button>
            </div>
        `;
        list.appendChild(li);
    });
}

// Request pickup
async function requestPickup(donationId) {
    try {
        const response = await fetch('/api/receiver/request-pickup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ donationId }),
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to request pickup');

        showNotification('Pickup requested successfully!');
        await loadDonations();
        await loadRequestHistory();
    } catch (error) {
        console.error('Error requesting pickup:', error);
        showNotification('Error requesting pickup. Please try again.');
    }
}

// Load request history
async function loadRequestHistory() {
    try {
        const response = await fetch('/api/receiver/request-history', {
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to load request history');

        const requests = await response.json();
        updateRequestHistory(requests);
    } catch (error) {
        console.error('Error loading request history:', error);
        showNotification('Error loading request history. Please try again.');
    }
}

// Update request history
function updateRequestHistory(requests) {
    const list = document.getElementById('requestHistoryList');
    list.innerHTML = '';

    requests.forEach(request => {
        const li = document.createElement('li');
        li.className = 'list-group-item';
        li.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <h5>${request.food_type}</h5>
                    <p class="mb-1">Status: ${request.status}</p>
                    <p class="mb-1">Donor: ${request.donor_name}</p>
                    <p class="mb-1">Contact: ${request.donor_contact}</p>
                </div>
                <span class="badge bg-${getStatusBadgeClass(request.status)}">
                    ${request.status}
                </span>
            </div>
        `;
        list.appendChild(li);
    });
}

// Submit feedback
async function submitFeedback(event) {
    event.preventDefault();
    const form = event.target;
    const donationId = form.dataset.donationId;
    const rating = form.rating.value;
    const comment = form.comment.value;

    try {
        const response = await fetch('/api/receiver/feedback', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ donationId, rating, comment }),
            credentials: 'include'
        });

        if (!response.ok) throw new Error('Failed to submit feedback');

        showNotification('Feedback submitted successfully!');
        form.reset();
    } catch (error) {
        console.error('Error submitting feedback:', error);
        showNotification('Error submitting feedback. Please try again.');
    }
}

// Helper functions
function getStatusBadgeClass(status) {
    switch (status) {
        case 'pending': return 'warning';
        case 'accepted': return 'success';
        case 'rejected': return 'danger';
        case 'completed': return 'info';
        default: return 'secondary';
    }
}

function showNotification(message) {
    const notification = document.getElementById('notificationBox');
    notification.textContent = message;
    notification.style.display = 'block';
    setTimeout(() => {
        notification.style.display = 'none';
    }, 3000);
}

// Get donation status based on expiry date
function getDonationStatus(donation) {
    const now = new Date();
    const expiryDate = new Date(donation.expiry_date);
    const hoursUntilExpiry = (expiryDate - now) / (1000 * 60 * 60);

    if (donation.status === 'picked') return 'picked';
    if (donation.status === 'expired') return 'expired';
    if (hoursUntilExpiry <= 24) return 'near-expiry';
    return 'available';
}

// Show route to donation location
function showRoute(destinationLat, destinationLng) {
    if (!currentLocation) {
        showNotification('Please enable location services to show route');
        return;
    }

    const request = {
        origin: currentLocation,
        destination: { lat: destinationLat, lng: destinationLng },
        travelMode: google.maps.TravelMode.DRIVING
    };

    directionsService.route(request, (result, status) => {
        if (status === 'OK') {
            // Clear previous route if exists
            if (currentRoute) {
                map.removeLayer(currentRoute);
            }

            // Convert Google Maps route to Leaflet polyline
            const path = result.routes[0].overview_path.map(point => [point.lat(), point.lng()]);
            currentRoute = L.polyline(path, {
                color: '#2196F3',
                weight: 5,
                opacity: 0.7
            }).addTo(map);

            // Show route info
            const route = result.routes[0].legs[0];
            L.popup()
                .setLatLng([destinationLat, destinationLng])
                .setContent(`
                    <div class="route-info">
                        <h4>Route Information</h4>
                        <p>Distance: ${route.distance.text}</p>
                        <p>Duration: ${route.duration.text}</p>
                    </div>
                `)
                .openOn(map);

            // Fit map to route bounds
            map.fitBounds(currentRoute.getBounds());
        } else {
            showNotification('Could not calculate route: ' + status);
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Load Google Maps API
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyBr8k9lvjMqjMlkQT8oZ9gAOISA4w1wjxc&callback=initMap`;
    script.defer = true;
    script.async = true;
    document.head.appendChild(script);

    // Add event listeners
    document.getElementById('filterType').addEventListener('change', loadDonations);
    document.getElementById('filterFreshness').addEventListener('change', loadDonations);
    document.getElementById('filterDistance').addEventListener('change', loadDonations);
    document.getElementById('feedbackForm').addEventListener('submit', submitFeedback);

    // Refresh donations every 30 seconds
    setInterval(loadDonations, 30000);
});
