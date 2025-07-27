<?php
header('Content-Type: application/json');
require_once '../config/database.php';

try {
    // Get parameters
    $lat = isset($_GET['lat']) ? floatval($_GET['lat']) : null;
    $lng = isset($_GET['lng']) ? floatval($_GET['lng']) : null;
    $radius = isset($_GET['radius']) ? floatval($_GET['radius']) : 10;

    // Validate parameters
    if ($lat === null || $lng === null) {
        throw new Exception('Latitude and longitude are required');
    }

    // Get database instance
    $db = Database::getInstance();
    
    // Get nearby donations
    $donations = $db->getNearbyDonations($lat, $lng, $radius);

    if ($donations === false) {
        throw new Exception('Error fetching donations');
    }

    // Return success response
    echo json_encode([
        'status' => 'success',
        'data' => $donations
    ]);

} catch (Exception $e) {
    // Return error response
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => $e->getMessage()
    ]);
}
?> 