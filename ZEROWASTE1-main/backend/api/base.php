<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST, GET, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

require_once '../../config/database.php';

class BaseAPI {
    protected $db;
    protected $conn;

    public function __construct() {
        $database = new Database();
        $this->db = $database;
        $this->conn = $database->getConnection();
    }

    protected function validateToken() {
        $headers = getallheaders();
        if (!isset($headers['Authorization'])) {
            http_response_code(401);
            echo json_encode(["message" => "Access denied. No token provided."]);
            exit();
        }

        $token = str_replace('Bearer ', '', $headers['Authorization']);
        // Add your token validation logic here
        return true;
    }

    protected function getRequestBody() {
        return json_decode(file_get_contents("php://input"), true);
    }

    protected function sendResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
    }

    protected function handleError($message, $status = 400) {
        http_response_code($status);
        echo json_encode(["message" => $message]);
    }
}
?> 