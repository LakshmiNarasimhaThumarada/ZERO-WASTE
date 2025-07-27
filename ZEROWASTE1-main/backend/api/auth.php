<?php
require_once 'base.php';

class AuthAPI extends BaseAPI {
    public function __construct() {
        parent::__construct();
    }

    public function register() {
        try {
            $data = $this->getRequestBody();

            // Validate input
            if (empty($data['username']) || empty($data['password']) || empty($data['email'])) {
                $this->handleError("Missing required fields", 400);
                return;
            }

            // Check if username or email already exists
            $checkQuery = "SELECT user_id FROM users WHERE username = :username OR email = :email";
            $checkStmt = $this->conn->prepare($checkQuery);
            $checkStmt->bindParam(":username", $data['username']);
            $checkStmt->bindParam(":email", $data['email']);
            $checkStmt->execute();

            if ($checkStmt->rowCount() > 0) {
                $this->handleError("Username or email already exists", 400);
                return;
            }

            // Hash password
            $hashedPassword = password_hash($data['password'], PASSWORD_DEFAULT);

            // Insert new user
            $query = "INSERT INTO users (username, password, email, phone, role)
                     VALUES (:username, :password, :email, :phone, :role)";

            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":username", $data['username']);
            $stmt->bindParam(":password", $hashedPassword);
            $stmt->bindParam(":email", $data['email']);
            $stmt->bindParam(":phone", $data['phone']);
            $stmt->bindParam(":role", $data['role']);

            if ($stmt->execute()) {
                $this->sendResponse(["message" => "User registered successfully"], 201);
            } else {
                $this->handleError("Unable to register user");
            }
        } catch (PDOException $e) {
            $this->handleError("Error registering user: " . $e->getMessage());
        }
    }

    public function login() {
        try {
            $data = $this->getRequestBody();

            // Validate input
            if (empty($data['username']) || empty($data['password'])) {
                $this->handleError("Missing username or password", 400);
                return;
            }

            // Get user
            $query = "SELECT user_id, username, password, role FROM users WHERE username = :username";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":username", $data['username']);
            $stmt->execute();

            if ($stmt->rowCount() === 0) {
                $this->handleError("Invalid username or password", 401);
                return;
            }

            $user = $stmt->fetch();

            // Verify password
            if (!password_verify($data['password'], $user['password'])) {
                $this->handleError("Invalid username or password", 401);
                return;
            }

            // Generate token (in a real application, use JWT or similar)
            $token = bin2hex(random_bytes(32));

            // Store token in database (in a real application, use a separate table for tokens)
            $updateQuery = "UPDATE users SET token = :token WHERE user_id = :user_id";
            $updateStmt = $this->conn->prepare($updateQuery);
            $updateStmt->bindParam(":token", $token);
            $updateStmt->bindParam(":user_id", $user['user_id']);
            $updateStmt->execute();

            // Return user data and token
            $this->sendResponse([
                "user_id" => $user['user_id'],
                "username" => $user['username'],
                "role" => $user['role'],
                "token" => $token
            ]);
        } catch (PDOException $e) {
            $this->handleError("Error logging in: " . $e->getMessage());
        }
    }

    public function logout() {
        try {
            $this->validateToken();
            $headers = getallheaders();
            $token = str_replace('Bearer ', '', $headers['Authorization']);

            // Clear token from database
            $query = "UPDATE users SET token = NULL WHERE token = :token";
            $stmt = $this->conn->prepare($query);
            $stmt->bindParam(":token", $token);
            $stmt->execute();

            $this->sendResponse(["message" => "Logged out successfully"]);
        } catch (PDOException $e) {
            $this->handleError("Error logging out: " . $e->getMessage());
        }
    }
}

// Handle requests
$api = new AuthAPI();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'POST':
        if (isset($_GET['action'])) {
            switch ($_GET['action']) {
                case 'register':
                    $api->register();
                    break;
                case 'login':
                    $api->login();
                    break;
                case 'logout':
                    $api->logout();
                    break;
                default:
                    http_response_code(400);
                    echo json_encode(["message" => "Invalid action"]);
                    break;
            }
        }
        break;
    default:
        http_response_code(405);
        echo json_encode(["message" => "Method not allowed"]);
        break;
}
?> 