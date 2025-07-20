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

    $query = sanitizeInput($_GET['query'] ?? '');

    if (empty($query)) {
        jsonResponse(['success' => true, 'suggestions' => []]);
    }

    $searchTerm = '%' . $query . '%';

    // Query untuk mendapatkan saran dari judul cerita dan nama lokasi
    $sql = "
        (SELECT DISTINCT title AS text_suggestion FROM stories WHERE title LIKE :searchTerm1)
        UNION
        (SELECT DISTINCT name AS text_suggestion FROM locations WHERE name LIKE :searchTerm2)
        ORDER BY text_suggestion
        LIMIT 10";

    $stmt = $pdo->prepare($sql);
    $stmt->bindValue(':searchTerm1', $searchTerm);
    $stmt->bindValue(':searchTerm2', $searchTerm);
    $stmt->execute();

    $suggestions = $stmt->fetchAll(PDO::FETCH_COLUMN, 0);

    jsonResponse(['success' => true, 'suggestions' => $suggestions]);

} catch (Exception $e) {
    error_log("Kesalahan di get_suggestions.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan saat mengambil saran.'], 500);
}
?>
