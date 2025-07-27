<?php
require_once 'base.php';

class DonationsAPI extends BaseAPI {
    public function __construct() {
        parent::__construct();
    }

    public function getNearbyDonations($lat, $lng, $radius = 5) {
        try {
            $query = "SELECT d.*, u.username as donor_name, u.phone as donor_phone,
                     (6371 * acos(cos(radians(:lat)) * cos(radians(latitude)) * 
                     cos(radians(longitude) - radians(:lng)) + 
                     sin(radians(:lat)) * sin(radians(latitude)))) AS distance
                     FROM donations d
                     JOIN users u ON d.donor_id = u.user_id
                     WHERE d.status = 'available'
                     HAVING distance <= :radius
                     ORDER BY distance ASC";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":lat", $lat);
            $stmt->bindParam(":lng", $lng);
            $stmt->bindParam(":radius", $radius);
            $stmt->execute();

            $donations = $stmt->fetchAll();
            $this->sendResponse($donations);
        } catch (PDOException $e) {
            $this->handleError("Error fetching donations: " . $e->getMessage());
        }
    }

    public function createDonation() {
        try {
            $this->validateToken();
            $data = $this->getRequestBody();

            $query = "INSERT INTO donations 
                     (donor_id, food_items, quantity, expiry_date, latitude, longitude, address)
                     VALUES 
                     (:donor_id, :food_items, :quantity, :expiry_date, :latitude, :longitude, :address)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":donor_id", $data['donor_id']);
            $stmt->bindParam(":food_items", $data['food_items']);
            $stmt->bindParam(":quantity", $data['quantity']);
            $stmt->bindParam(":expiry_date", $data['expiry_date']);
            $stmt->bindParam(":latitude", $data['latitude']);
            $stmt->bindParam(":longitude", $data['longitude']);
            $stmt->bindParam(":address", $data['address']);

            if ($stmt->execute()) {
                $this->sendResponse(["message" => "Donation created successfully"], 201);
            } else {
                $this->handleError("Unable to create donation");
            }
        } catch (PDOException $e) {
            $this->handleError("Error creating donation: " . $e->getMessage());
        }
    }

    public function updateDonationStatus($donation_id) {
        try {
            $this->validateToken();
            $data = $this->getRequestBody();

            $query = "UPDATE donations SET status = :status WHERE donation_id = :donation_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":status", $data['status']);
            $stmt->bindParam(":donation_id", $donation_id);

            if ($stmt->execute()) {
                $this->sendResponse(["message" => "Donation status updated successfully"]);
            } else {
                $this->handleError("Unable to update donation status");
            }
        } catch (PDOException $e) {
            $this->handleError("Error updating donation status: " . $e->getMessage());
        }
    }
}

// Handle requests
$api = new DonationsAPI();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        if (isset($_GET['lat']) && isset($_GET['lng'])) {
            $radius = isset($_GET['radius']) ? $_GET['radius'] : 5;
            $api->getNearbyDonations($_GET['lat'], $_GET['lng'], $radius);
        }
        break;
    case 'POST':
        $api->createDonation();
        break;
    case 'PUT':
        if (isset($_GET['id'])) {
            $api->updateDonationStatus($_GET['id']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed"]);
        break;
}
?> 