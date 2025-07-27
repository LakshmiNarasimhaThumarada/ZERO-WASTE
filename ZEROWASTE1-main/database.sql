-- Create the ZeroWaste database
CREATE DATABASE IF NOT EXISTS zerowaste;
USE zerowaste;

-- Users table to store both donors and receivers
CREATE TABLE users (
    user_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(50) NOT NULL UNIQUE,
    email VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    user_type ENUM('donor', 'receiver', 'admin') NOT NULL,
    address TEXT NOT NULL,
    latitude DECIMAL(10, 8),
    longitude DECIMAL(11, 8),
    profile_image VARCHAR(255),
    organization_name VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_verified BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE
);

-- Food Categories table
CREATE TABLE food_categories (
    category_id INT PRIMARY KEY AUTO_INCREMENT,
    category_name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Donations table
CREATE TABLE donations (
    donation_id INT PRIMARY KEY AUTO_INCREMENT,
    donor_id INT NOT NULL,
    status ENUM('available', 'reserved', 'picked_up', 'expired', 'cancelled') NOT NULL DEFAULT 'available',
    pickup_address TEXT NOT NULL,
    latitude DECIMAL(10, 8) NOT NULL,
    longitude DECIMAL(11, 8) NOT NULL,
    pickup_instructions TEXT,
    expiry_date DATETIME NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donor_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Food Items table (for items within a donation)
CREATE TABLE food_items (
    item_id INT PRIMARY KEY AUTO_INCREMENT,
    donation_id INT NOT NULL,
    category_id INT NOT NULL,
    item_name VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    quantity_unit VARCHAR(20) NOT NULL,
    description TEXT,
    dietary_info VARCHAR(255),
    storage_instructions TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES food_categories(category_id)
);

-- Pickup Requests table
CREATE TABLE pickup_requests (
    request_id INT PRIMARY KEY AUTO_INCREMENT,
    donation_id INT NOT NULL,
    receiver_id INT NOT NULL,
    status ENUM('pending', 'approved', 'rejected', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
    pickup_time DATETIME,
    actual_pickup_time DATETIME,
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Ratings and Reviews table
CREATE TABLE ratings (
    rating_id INT PRIMARY KEY AUTO_INCREMENT,
    donation_id INT NOT NULL,
    reviewer_id INT NOT NULL,
    reviewed_user_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (donation_id) REFERENCES donations(donation_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewer_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (reviewed_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Notifications table
CREATE TABLE notifications (
    notification_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    title VARCHAR(100) NOT NULL,
    message TEXT NOT NULL,
    type ENUM('donation', 'pickup', 'system', 'rating') NOT NULL,
    reference_id INT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- User Preferences table
CREATE TABLE user_preferences (
    preference_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL UNIQUE,
    notification_radius DECIMAL(5,2) DEFAULT 10.0, -- in kilometers
    email_notifications BOOLEAN DEFAULT TRUE,
    push_notifications BOOLEAN DEFAULT TRUE,
    preferred_categories TEXT, -- Stored as JSON array of category_ids
    dietary_preferences TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Insert some sample food categories
INSERT INTO food_categories (category_name, description) VALUES
('Grains', 'Rice, wheat, bread, and other grain-based foods'),
('Vegetables', 'Fresh vegetables and greens'),
('Fruits', 'Fresh fruits and dried fruits'),
('Dairy', 'Milk, cheese, and other dairy products'),
('Prepared Meals', 'Ready-to-eat prepared meals'),
('Canned Foods', 'Preserved and canned food items'),
('Beverages', 'Non-alcoholic drinks and beverages'),
('Snacks', 'Light snacks and packaged foods');

-- Create indexes for better query performance
CREATE INDEX idx_donations_status ON donations(status);
CREATE INDEX idx_donations_location ON donations(latitude, longitude);
CREATE INDEX idx_donations_expiry ON donations(expiry_date);
CREATE INDEX idx_pickup_requests_status ON pickup_requests(status);
CREATE INDEX idx_users_location ON users(latitude, longitude);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);

-- Create a view for active donations with their details
CREATE VIEW active_donations_view AS
SELECT 
    d.donation_id,
    d.status,
    d.pickup_address,
    d.latitude,
    d.longitude,
    d.expiry_date,
    u.full_name AS donor_name,
    u.organization_name,
    u.phone_number,
    GROUP_CONCAT(DISTINCT fi.item_name) AS food_items,
    COUNT(DISTINCT pr.request_id) AS request_count
FROM donations d
JOIN users u ON d.donor_id = u.user_id
LEFT JOIN food_items fi ON d.donation_id = fi.donation_id
LEFT JOIN pickup_requests pr ON d.donation_id = pr.donation_id
WHERE d.status = 'available' 
    AND d.expiry_date > NOW()
GROUP BY d.donation_id; 

-- Find nearby available donations
SELECT * FROM active_donations_view 
WHERE status = 'available' 
AND (
    6371 * acos(
        cos(radians(@user_lat)) * cos(radians(latitude)) * 
        cos(radians(longitude) - radians(@user_lng)) + 
        sin(radians(@user_lat)) * sin(radians(latitude))
    )
) <= @radius_km;

-- Get user's donation history
SELECT d.*, COUNT(pr.request_id) as request_count 
FROM donations d 
LEFT JOIN pickup_requests pr ON d.donation_id = pr.donation_id 
WHERE d.donor_id = @user_id 
GROUP BY d.donation_id;

-- Get active pickup requests
SELECT pr.*, d.*, u.full_name as donor_name 
FROM pickup_requests pr 
JOIN donations d ON pr.donation_id = d.donation_id 
JOIN users u ON d.donor_id = u.user_id 
WHERE pr.receiver_id = @user_id AND pr.status = 'pending'; 