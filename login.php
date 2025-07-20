<?php
require_once 'config.php';

// Mulai sesi PHP
session_start();

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

if (empty($username) || empty($password)) {
    jsonResponse(['success' => false, 'message' => 'Username dan password wajib diisi.'], 400);
}

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Ambil pengguna berdasarkan username
    $sql = "SELECT id, username, password_hash FROM users WHERE username = :username";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([':username' => $username]);
    $user = $stmt->fetch();

    // Verifikasi password
    if ($user && password_verify($password, $user['password_hash'])) {
        // Login berhasil
        $_SESSION['user_id'] = $user['id'];
        $_SESSION['username'] = $user['username'];

        jsonResponse([
            'success' => true,
            'message' => 'Login berhasil!',
            'user' => [
                'id' => $user['id'],
                'username' => $user['username']
            ]
        ]);
    } else {
        // Login gagal
        jsonResponse(['success' => false, 'message' => 'Username atau password salah.'], 401);
    }

} catch (Exception $e) {
    error_log("Kesalahan di login.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan saat login. Silakan coba lagi.'], 500);
}
?>
