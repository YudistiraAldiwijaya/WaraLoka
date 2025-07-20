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
    jsonResponse(['success' => false, 'message' => 'Anda harus login untuk mengedit cerita.'], 401);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Metode tidak diizinkan'], 405);
    exit();
}

$user_id = $_SESSION['user_id'];

// Menggunakan $_POST untuk data teks dan $_FILES untuk file
$story_id = filter_input(INPUT_POST, 'story_id', FILTER_VALIDATE_INT);
$title = sanitizeInput($_POST['title'] ?? '');
$content = sanitizeInput($_POST['content'] ?? '');
$location = sanitizeInput($_POST['location'] ?? '');
$current_photo = sanitizeInput($_POST['current_photo'] ?? '');

if (!$story_id || empty($title) || empty($content) || empty($location)) {
    jsonResponse(['success' => false, 'message' => 'Data cerita tidak lengkap atau tidak valid.'], 400);
    exit();
}

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Verifikasi kepemilikan cerita
    $stmt = $pdo->prepare("SELECT user_id, photo FROM stories WHERE id = :story_id");
    $stmt->execute([':story_id' => $story_id]);
    $story_data = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$story_data) {
        jsonResponse(['success' => false, 'message' => 'Cerita tidak ditemukan.'], 404);
        exit();
    }

    if ($story_data['user_id'] !== $user_id) {
        jsonResponse(['success' => false, 'message' => 'Anda tidak memiliki izin untuk mengedit cerita ini.'], 403);
        exit();
    }

    $new_photo_name = $current_photo;
    $uploadDir = 'uploads/';

    // Tangani upload foto baru jika ada
    if (isset($_FILES['photo']) && $_FILES['photo']['error'] === UPLOAD_ERR_OK) {
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        $fileInfo = pathinfo($_FILES['photo']['name']);
        $allowedTypes = ['jpg', 'jpeg', 'png', 'gif'];

        if (!in_array(strtolower($fileInfo['extension']), $allowedTypes)) {
            jsonResponse(['success' => false, 'message' => 'Format file tidak didukung. Gunakan JPG, PNG, atau GIF'], 400);
            exit();
        }

        if ($_FILES['photo']['size'] > 5 * 1024 * 1024) {
            jsonResponse(['success' => false, 'message' => 'Ukuran file terlalu besar. Maksimal 5MB'], 400);
            exit();
        }

        $new_photo_name = uniqid() . '.' . $fileInfo['extension'];
        $uploadPath = $uploadDir . $new_photo_name;

        if (!move_uploaded_file($_FILES['photo']['tmp_name'], $uploadPath)) {
            jsonResponse(['success' => false, 'message' => 'Gagal mengupload foto baru.'], 500);
            exit();
        }

        // Hapus foto lama jika ada dan berbeda dari yang baru diupload
        if ($story_data['photo'] && $story_data['photo'] !== $new_photo_name && file_exists($uploadDir . $story_data['photo'])) {
            unlink($uploadDir . $story_data['photo']);
        }
    } else if (isset($_POST['remove_photo']) && $_POST['remove_photo'] === 'true') {
        // Jika ada permintaan untuk menghapus foto
        if ($story_data['photo'] && file_exists($uploadDir . $story_data['photo'])) {
            unlink($uploadDir . $story_data['photo']);
        }
        $new_photo_name = null; // Set foto menjadi NULL di database
    }

    // Update cerita di database
    $sql = "UPDATE stories SET title = :title, content = :content, location = :location, photo = :photo WHERE id = :story_id AND user_id = :user_id";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':title' => $title,
        ':content' => $content,
        ':location' => $location,
        ':photo' => $new_photo_name,
        ':story_id' => $story_id,
        ':user_id' => $user_id
    ]);

    // Update atau insert lokasi jika belum ada
    $locationSql = "INSERT IGNORE INTO locations (name) VALUES (:location)";
    $locationStmt = $pdo->prepare($locationSql);
    $locationStmt->execute([':location' => $location]);

    jsonResponse(['success' => true, 'message' => 'Cerita berhasil diperbarui.']);

} catch (PDOException $e) {
    error_log("Kesalahan database di edit_story.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan database saat memperbarui cerita.'], 500);
} catch (Exception $e) {
    error_log("Kesalahan di edit_story.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server saat memperbarui cerita.'], 500);
}
?>
