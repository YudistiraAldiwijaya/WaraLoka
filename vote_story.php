<?php
require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

session_start(); 

if (!isset($_SESSION['user_id'])) {
    jsonResponse(['success' => false, 'message' => 'Anda harus login untuk memberikan vote.'], 401);
    exit();
}

$user_id = $_SESSION['user_id'];
$data = json_decode(file_get_contents('php://input'), true);

$story_id = $data['story_id'] ?? null;
$vote_type = $data['vote_type'] ?? null; 

if (!$story_id || !in_array($vote_type, ['up', 'down'])) {
    jsonResponse(['success' => false, 'message' => 'Data vote tidak lengkap atau tidak valid.'], 400);
    exit();
}

try {
    $pdo = getDBConnection(); 
    if (!$pdo) {
        throw new Exception('Koneksi database gagal');
    }

    // Cek apakah pengguna sudah pernah vote untuk cerita ini
    $stmt = $pdo->prepare("SELECT vote_type FROM votes WHERE user_id = :user_id AND story_id = :story_id");
    $stmt->execute(['user_id' => $user_id, 'story_id' => $story_id]);
    $existing_vote = $stmt->fetchColumn();

    if ($existing_vote) {
        if ($existing_vote === $vote_type) {
            // Jika pengguna mengklik vote yang sama lagi, hapus vote (unlike/undislike)
            $stmt = $pdo->prepare("DELETE FROM votes WHERE user_id = :user_id AND story_id = :story_id");
            $stmt->execute(['user_id' => $user_id, 'story_id' => $story_id]);
            $message = 'Vote berhasil dibatalkan.';
            $currentUserVoteStatus = null; 
        } else {
            // Jika pengguna mengubah vote (misal dari up ke down atau sebaliknya), perbarui vote
            $stmt = $pdo->prepare("UPDATE votes SET vote_type = :vote_type WHERE user_id = :user_id AND story_id = :story_id");
            $stmt->execute(['vote_type' => $vote_type, 'user_id' => $user_id, 'story_id' => $story_id]);
            $message = 'Vote berhasil diperbarui.';
            $currentUserVoteStatus = $vote_type; 
        }
    } else {
        // Jika belum pernah vote, masukkan vote baru
        $stmt = $pdo->prepare("INSERT INTO votes (user_id, story_id, vote_type) VALUES (:user_id, :story_id, :vote_type)");
        $stmt->execute(['user_id' => $user_id, 'story_id' => $story_id, 'vote_type' => $vote_type]);
        $message = 'Vote berhasil ditambahkan.';
        $currentUserVoteStatus = $vote_type; 
    }

    // Ambil total like dan dislike terbaru untuk cerita ini
    $stmt_counts = $pdo->prepare("SELECT
                                    COUNT(CASE WHEN vote_type = 'up' THEN 1 END) AS likes_count,
                                    COUNT(CASE WHEN vote_type = 'down' THEN 1 END) AS dislikes_count
                                FROM votes WHERE story_id = :story_id");
    $stmt_counts->execute(['story_id' => $story_id]);
    $new_counts = $stmt_counts->fetch(PDO::FETCH_ASSOC);

    jsonResponse([
        'success' => true,
        'message' => $message,
        'new_likes_count' => $new_counts['likes_count'],
        'new_dislikes_count' => $new_counts['dislikes_count'],
        'current_user_vote' => $currentUserVoteStatus 
    ]);

} catch (PDOException $e) {
    error_log("Kesalahan database di vote_story.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan database.'], 500);
} catch (Exception $e) {
    error_log("Kesalahan di vote_story.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server.'], 500);
}
?>
