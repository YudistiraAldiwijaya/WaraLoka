<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'message' => 'Anda harus login untuk menghapus cerita.'], 401);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Metode tidak diizinkan'], 405);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

$story_id = $data['story_id'] ?? null;

if (!$story_id || !is_numeric($story_id)) {
    jsonResponse(['success' => false, 'message' => 'ID cerita tidak valid.'], 400);
    exit();
}

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Verifikasi kepemilikan cerita dan ambil nama foto (jika ada)
    $stmt = $pdo->prepare("SELECT user_id, photo FROM stories WHERE id = :story_id");
    $stmt->execute([':story_id' => $story_id]);
    $story_data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$story_data) {
        jsonResponse(['success' => false, 'message' => 'Cerita tidak ditemukan.'], 404);
        exit();
    }

    if ($story_data['user_id'] !== $user_id) {
        jsonResponse(['success' => false, 'message' => 'Anda tidak memiliki izin untuk menghapus cerita ini.'], 403);
        exit();
    }

    // Hapus file foto terkait jika ada
    if ($story_data['photo']) {
        $photoPath = 'uploads/' . $story_data['photo'];
        if (file_exists($photoPath)) {
            unlink($photoPath);
        }
    }

    // Hapus cerita dari database
    $sql = "DELETE FROM stories WHERE id = :story_id AND user_id = :user_id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':story_id' => $story_id, ':user_id' => $user_id]);

    if ($stmt->rowCount() > 0) {
        jsonResponse(['success' => true, 'message' => 'Cerita berhasil dihapus.']);
    } else {
        jsonResponse(['success' => false, 'message' => 'Gagal menghapus cerita atau cerita sudah tidak ada.'], 404);
    }

} catch (PDOException $e) {
    error_log("Kesalahan database di delete_story.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan database saat menghapus cerita.'], 500);
} catch (Exception $e) {
    error_log("Kesalahan di delete_story.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server saat menghapus cerita.'], 500);
}
?>
