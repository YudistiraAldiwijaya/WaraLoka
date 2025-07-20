<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'message' => 'Metode tidak diizinkan'], 405);
}

$input = json_decode(file_get_contents('php://input'), true);

$username = sanitizeInput($input['username'] ?? '');
$password = $input['password'] ?? '';
$email = sanitizeInput($input['email'] ?? '');

if (empty($username) || empty($password)) {
    jsonResponse(['success' => false, 'message' => 'Username dan password wajib diisi.'], 400);
}

// Validasi panjang username/password, format email, dll.
if (strlen($username) < 3 || strlen($username) > 50) {
    jsonResponse(['success' => false, 'message' => 'Username harus antara 3 dan 50 karakter.'], 400);
}
if (strlen($password) < 6) {
    jsonResponse(['success' => false, 'message' => 'Password minimal 6 karakter.'], 400);
}
if (!empty($email) && !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    jsonResponse(['success' => false, 'message' => 'Format email tidak valid.'], 400);
}

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Cek apakah username sudah ada
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE username = :username");
    $stmt->execute([':username' => $username]);
    if ($stmt->fetchColumn() > 0) {
        jsonResponse(['success' => false, 'message' => 'Username sudah digunakan.'], 409);
    }

    // Cek apakah email sudah ada (jika email digunakan dan bersifat unique)
    if (!empty($email)) {
        $stmt = $pdo->prepare("SELECT COUNT(*) FROM users WHERE email = :email");
        $stmt->execute([':email' => $email]);
        if ($stmt->fetchColumn() > 0) {
            jsonResponse(['success' => false, 'message' => 'Email sudah digunakan.'], 409);
        }
    }

    // Hash password sebelum disimpan
    $passwordHash = password_hash($password, PASSWORD_BCRYPT);

    $sql = "INSERT INTO users (username, password_hash, email) VALUES (:username, :password_hash, :email)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        ':username' => $username,
        ':password_hash' => $passwordHash,
        ':email' => !empty($email) ? $email : null
    ]);

    jsonResponse(['success' => true, 'message' => 'Pendaftaran berhasil! Silakan login.']);

} catch (Exception $e) {
    error_log("Kesalahan di signup.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan saat pendaftaran. Silakan coba lagi.'], 500);
}
?>
