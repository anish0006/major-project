// Sample shelter data
const shelters = [
    {
        id: 1,
        name: "Delhi Relief Shelter",
        lat: 28.6139,
        lng: 77.2090,
        foodLevel: 75,
        waterLevel: 90,
        occupancy: 120,
        maxCapacity: 150,
        status: "available",
        contact: "+91-11-12345678",
        amenities: ["Medical", "Food", "Water", "Power"]
    },
    {
        id: 2,
        name: "Mumbai Relief Center",
        lat: 19.0760,
        lng: 72.8777,
        foodLevel: 25,
        waterLevel: 45,
        occupancy: 200,
        maxCapacity: 200,
        status: "critical",
        contact: "+91-22-12345678",
        amenities: ["Medical", "Food", "Water"]
    },
    {
        id: 3,
        name: "Bengaluru Community Center",
        lat: 12.9716,
        lng: 77.5946,
        foodLevel: 60,
        waterLevel: 80,
        occupancy: 85,
        maxCapacity: 120,
        status: "warning",
        contact: "+91-80-12345678",
        amenities: ["Medical", "Food", "Water", "Power", "Internet"]
    },
    {
        id: 4,
        name: "Kolkata Emergency Center",
        lat: 22.5726,
        lng: 88.3639,
        foodLevel: 95,
        waterLevel: 88,
        occupancy: 95,
        maxCapacity: 180,
        status: "available",
        contact: "+91-33-12345678",
        amenities: ["Medical", "Food", "Water", "Power"]
    }
];

// Initialize map
let map;
let shelterMarkers = [];
let userLocationMarker = null;
let userLocation = null;
let currentDistanceFilter = 1; // Default 1km
let shelterLayerGroup = null;
let geoWatchId = null;

function initMap() {
    // Center on India
    map = L.map('map').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    shelterLayerGroup = L.layerGroup().addTo(map);
    renderShelterMarkers();
}

function renderShelterMarkers() {
    if (!shelterLayerGroup) return;
    shelterLayerGroup.clearLayers();

    const shouldFilterByDistance = Boolean(userLocation);

    shelters
        .filter(shelter => {
            if (!shouldFilterByDistance) return true;
            const d = calculateDistance(
                userLocation.lat, userLocation.lng,
                shelter.lat, shelter.lng
            );
            return d <= currentDistanceFilter;
        })
        .forEach(shelter => {
            const marker = L.marker([shelter.lat, shelter.lng])
                .bindPopup(`
                    <div style="padding: 10px;">
                        <h3 style="margin-bottom: 10px; color: #333;">${shelter.name}</h3>
                        <p><strong>Status:</strong> <span style="color: ${getStatusColor(shelter.status)}">${shelter.status.toUpperCase()}</span></p>
                        <p><strong>Occupancy:</strong> ${shelter.occupancy}/${shelter.maxCapacity}</p>
                        <p><strong>Food Level:</strong> ${shelter.foodLevel}%</p>
                        <p><strong>Water Level:</strong> ${shelter.waterLevel}%</p>
                        <p><strong>Contact:</strong> ${shelter.contact}</p>
                        <button onclick="callShelter('${shelter.contact}')" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 5px; margin-top: 10px; cursor: pointer;">
                            <i class="fas fa-phone"></i> Call
                        </button>
                    </div>
                `);

            const icon = L.divIcon({
                className: 'custom-marker',
                html: `<div style="background: ${getStatusColor(shelter.status)}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            });
            marker.setIcon(icon);
            marker.addTo(shelterLayerGroup);
        });
}

function getStatusColor(status) {
    switch(status) {
        case 'available': return '#28a745';
        case 'warning': return '#ffc107';
        case 'critical': return '#dc3545';
        default: return '#6c757d';
    }
}

function switchTab(tabName) {
    // Remove active class from all tabs and content
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));

    // Add active class to selected tab and content
    event.target.classList.add('active');
    document.getElementById(`${tabName}-tab`).classList.add('active');

    // Load content based on tab
    if (tabName === 'shelters') {
        loadSheltersList();
    } else if (tabName === 'alerts') {
        loadAlertsList();
    }
}

function loadSheltersList() {
    const sheltersList = document.getElementById('sheltersList');
    sheltersList.innerHTML = '';

    if (!userLocation) {
        const info = document.createElement('div');
        info.className = 'shelter-card';
        info.innerHTML = `
            <div class="shelter-header">
                <div class="shelter-name">Get your location</div>
            </div>
            <p>Click "My Location" to see nearby shelters.</p>
        `;
        sheltersList.appendChild(info);
        // Show all shelters as fallback (optional)
        shelters.forEach(shelter => sheltersList.appendChild(createShelterCard(shelter)));
        return;
    }

    const nearbyShelters = shelters
        .map(shelter => ({
            ...shelter,
            distance: calculateDistance(userLocation.lat, userLocation.lng, shelter.lat, shelter.lng)
        }))
        .filter(s => s.distance <= currentDistanceFilter)
        .sort((a, b) => a.distance - b.distance);

    // Top: My Location summary
    const myLoc = document.createElement('div');
    myLoc.className = 'shelter-card';
    myLoc.innerHTML = `
        <div class="shelter-header">
            <div class="shelter-name">Your Location</div>
            <div class="shelter-status status-available">Active</div>
        </div>
        <div class="resource-info">
            <div class="resource-item"><div class="resource-level" id="cardUserCity">--</div><div class="resource-label">City</div></div>
            <div class="resource-item"><div class="resource-level" id="cardUserDistrict">--</div><div class="resource-label">District</div></div>
        </div>
    `;
    sheltersList.appendChild(myLoc);

    // Fill card with reverse geocoded values
    reverseGeocode(userLocation.lat, userLocation.lng)
        .then(addr => {
            const city = addr.city || addr.town || addr.village || '--';
            const district = addr.state_district || addr.county || addr.suburb || '--';
            const cityEl = document.getElementById('cardUserCity');
            const distEl = document.getElementById('cardUserDistrict');
            if (cityEl) cityEl.textContent = city;
            if (distEl) distEl.textContent = district;
        })
        .catch(() => {
            const cityEl = document.getElementById('cardUserCity');
            const distEl = document.getElementById('cardUserDistrict');
            if (cityEl) cityEl.textContent = '--';
            if (distEl) distEl.textContent = '--';
        });

    if (nearbyShelters.length === 0) {
        const none = document.createElement('div');
        none.className = 'shelter-card';
        none.innerHTML = '<p>No nearby shelters in current radius.</p>';
        sheltersList.appendChild(none);
        return;
    }

    nearbyShelters.forEach(shelter => sheltersList.appendChild(createShelterCard(shelter)));
}

function createShelterCard(shelter) {
    const shelterCard = document.createElement('div');
    shelterCard.className = 'shelter-card';
    shelterCard.innerHTML = `
        <div class="shelter-header">
            <div class="shelter-name">${shelter.name}</div>
            <div class="shelter-status ${shelter.status}">${shelter.status.toUpperCase()}</div>
        </div>
        <div class="resource-info">
            <div class="resource-item">
                <div class="resource-icon food-icon">
                    <i class="fas fa-utensils"></i>
                </div>
                <div class="resource-level">${shelter.foodLevel}%</div>
                <div class="resource-label">Food</div>
            </div>
            <div class="resource-item">
                <div class="resource-icon water-icon">
                    <i class="fas fa-tint"></i>
                </div>
                <div class="resource-level">${shelter.waterLevel}%</div>
                <div class="resource-label">Water</div>
            </div>
        </div>
        <div class="shelter-details">
            <div class="occupancy">
                <i class="fas fa-users occupancy-icon"></i>
                <span>${shelter.occupancy}/${shelter.maxCapacity} occupants</span>
            </div>
            <div class="contact-info">
                <button class="contact-btn call-btn" onclick="callShelter('${shelter.contact}')">
                    <i class="fas fa-phone"></i> Call
                </button>
                <button class="contact-btn directions-btn" onclick="getDirections(${shelter.lat}, ${shelter.lng})">
                    <i class="fas fa-directions"></i> Directions
                </button>
            </div>
        </div>
    `;
    return shelterCard;
}

function loadAlertsList() {
    const alertsList = document.getElementById('alertsList');
    alertsList.innerHTML = '';

    const alerts = [
        {
            type: 'critical',
            icon: 'fas fa-exclamation-triangle',
            title: 'Low Food Supply',
            message: 'North District Shelter running low on food supplies',
            time: '5 minutes ago',
            color: '#dc3545'
        },
        {
            type: 'warning',
            icon: 'fas fa-tint',
            title: 'Water Level Alert',
            message: 'South Community Center water level below 50%',
            time: '15 minutes ago',
            color: '#ffc107'
        },
        {
            type: 'info',
            icon: 'fas fa-check-circle',
            title: 'Supply Restocked',
            message: 'Central Relief Shelter food supplies replenished',
            time: '1 hour ago',
            color: '#28a745'
        }
    ];

    alerts.forEach(alert => {
        const alertItem = document.createElement('div');
        alertItem.className = 'alert-item';
        alertItem.innerHTML = `
            <div class="alert-icon" style="background: ${alert.color};">
                <i class="${alert.icon}"></i>
            </div>
            <div class="alert-content">
                <h4>${alert.title}</h4>
                <p>${alert.message}</p>
            </div>
            <div class="alert-time">${alert.time}</div>
        `;
        alertsList.appendChild(alertItem);
    });
}

function callShelter(phoneNumber) {
    alert(`Calling ${phoneNumber}...`);
}

function getDirections(lat, lng) {
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
}

function showAdminPanel() {
    alert('Admin panel would open here for system management');
}

// Location Functions
function getUserLocation() {
    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }

    const button = event.target.closest('.contact-btn');
    const originalText = button.innerHTML;
    
    // Show loading state
    button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
    button.disabled = true;

    navigator.geolocation.getCurrentPosition(
        function(position) {
            // Success callback
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            // Update location display
            updateLocationDisplay(userLocation);
            
            // Add user location marker to map
            addUserLocationToMap(userLocation);
            // Load weather for this location
            loadWeather(userLocation);
            
            // Show location info section
            document.getElementById('locationInfo').style.display = 'block';
            
            // Find nearby shelters
            findNearbyShelters();
            loadSheltersList();
            renderShelterMarkers();
            startWatchingLocation();
            
            // Reset button
            button.innerHTML = originalText;
            button.disabled = false;
            
            // Show success message
            showSuccessMessage('Location found successfully!');
        },
        function(error) {
            // Error callback
            let errorMessage = 'Unable to retrieve your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    break;
            }
            alert(errorMessage);
            
            // Reset button
            button.innerHTML = originalText;
            button.disabled = false;
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000 // 5 minutes
        }
    );
}

// Find Nearby: full My Location flow + filtering
function findNearby() {
    // If location already known, just refresh nearby and UI
    if (userLocation) {
        findNearbyShelters();
        loadSheltersList();
        renderShelterMarkers();
        return;
    }

    if (!navigator.geolocation) {
        alert('Geolocation is not supported by this browser.');
        return;
    }

    const button = document.getElementById('btnFindNearby') || event.target.closest('.contact-btn');
    const originalText = button ? button.innerHTML : '';
    if (button) {
        button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
        button.disabled = true;
    }

    navigator.geolocation.getCurrentPosition(
        function(position) {
            userLocation = {
                lat: position.coords.latitude,
                lng: position.coords.longitude,
                accuracy: position.coords.accuracy
            };

            updateLocationDisplay(userLocation);
            addUserLocationToMap(userLocation);
            loadWeather(userLocation);
            document.getElementById('locationInfo').style.display = 'block';

            // Start live updates like My Location
            startWatchingLocation();

            // Now compute nearby and refresh UI
            findNearbyShelters();
            loadSheltersList();
            renderShelterMarkers();

            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
            showSuccessMessage('Location found. Showing nearby shelters.');
        },
        function(error) {
            let errorMessage = 'Unable to retrieve your location. ';
            switch(error.code) {
                case error.PERMISSION_DENIED:
                    errorMessage += 'Please allow location access.';
                    break;
                case error.POSITION_UNAVAILABLE:
                    errorMessage += 'Location information is unavailable.';
                    break;
                case error.TIMEOUT:
                    errorMessage += 'Location request timed out.';
                    break;
                default:
                    errorMessage += 'An unknown error occurred.';
                    break;
            }
            alert(errorMessage);
            if (button) {
                button.innerHTML = originalText;
                button.disabled = false;
            }
        },
        {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 300000
        }
    );
}

function startWatchingLocation() {
    if (!navigator.geolocation) return;
    if (geoWatchId !== null) return; // already watching
    geoWatchId = navigator.geolocation.watchPosition(
        (pos) => {
            userLocation = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy
            };
            updateLocationDisplay(userLocation);
            addUserLocationToMap(userLocation);
            loadWeather(userLocation);
            findNearbyShelters();
            loadSheltersList();
            renderShelterMarkers();
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
    );
}

function updateLocationDisplay(location) {
    document.getElementById('locationAccuracy').textContent = Math.round(location.accuracy) + 'm';
    reverseGeocode(location.lat, location.lng)
        .then(addr => {
            const city = addr.city || addr.town || addr.village || '--';
            const district = addr.state_district || addr.county || addr.suburb || '--';
            document.getElementById('userCity').textContent = city;
            document.getElementById('userDistrict').textContent = district;
            // Also replace the header title text with City, District
            const titleEl = document.getElementById('locationTitleText');
            if (titleEl) {
                titleEl.textContent = `${city}, ${district}`;
            }
            // Load disaster news scoped to city/district
            loadDisasterNews(city, district);
        })
        .catch(() => {
            document.getElementById('userCity').textContent = '--';
            document.getElementById('userDistrict').textContent = '--';
            const titleEl = document.getElementById('locationTitleText');
            if (titleEl) {
                titleEl.textContent = 'Your Current Location';
            }
        });
}

function addUserLocationToMap(location) {
    // Remove existing user location marker
    if (userLocationMarker) {
        map.removeLayer(userLocationMarker);
    }

    // Add new user location marker
    userLocationMarker = L.circleMarker([location.lat, location.lng], {
        radius: 12,
        fillColor: '#dc3545',
        color: 'white',
        weight: 3,
        opacity: 1,
        fillOpacity: 0.8,
        className: 'user-location-marker'
    }).addTo(map);

    // Add popup
    userLocationMarker.bindPopup(`
        <div style="padding: 10px; text-align: center;">
            <h4 style="margin-bottom: 10px; color: #333;">
                <i class="fas fa-map-marker-alt" style="color: #dc3545;"></i> Your Location
            </h4>
            <p><strong>Latitude:</strong> ${location.lat.toFixed(6)}</p>
            <p><strong>Longitude:</strong> ${location.lng.toFixed(6)}</p>
            <p><strong>Accuracy:</strong> ${Math.round(location.accuracy)} meters</p>
            <button onclick="centerMapOnUser()" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; margin-top: 10px; cursor: pointer;">
                <i class="fas fa-crosshairs"></i> Center Map
            </button>
        </div>
    `).openPopup();

    // Center map on user location
    map.setView([location.lat, location.lng], 13);
}

function centerMapOnUser() {
    if (userLocation) {
        map.setView([userLocation.lat, userLocation.lng], 15);
        userLocationMarker.openPopup();
    }
}

function findNearbyShelters() {
    if (!userLocation) {
        // If user location is missing, try to get it automatically
        if (navigator.geolocation) {
            const originalBtn = document.querySelector('.header .contact-btn:nth-child(2)');
            if (originalBtn) {
                originalBtn.disabled = true;
                const prev = originalBtn.innerHTML;
                originalBtn.setAttribute('data-prev', prev);
                originalBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Getting Location...';
            }

            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    userLocation = {
                        lat: pos.coords.latitude,
                        lng: pos.coords.longitude,
                        accuracy: pos.coords.accuracy
                    };
                    updateLocationDisplay(userLocation);
                    addUserLocationToMap(userLocation);
                    loadWeather(userLocation);
                    document.getElementById('locationInfo').style.display = 'block';
                    // proceed with normal flow now that we have location
                    findNearbyShelters();
                    loadSheltersList();
                    renderShelterMarkers();

                    const btn = document.querySelector('.header .contact-btn:nth-child(2)');
                    if (btn) {
                        btn.innerHTML = btn.getAttribute('data-prev') || btn.innerHTML;
                        btn.disabled = false;
                    }
                },
                () => {
                    alert('Please allow location access to find nearby shelters.');
                    const btn = document.querySelector('.header .contact-btn:nth-child(2)');
                    if (btn) {
                        btn.innerHTML = btn.getAttribute('data-prev') || btn.innerHTML;
                        btn.disabled = false;
                    }
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
            );
        } else {
            alert('Geolocation is not supported by this browser.');
        }
        return;
    }

    const nearbyShelters = shelters
        .map(shelter => {
            const distance = calculateDistance(
                userLocation.lat, userLocation.lng,
                shelter.lat, shelter.lng
            );
            return { ...shelter, distance: distance };
        })
        .filter(shelter => shelter.distance <= currentDistanceFilter)
        .sort((a, b) => a.distance - b.distance);

    updateNearbySheltersDisplay(nearbyShelters);
    updateNearbySheltersCount(nearbyShelters.length);
}

function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; // Distance in kilometers
}

function updateNearbySheltersDisplay(nearbyShelters) {
    const nearbyList = document.getElementById('nearbySheltersList');
    nearbyList.innerHTML = '';

    if (nearbyShelters.length === 0) {
        nearbyList.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <i class="fas fa-search" style="font-size: 24px; margin-bottom: 10px;"></i>
                <p>No relief centers found within ${currentDistanceFilter}km</p>
                <p style="font-size: 12px;">Try increasing the distance filter</p>
            </div>
        `;
        return;
    }

    nearbyShelters.forEach(shelter => {
        const nearbyItem = document.createElement('div');
        nearbyItem.className = 'nearby-item';
        nearbyItem.innerHTML = `
            <div class="nearby-info">
                <h4>${shelter.name}</h4>
                <p>${shelter.occupancy}/${shelter.maxCapacity} occupants • ${shelter.status.charAt(0).toUpperCase() + shelter.status.slice(1)}</p>
                <p style="font-size: 12px; color: #999;">${shelter.contact}</p>
            </div>
            <div class="nearby-distance">
                <div class="distance-value">${shelter.distance.toFixed(1)}km</div>
                <div class="distance-label">Distance</div>
                <button onclick="getDirections(${shelter.lat}, ${shelter.lng})" style="background: #17a2b8; color: white; border: none; padding: 5px 10px; border-radius: 5px; margin-top: 5px; cursor: pointer; font-size: 10px;">
                    <i class="fas fa-directions"></i> Go
                </button>
            </div>
        `;
        nearbyList.appendChild(nearbyItem);
    });
}

function updateNearbySheltersCount(count) {
    document.getElementById('nearbySheltersCount').textContent = count;
}

function filterByDistance(distance) {
    currentDistanceFilter = distance;
    
    // Update active button
    document.querySelectorAll('.distance-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Update nearby shelters
    findNearbyShelters();
    loadSheltersList();
    renderShelterMarkers();
}

// Relief Camp Creation Functions
function showCreateCampForm() {
    document.getElementById('createCampModal').style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeCreateCampForm() {
    document.getElementById('createCampModal').style.display = 'none';
    document.body.style.overflow = 'auto';
    resetForm();
}

function selectUserType(type) {
    // Remove selected class from all cards
    document.querySelectorAll('.user-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selected class to clicked card
    document.getElementById(`${type}-card`).classList.add('selected');
    
    // Hide all professional detail sections
    document.getElementById('armyDetails').style.display = 'none';
    document.getElementById('governmentDetails').style.display = 'none';
    document.getElementById('ngoDetails').style.display = 'none';
    
    // Show relevant professional details section
    document.getElementById(`${type}Details`).style.display = 'block';
    
    // Update required fields based on user type
    updateRequiredFields(type);
}

function updateRequiredFields(type) {
    // Reset all required attributes
    const professionalInputs = document.querySelectorAll('#professionalSection input, #professionalSection select, #professionalSection textarea');
    professionalInputs.forEach(input => {
        input.removeAttribute('required');
    });
    
    // Add required attributes based on user type
    const requiredFields = {
        'army': ['rank', 'regiment', 'armyId', 'deployment'],
        'government': ['department', 'designation', 'employeeId', 'officeAddress'],
        'ngo': ['ngoName', 'ngoRegistration', 'position', 'ngoAddress']
    };
    
    if (requiredFields[type]) {
        requiredFields[type].forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.setAttribute('required', 'required');
            }
        });
    }
}

async function submitCampForm(event) {
    event.preventDefault();
    
    // Validate user type selection
    const selectedUserType = document.querySelector('.user-type-card.selected');
    if (!selectedUserType) {
        alert('Please select your user type (Army, Government, or NGO)');
        return;
    }
    
    // Get form data
    const formData = new FormData(event.target);
    const campData = {};
    
    // Convert FormData to object
    for (let [key, value] of formData.entries()) {
        if (key === 'amenities') {
            if (!campData.amenities) campData.amenities = [];
            campData.amenities.push(value);
        } else {
            campData[key] = value;
        }
    }
    
    // Add user type
    campData.userType = selectedUserType.id.replace('-card', '');
    
    // Validate required fields (district/city instead of lat/lng)
    if (!validateForm(campData)) {
        return;
    }

    // Geocode district + city to coordinates
    const geocodeTarget = `${campData.district || ''}, ${campData.city || ''}, India`.trim();
    let latLng = null;
    try {
        latLng = await geocodeToLatLng(geocodeTarget);
    } catch (e) {
        alert('Unable to locate that district/city. Please check the names.');
        return;
    }
    
    // Show loading state
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating...';
    submitBtn.disabled = true;
    
    // Simulate API call
    setTimeout(async () => {
        // Create new shelter object
        const newShelter = {
            id: shelters.length + 1,
            name: campData.campName,
            lat: latLng.lat,
            lng: latLng.lng,
            foodLevel: 100, // New camp starts with full supplies
            waterLevel: 100,
            occupancy: 0,
            maxCapacity: parseInt(campData.maxCapacity),
            status: "available",
            contact: campData.contactPhone,
            amenities: campData.amenities || [],
            createdBy: {
                name: `${campData.firstName} ${campData.lastName}`,
                type: campData.userType,
                email: campData.email,
                phone: campData.phone
            },
            professionalDetails: getProfessionalDetails(campData)
        };
        
        // Add to shelters array
        shelters.push(newShelter);
        
        // Update map
        addShelterToMap(newShelter);
        renderShelterMarkers();
        
        // Update statistics
        updateStatistics();
        
        // Persist to backend
        try {
            const resp = await fetch('http://localhost:8000/api/camps', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    campName: campData.campName,
                    campType: campData.campType,
                    maxCapacity: campData.maxCapacity,
                    contactPhone: campData.contactPhone,
                    campAddress: campData.campAddress,
                    district: campData.district,
                    city: campData.city,
                    amenities: newShelter.amenities,
                    lat: newShelter.lat,
                    lng: newShelter.lng,
                    createdBy: newShelter.createdBy
                })
            });
            if (!resp.ok) {
                console.warn('Failed to save camp to backend');
            }
        } catch(e) {
            console.warn('Error calling backend', e);
        }

        // Show success message
        showSuccessMessage('Relief camp created successfully!');
        
        // Close form
        closeCreateCampForm();
        
        // Reset button
        submitBtn.innerHTML = originalText;
        submitBtn.disabled = false;
        
    }, 2000);
}

function getProfessionalDetails(campData) {
    const userType = campData.userType;
    
    switch(userType) {
        case 'army':
            return {
                rank: campData.rank,
                regiment: campData.regiment,
                armyId: campData.armyId,
                deployment: campData.deployment
            };
        case 'government':
            return {
                department: campData.department,
                designation: campData.designation,
                employeeId: campData.employeeId,
                officeAddress: campData.officeAddress
            };
        case 'ngo':
            return {
                ngoName: campData.ngoName,
                registration: campData.ngoRegistration,
                position: campData.position,
                ngoAddress: campData.ngoAddress
            };
        default:
            return {};
    }
}

function validateForm(data) {
    const requiredFields = ['firstName', 'lastName', 'email', 'phone', 'campName', 'campType', 'maxCapacity', 'contactPhone', 'campAddress', 'district', 'city'];
    
    for (let field of requiredFields) {
        if (!data[field] || data[field].trim() === '') {
            alert(`Please fill in the ${field.replace(/([A-Z])/g, ' $1').toLowerCase()} field`);
            return false;
        }
    }
    
    // Coordinates are derived via geocoding
    // Validate amenities
    if (!data.amenities || data.amenities.length === 0) {
        alert('Please select at least one amenity');
        return false;
    }
    
    return true;
}

async function geocodeToLatLng(query) {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
    if (!res.ok) throw new Error('geocode_failed');
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) throw new Error('no_results');
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function reverseGeocode(lat, lng) {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
    if (!res.ok) throw new Error('reverse_geocode_failed');
    const data = await res.json();
    return data.address || {};
}

async function loadWeather(loc) {
    try {
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(loc.lat)}&longitude=${encodeURIComponent(loc.lng)}&current_weather=true&windspeed_unit=kmh`;
        const res = await fetch(url, { headers: { 'Accept': 'application/json' }});
        if (!res.ok) throw new Error('weather_failed');
        const data = await res.json();
        const current = data.current_weather || {};
        const temp = typeof current.temperature === 'number' ? `${Math.round(current.temperature)}°C` : '--°C';
        const wind = typeof current.windspeed === 'number' ? `${Math.round(current.windspeed)} km/h` : '-- km/h';

        const codeToSummary = (code) => {
            const map = {
                0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
                45: 'Fog', 48: 'Depositing rime fog',
                51: 'Light drizzle', 53: 'Moderate drizzle', 55: 'Dense drizzle',
                56: 'Freezing drizzle', 57: 'Freezing drizzle',
                61: 'Light rain', 63: 'Moderate rain', 65: 'Heavy rain',
                66: 'Freezing rain', 67: 'Freezing rain',
                71: 'Light snow', 73: 'Moderate snow', 75: 'Heavy snow',
                77: 'Snow grains',
                80: 'Rain showers', 81: 'Rain showers', 82: 'Heavy rain showers',
                85: 'Snow showers', 86: 'Heavy snow showers',
                95: 'Thunderstorm', 96: 'Thunderstorm w/ hail', 99: 'Thunderstorm w/ hail'
            };
            return map[code] || 'Weather';
        };

        const summary = codeToSummary(current.weathercode);

        const sEl = document.getElementById('weatherSummary');
        const lEl = document.getElementById('weatherLocation');
        const tEl = document.getElementById('weatherTemp');
        const wEl = document.getElementById('weatherWind');
        if (sEl) sEl.textContent = summary;
        if (lEl) lEl.textContent = (document.getElementById('locationTitleText')?.textContent) || '';
        if (tEl) tEl.textContent = temp;
        if (wEl) wEl.textContent = wind;
    } catch (_) {
        // fail silently
    }
}

async function loadDisasterNews(city, district) {
    try {
        const query = encodeURIComponent(`${city || ''} ${district || ''} flood OR cyclone OR earthquake OR landslide site:news`);
        const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=en-IN&gl=IN&ceid=IN:en`;
        const res = await fetch(rssUrl);
        if (!res.ok) throw new Error('news_failed');
        const xml = await res.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(xml, 'application/xml');
        const items = Array.from(doc.querySelectorAll('item')).slice(0, 5);

        const container = document.getElementById('disasterNews');
        if (!container) return;
        container.innerHTML = '';
        if (items.length === 0) {
            container.innerHTML = '<div style="color:#666;">No recent disaster news found.</div>';
            return;
        }
        items.forEach(item => {
            const title = item.querySelector('title')?.textContent || 'Untitled';
            const link = item.querySelector('link')?.textContent || '#';
            const pubDate = item.querySelector('pubDate')?.textContent || '';
            const date = pubDate ? new Date(pubDate).toLocaleString() : '';
            const div = document.createElement('div');
            div.className = 'alert-item';
            div.innerHTML = `
                <div class="alert-content">
                    <h4 style="margin:0 0 4px 0; font-size: 14px;"><a href="${link}" target="_blank" rel="noopener noreferrer">${title}</a></h4>
                    <p style="font-size:12px; color:#777; margin:0;">${date}</p>
                </div>
            `;
            container.appendChild(div);
        });
    } catch (_) {
        const container = document.getElementById('disasterNews');
        if (container) container.innerHTML = '<div style="color:#666;">Unable to load news right now.</div>';
    }
}

function addShelterToMap(shelter) {
    const marker = L.marker([shelter.lat, shelter.lng])
        .bindPopup(`
            <div style="padding: 10px;">
                <h3 style="margin-bottom: 10px; color: #333;">${shelter.name}</h3>
                <p><strong>Status:</strong> <span style="color: ${getStatusColor(shelter.status)}">${shelter.status.toUpperCase()}</span></p>
                <p><strong>Occupancy:</strong> ${shelter.occupancy}/${shelter.maxCapacity}</p>
                <p><strong>Food Level:</strong> ${shelter.foodLevel}%</p>
                <p><strong>Water Level:</strong> ${shelter.waterLevel}%</p>
                <p><strong>Contact:</strong> ${shelter.contact}</p>
                <p><strong>Created by:</strong> ${shelter.createdBy.name} (${shelter.createdBy.type})</p>
                <button onclick="callShelter('${shelter.contact}')" style="background: #28a745; color: white; border: none; padding: 5px 10px; border-radius: 5px; margin-top: 10px; cursor: pointer;">
                    <i class="fas fa-phone"></i> Call
                </button>
            </div>
        `)
        .addTo(map);

    // Customize marker
    const icon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background: ${getStatusColor(shelter.status)}; width: 20px; height: 20px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 5px rgba(0,0,0,0.3);"></div>`,
        iconSize: [20, 20],
        iconAnchor: [10, 10]
    });

    marker.setIcon(icon);
    shelterMarkers.push(marker);
}

function updateStatistics() {
    document.getElementById('totalShelters').textContent = shelters.length;
}

function showSuccessMessage(message) {
    const successDiv = document.createElement('div');
    successDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
        color: white;
        padding: 15px 20px;
        border-radius: 10px;
        box-shadow: 0 10px 25px rgba(40, 167, 69, 0.3);
        z-index: 3000;
        animation: slideInRight 0.3s ease-out;
    `;
    successDiv.innerHTML = `
        <i class="fas fa-check-circle"></i> ${message}
    `;
    
    document.body.appendChild(successDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        successDiv.remove();
    }, 3000);
}

function saveDraft() {
    // Get form data
    const formData = new FormData(document.getElementById('createCampForm'));
    const draftData = {};
    
    for (let [key, value] of formData.entries()) {
        draftData[key] = value;
    }
    
    // Save to localStorage
    localStorage.setItem('campDraft', JSON.stringify(draftData));
    
    showSuccessMessage('Draft saved successfully!');
}

function loadDraft() {
    const draft = localStorage.getItem('campDraft');
    if (draft) {
        const draftData = JSON.parse(draft);
        
        // Populate form fields
        Object.keys(draftData).forEach(key => {
            const field = document.getElementById(key);
            if (field) {
                field.value = draftData[key];
            }
        });
        
        // Handle checkboxes
        if (draftData.amenities) {
            const amenities = Array.isArray(draftData.amenities) ? draftData.amenities : [draftData.amenities];
            amenities.forEach(amenity => {
                const checkbox = document.querySelector(`input[name="amenities"][value="${amenity}"]`);
                if (checkbox) {
                    checkbox.checked = true;
                }
            });
        }
    }
}

function resetForm() {
    document.getElementById('createCampForm').reset();
    document.querySelectorAll('.user-type-card').forEach(card => {
        card.classList.remove('selected');
    });
    document.getElementById('armyDetails').style.display = 'none';
    document.getElementById('governmentDetails').style.display = 'none';
    document.getElementById('ngoDetails').style.display = 'none';
    localStorage.removeItem('campDraft');
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initMap();
    loadSheltersList();
    loadAlertsList();
    // Auto geolocate on load to populate city/district and nearby list
    setTimeout(() => {
        try {
            findNearby();
        } catch (_) {}
    }, 300);
    
    // Load critical alerts
    const criticalAlerts = document.getElementById('criticalAlerts');
    criticalAlerts.innerHTML = `
        <div class="alert-item">
            <div class="alert-icon" style="background: #dc3545;">
                <i class="fas fa-exclamation-triangle"></i>
            </div>
            <div class="alert-content">
                <h4>URGENT: North District Shelter</h4>
                <p>Food supplies critically low at 25%. Immediate restock required.</p>
            </div>
            <div class="alert-time">Just now</div>
        </div>
        <div class="alert-item">
            <div class="alert-icon" style="background: #ffc107;">
                <i class="fas fa-tint"></i>
            </div>
            <div class="alert-content">
                <h4>Water Level Warning</h4>
                <p>South Community Center water level below 50%. Schedule refill within 24 hours.</p>
            </div>
            <div class="alert-time">15 minutes ago</div>
        </div>
    `;

    // Simulate real-time updates
    setInterval(() => {
        // Update statistics with slight variations
        const foodStocks = document.getElementById('foodStocks');
        const waterStocks = document.getElementById('waterStocks');
        const totalOccupants = document.getElementById('totalOccupants');
        
        let currentFood = parseInt(foodStocks.textContent);
        let currentWater = parseInt(waterStocks.textContent);
        let currentOccupants = parseInt(totalOccupants.textContent.replace(',', ''));
        
        // Simulate small changes
        foodStocks.textContent = Math.max(0, Math.min(100, currentFood + (Math.random() - 0.5) * 2)) + '%';
        waterStocks.textContent = Math.max(0, Math.min(100, currentWater + (Math.random() - 0.5) * 1)) + '%';
        totalOccupants.textContent = (currentOccupants + Math.floor((Math.random() - 0.5) * 10)).toLocaleString();
    }, 30000); // Update every 30 seconds
});
