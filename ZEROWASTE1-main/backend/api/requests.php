<?php
require_once 'base.php';

class RequestsAPI extends BaseAPI {
    public function __construct() {
        parent::__construct();
    }

    public function createRequest() {
        try {
            $this->validateToken();
            $data = $this->getRequestBody();

            // Check if donation is available
            $checkQuery = "SELECT status FROM donations WHERE donation_id = :donation_id";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(":donation_id", $data['donation_id']);
            $checkStmt->execute();
            
            $donation = $checkStmt->fetch();
            if (!$donation || $donation['status'] !== 'available') {
                $this->handleError("Donation is not available", 400);
                return;
            }

            // Start transaction
            $this->conn->beginTransaction();

            // Create request
            $query = "INSERT INTO pickup_requests 
                     (donation_id, receiver_id, pickup_time)
                     VALUES 
                     (:donation_id, :receiver_id, :pickup_time)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":donation_id", $data['donation_id']);
            $stmt->bindParam(":receiver_id", $data['receiver_id']);
            $stmt->bindParam(":pickup_time", $data['pickup_time']);

            if ($stmt->execute()) {
                // Update donation status
                $updateQuery = "UPDATE donations SET status = 'reserved' WHERE donation_id = :donation_id";
                $updateStmt = $this->conn->prepare($updateQuery);
                $updateStmt->bindParam(":donation_id", $data['donation_id']);
                $updateStmt->execute();

                $this->conn->commit();
                $this->sendResponse(["message" => "Pickup request created successfully"], 201);
            } else {
                $this->conn->rollBack();
                $this->handleError("Unable to create pickup request");
            }
        } catch (PDOException $e) {
            $this->conn->rollBack();
            $this->handleError("Error creating pickup request: " . $e->getMessage());
        }
    }

    public function updateRequestStatus($request_id) {
        try {
            $this->validateToken();
            $data = $this->getRequestBody();

            // Start transaction
            $this->conn->beginTransaction();

            // Update request status
            $query = "UPDATE pickup_requests SET status = :status WHERE request_id = :request_id";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":status", $data['status']);
            $stmt->bindParam(":request_id", $request_id);

            if ($stmt->execute()) {
                // If request is completed, update donation status
                if ($data['status'] === 'completed') {
                    $updateQuery = "UPDATE donations d 
                                  JOIN pickup_requests r ON d.donation_id = r.donation_id 
                                  SET d.status = 'collected' 
                                  WHERE r.request_id = :request_id";
                    $updateStmt = $this->conn->prepare($updateQuery);
                    $updateStmt->bindParam(":request_id", $request_id);
                    $updateStmt->execute();
                }

                $this->conn->commit();
                $this->sendResponse(["message" => "Request status updated successfully"]);
            } else {
                $this->conn->rollBack();
                $this->handleError("Unable to update request status");
            }
        } catch (PDOException $e) {
            $this->conn->rollBack();
            $this->handleError("Error updating request status: " . $e->getMessage());
        }
    }

    public function getUserRequests($user_id) {
        try {
            $this->validateToken();

            $query = "SELECT r.*, d.food_items, d.quantity, d.expiry_date, d.address,
                     u.username as donor_name, u.phone as donor_phone
                     FROM pickup_requests r
                     JOIN donations d ON r.donation_id = d.donation_id
                     JOIN users u ON d.donor_id = u.user_id
                     WHERE r.receiver_id = :user_id
                     ORDER BY r.created_at DESC";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":user_id", $user_id);
            $stmt->execute();

            $requests = $stmt->fetchAll();
            $this->sendResponse($requests);
        } catch (PDOException $e) {
            $this->handleError("Error fetching requests: " . $e->getMessage());
        }
    }
}

// Handle requests
$api = new RequestsAPI();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        $api->createRequest();
        break;
    case 'PUT':
        if (isset($_GET['id'])) {
            $api->updateRequestStatus($_GET['id']);
        }
        break;
    case 'GET':
        if (isset($_GET['user_id'])) {
            $api->getUserRequests($_GET['user_id']);
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed"]);
        break;
}
?> 