<?php
session_start();
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');

// Pengecekan otentikasi: Hanya izinkan jika user_id ada di sesi
if (!isset($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'message' => 'Anda harus login untuk mengirim cerita.'], 401);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Metode tidak diizinkan'], 405);
}

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Ambil user_id dari sesi
    $userId = $_SESSION['user_id'];

    // Validasi kolom yang wajib diisi
    $title = sanitizeInput($_POST['title'] ?? '');
    $content = sanitizeInput($_POST['content'] ?? '');
    $location = sanitizeInput($_POST['location'] ?? '');

    if (empty($title) || empty($content) || empty($location)) {
        jsonResponse([
            'success' => false,
            'message' => 'Semua field wajib diisi'
        ], 400);
    }

    // Tangani unggahan file
    $photoName = null;
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        $uploadDir = 'uploads/';

        // Buat direktori unggahan jika belum ada
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileInfo = pathinfo($_FILES['photo']['name']);
        $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];

        if (!in_array(strtolower($fileInfo['extension']), $allowedTypes)) {
            jsonResponse([
                'success' => false,
                'message' => 'Format file tidak didukung. Gunakan JPG, PNG, atau GIF'
            ], 400);
        }

        // Periksa ukuran file (maks 5MB)
        if ($_FILES['photo']['size'] > 5 * 1024 * 1024) {
            jsonResponse([
                'success' => false,
                'message' => 'Ukuran file terlalu besar. Maksimal 5MB'
            ], 400);
        }

        $photoName = uniqid() . '.' . $fileInfo['extension'];
        $uploadPath = $uploadDir . $photoName;

        if (!move_uploaded_file($_FILES['photo']['tmp_name'], $uploadPath)) {
            jsonResponse([
                'success' => false,
                'message' => 'Gagal mengunggah foto'
            ], 500);
        }
    }

    // Masukkan cerita ke database, TERMASUK user_id
    $sql = "INSERT INTO stories (user_id, title, content, location, photo) VALUES (:user_id, :title, :content, :location, :photo)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':user_id' => $userId, 
        ':title' => $title,
        ':content' => $content,
        ':location' => $location,
        ':photo' => $photoName
    ]);

    // Masukkan juga lokasi jika belum ada
    $locationSql = "INSERT IGNORE INTO locations (name) VALUES (:location)";
    $locationStmt = $pdo->prepare($locationSql);
    $locationStmt->execute([':location' => $location]);

    jsonResponse([
        'success' => true,
        'message' => 'Cerita berhasil dikirim!',
        'story_id' => $pdo->lastInsertId()
    ]);

} catch (Exception $e) {
    error_log("Kesalahan di submit_story.php: " . $e->getMessage());
    jsonResponse([
        'success' => false,
        'message' => 'Terjadi kesalahan saat menyimpan cerita'
    ], 500);
}
?>
