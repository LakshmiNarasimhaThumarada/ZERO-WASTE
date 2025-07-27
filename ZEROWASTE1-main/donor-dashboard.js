document.addEventListener('DOMContentLoaded', function() {
    // Load and display user info from session
    const userInfo = JSON.parse(sessionStorage.getItem('userInfo'));
    if (userInfo) {
        document.querySelector('.user-name').textContent = userInfo.name;
        document.querySelector('.user-email').textContent = userInfo.email;
        document.querySelector('.user-avatar').src = userInfo.avatar;
    }

    // Handle image upload and preview
    const imageInput = document.getElementById('foodImage');
    const imagePreview = document.getElementById('imagePreview');
    const estimateValue = document.getElementById('estimateValue');

    imageInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                imagePreview.innerHTML = `<img src="${e.target.result}" alt="Food preview">`;
                // Simulate AI estimation (placeholder)
                setTimeout(() => {
                    estimateValue.textContent = 'Approximately 20-25 servings';
                }, 1000);
            };
            reader.readAsDataURL(file);
        }
    });

    // Handle geolocation
    const locationButton = document.getElementById('getLocation');
    const locationInput = document.getElementById('location');
    const locationStatus = document.getElementById('locationStatus');

    locationButton.addEventListener('click', function() {
        if (navigator.geolocation) {
            locationStatus.textContent = 'Fetching location...';
            locationStatus.style.color = '#666';

            navigator.geolocation.getCurrentPosition(
                function(position) {
                    const latitude = position.coords.latitude;
                    const longitude = position.coords.longitude;
                    
                    // Here you would typically use a geocoding service to get the address
                    // For demo purposes, we'll just show coordinates
                    locationInput.value = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
                    locationStatus.textContent = 'Location fetched successfully!';
                    locationStatus.style.color = 'green';
                },
                function(error) {
                    let errorMessage = 'Error fetching location: ';
                    switch(error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += 'Permission denied';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += 'Position unavailable';
                            break;
                        case error.TIMEOUT:
                            errorMessage += 'Request timed out';
                            break;
                        default:
                            errorMessage += 'Unknown error';
                    }
                    locationStatus.textContent = errorMessage;
                    locationStatus.style.color = 'red';
                }
            );
        } else {
            locationStatus.textContent = 'Geolocation is not supported by your browser';
            locationStatus.style.color = 'red';
        }
    });

    // Handle form submission
    const foodPostForm = document.getElementById('foodPostForm');
    foodPostForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Gather form data
        const formData = {
            image: imageInput.files[0],
            quantity: document.getElementById('quantity').value,
            foodType: document.querySelector('input[name="foodType"]:checked').value,
            storageType: document.querySelector('input[name="storageType"]:checked').value,
            expiryTime: document.getElementById('expiryTime').value,
            location: locationInput.value
        };

        // Here you would typically send this data to your server
        console.log('Form submitted with data:', formData);

        // Add a new donation card to the tracker (for demo purposes)
        addDonationCard(formData);

        // Reset form
        foodPostForm.reset();
        imagePreview.innerHTML = '';
        estimateValue.textContent = 'Waiting for image...';
    });

    // Function to add a new donation card
    function addDonationCard(data) {
        const donationCards = document.querySelector('.donation-cards');
        const newCard = document.createElement('div');
        newCard.className = 'donation-card';
        
        const imageUrl = data.image ? URL.createObjectURL(data.image) : 'https://via.placeholder.com/150';
        
        newCard.innerHTML = `
            <div class="donation-image">
                <img src="${imageUrl}" alt="Food donation">
            </div>
            <div class="donation-details">
                <h3>${data.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'} Meals</h3>
                <p><i class="fas fa-utensils"></i> ${data.quantity} servings</p>
                <p><i class="fas fa-clock"></i> Pickup by ${new Date(data.expiryTime).toLocaleString()}</p>
            </div>
            <div class="donation-progress">
                <div class="progress-steps">
                    <div class="step active">
                        <i class="fas fa-hourglass-start"></i>
                        <span>Pending</span>
                    </div>
                    <div class="step">
                        <i class="fas fa-check-circle"></i>
                        <span>Accepted</span>
                    </div>
                    <div class="step">
                        <i class="fas fa-truck"></i>
                        <span>Picked</span>
                    </div>
                    <div class="step">
                        <i class="fas fa-clipboard-check"></i>
                        <span>Verified</span>
                    </div>
                </div>
            </div>
        `;

        // Add the new card at the beginning of the list
        donationCards.insertBefore(newCard, donationCards.firstChild);
    }
}); 