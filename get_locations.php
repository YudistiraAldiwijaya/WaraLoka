<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Ambil semua cerita beserta koordinat lokasi
    $sql = "SELECT
                s.id,
                s.title,
                s.location,
                l.latitude,
                l.longitude
            FROM stories s
            JOIN locations l ON s.location = l.name
            WHERE l.latitude IS NOT NULL AND l.longitude IS NOT NULL";

    $stmt = $pdo->prepare($sql);
    $stmt->execute();

    $locations = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse([
        'success' => true,
        'locations' => $locations
    ]);

} catch (Exception $e) {
    error_log("Kesalahan di get_locations.php: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Terjadi kesalahan saat mengambil data lokasi.'
    ], 500);
}
?>
