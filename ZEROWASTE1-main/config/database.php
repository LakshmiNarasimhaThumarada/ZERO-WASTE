<?php
// Database configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'zerowaste_user');
define('DB_PASS', 'your_secure_password');
define('DB_NAME', 'zerowaste');

// Create database connection class
class Database {
    private $connection;
    private static $instance = null;

    private function __construct() {
        try {
            $this->connection = new PDO(
                "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
                DB_USER,
                DB_PASS,
                array(
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8"
                )
            );
        } catch(PDOException $e) {
            die("Connection failed: " . $e->getMessage());
        }
    }

    // Get database instance (Singleton pattern)
    public static function getInstance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    // Get database connection
    public function getConnection() {
        return $this->connection;
    }

    // Helper function to get nearby donations
    public function getNearbyDonations($lat, $lng, $radius = 10) {
        try {
            $query = "SELECT *, 
                        (6371 * acos(
                            cos(radians(:lat)) * cos(radians(latitude)) * 
                            cos(radians(longitude) - radians(:lng)) + 
                            sin(radians(:lat)) * sin(radians(latitude))
                        )) AS distance 
                     FROM active_donations_view 
                     HAVING distance <= :radius 
                     ORDER BY distance";

            $stmt = $this->connection->prepare($query);
            $stmt->bindParam(':lat', $lat, PDO::PARAM_STR);
            $stmt->bindParam(':lng', $lng, PDO::PARAM_STR);
            $stmt->bindParam(':radius', $radius, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll();
        } catch(PDOException $e) {
            error_log("Error getting nearby donations: " . $e->getMessage());
            return false;
        }
    }

    // Helper function to create a new donation
    public function createDonation($donorId, $data) {
        try {
            $this->connection->beginTransaction();

            // Insert donation
            $query = "INSERT INTO donations (donor_id, pickup_address, latitude, longitude, 
                        pickup_instructions, expiry_date) 
                     VALUES (:donor_id, :address, :lat, :lng, :instructions, :expiry)";

            $stmt = $this->connection->prepare($query);
            $stmt->execute([
                ':donor_id' => $donorId,
                ':address' => $data['address'],
                ':lat' => $data['latitude'],
                ':lng' => $data['longitude'],
                ':instructions' => $data['instructions'],
                ':expiry' => $data['expiry_date']
            ]);

            $donationId = $this->connection->lastInsertId();

            // Insert food items
            foreach ($data['items'] as $item) {
                $query = "INSERT INTO food_items (donation_id, category_id, item_name, 
                            quantity, quantity_unit, description, dietary_info) 
                         VALUES (:donation_id, :category_id, :name, :quantity, 
                            :unit, :description, :dietary_info)";

                $stmt = $this->connection->prepare($query);
                $stmt->execute([
                    ':donation_id' => $donationId,
                    ':category_id' => $item['category_id'],
                    ':name' => $item['name'],
                    ':quantity' => $item['quantity'],
                    ':unit' => $item['unit'],
                    ':description' => $item['description'],
                    ':dietary_info' => $item['dietary_info']
                ]);
            }

            $this->connection->commit();
            return $donationId;
        } catch(PDOException $e) {
            $this->connection->rollBack();
            error_log("Error creating donation: " . $e->getMessage());
            return false;
        }
    }

    // Helper function to create pickup request
    public function createPickupRequest($receiverId, $donationId, $pickupTime) {
        try {
            $query = "INSERT INTO pickup_requests (donation_id, receiver_id, pickup_time) 
                     VALUES (:donation_id, :receiver_id, :pickup_time)";

            $stmt = $this->connection->prepare($query);
            $stmt->execute([
                ':donation_id' => $donationId,
                ':receiver_id' => $receiverId,
                ':pickup_time' => $pickupTime
            ]);

            return $this->connection->lastInsertId();
        } catch(PDOException $e) {
            error_log("Error creating pickup request: " . $e->getMessage());
            return false;
        }
    }

    // Helper function to get user's donations/requests
    public function getUserDonations($userId, $userType = 'donor') {
        try {
            if ($userType === 'donor') {
                $query = "SELECT d.*, COUNT(pr.request_id) as request_count 
                         FROM donations d 
                         LEFT JOIN pickup_requests pr ON d.donation_id = pr.donation_id 
                         WHERE d.donor_id = :user_id 
                         GROUP BY d.donation_id 
                         ORDER BY d.created_at DESC";
            } else {
                $query = "SELECT pr.*, d.*, u.full_name as donor_name 
                         FROM pickup_requests pr 
                         JOIN donations d ON pr.donation_id = d.donation_id 
                         JOIN users u ON d.donor_id = u.user_id 
                         WHERE pr.receiver_id = :user_id 
                         ORDER BY pr.created_at DESC";
            }

            $stmt = $this->connection->prepare($query);
            $stmt->bindParam(':user_id', $userId, PDO::PARAM_INT);
            $stmt->execute();

            return $stmt->fetchAll();
        } catch(PDOException $e) {
            error_log("Error getting user donations: " . $e->getMessage());
            return false;
        }
    }
}
?> 