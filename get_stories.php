<?php

session_start();

require_once 'config.php';

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET');

try {
    $pdo = getDBConnection();
    if (!$pdo) {
        error_log("Koneksi database gagal di get_stories.php: Koneksi mengembalikan null");
        throw new Exception('Koneksi database gagal');
    }

    $user_id = $_SESSION['user_id'] ?? null;
    $search_query = sanitizeInput($_GET['query'] ?? '');
    $page = isset($_GET['page']) ? (int)$_GET['page'] : 1;
    $limit = 6;
    $offset = ($page - 1) * $limit;

    // LOGIKA UNTUK MENGAMBIL CERITA SPESIFIK BERDASARKAN ID
    if (isset($_GET['id']) && !empty($_GET['id'])) {
        $story_id = (int)$_GET['id'];
        $sql = "SELECT
                    s.id,
                    s.title,
                    s.content,
                    s.location,
                    s.photo,
                    s.created_at,
                    COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS likes_count,
                    COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS dislikes_count,
                    CASE WHEN s.user_id = :current_user_id THEN TRUE ELSE FALSE END AS is_owner
                FROM stories s
                LEFT JOIN votes v ON s.id = v.story_id
                WHERE s.id = :story_id
                GROUP BY s.id, s.title, s.content, s.location, s.photo, s.created_at, s.user_id";

        $stmt = $pdo->prepare($sql);
        $stmt->bindValue(':story_id', $story_id, PDO::PARAM_INT);
        $stmt->bindValue(':current_user_id', $user_id, PDO::PARAM_INT);
        $stmt->execute();
        $stories = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if ($user_id && !empty($stories)) {
            $stmt_user_vote = $pdo->prepare("SELECT vote_type FROM votes WHERE user_id = :user_id AND story_id = :story_id");
            $stmt_user_vote->bindValue(':user_id', $user_id, PDO::PARAM_INT);
            $stmt_user_vote->bindValue(':story_id', $stories[0]['id'], PDO::PARAM_INT);
            $stmt_user_vote->execute();
            $stories[0]['current_user_vote'] = $stmt_user_vote->fetchColumn();
        } else if (!empty($stories)) {
            $stories[0]['current_user_vote'] = null;
        }

        jsonResponse([
            'success' => true,
            'stories' => $stories,
            'page' => 1,
            'total_pages' => 1
        ]);
        exit;
    }

    // LOGIKA UTAMA UNTUK MENGAMBIL DAFTAR CERITA (DENGAN SEARCH FILTER DI TITLE, CONTENT, LOCATION)
    $where_parts = [];
    $params_for_sql = [];

    if (!empty($search_query)) {
        $where_parts[] = "s.title LIKE :search_query_title";
        $where_parts[] = "s.content LIKE :search_query_content";
        $where_parts[] = "s.location LIKE :search_query_location";

        $params_for_sql[':search_query_title'] = '%' . $search_query . '%';
        $params_for_sql[':search_query_content'] = '%' . $search_query . '%';
        $params_for_sql[':search_query_location'] = '%' . $search_query . '%';
    }

    $where_clause = '';
    if (!empty($where_parts)) {
        $where_clause = " WHERE (" . implode(" OR ", $where_parts) . ")";
    }

    // Query untuk total cerita (DENGAN FILTER PENCARIAN)
    $sql_count = "SELECT COUNT(s.id) FROM stories s" . $where_clause;
    $stmt_count = $pdo->prepare($sql_count);
    $stmt_count->execute($params_for_sql);
    $total_stories = $stmt_count->fetchColumn();
    $total_pages = ceil($total_stories / $limit);

    // Query untuk mengambil data cerita (DENGAN FILTER PENCARIAN)
    $sql_select = "SELECT
                        s.id,
                        s.title,
                        s.content,
                        s.location,
                        s.photo,
                        s.created_at,
                        COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) AS likes_count,
                        COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0) AS dislikes_count,
                        CASE WHEN s.user_id = :current_user_id THEN TRUE ELSE FALSE END AS is_owner
                    FROM stories s
                    LEFT JOIN votes v ON s.id = v.story_id"
                    . $where_clause .
                    " GROUP BY s.id, s.title, s.content, s.location, s.photo, s.created_at, s.user_id";

    $sql_select .= " ORDER BY (COALESCE(SUM(CASE WHEN v.vote_type = 'up' THEN 1 ELSE 0 END), 0) - COALESCE(SUM(CASE WHEN v.vote_type = 'down' THEN 1 ELSE 0 END), 0)) DESC, s.created_at DESC";
    $sql_select .= " LIMIT :limit OFFSET :offset";

    $stmt = $pdo->prepare($sql_select);

    // Bind parameter untuk pencarian
    foreach ($params_for_sql as $key => $value) {
        $stmt->bindValue($key, $value);
    }
    // Bind parameter untuk current_user_id
    $stmt->bindValue(':current_user_id', $user_id, PDO::PARAM_INT);
    // Bind parameter untuk pagination
    $stmt->bindValue(':limit', $limit, PDO::PARAM_INT);
    $stmt->bindValue(':offset', $offset, PDO::PARAM_INT);
    $stmt->execute();

    $stories = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Ambil status vote user untuk setiap cerita
    if ($user_id && !empty($stories)) {
        $storyIds = array_column($stories, 'id');
        if (!empty($storyIds)) {
            $placeholders = implode(',', array_fill(0, count($storyIds), '?'));
            $stmt_all_user_votes = $pdo->prepare("SELECT story_id, vote_type FROM votes WHERE user_id = ? AND story_id IN ($placeholders)");
            $stmt_all_user_votes->execute(array_merge([$user_id], $storyIds));
            $userVotesMap = [];
            while ($vote = $stmt_all_user_votes->fetch(PDO::FETCH_ASSOC)) {
                $userVotesMap[$vote['story_id']] = $vote['vote_type'];
            }

            foreach ($stories as $key => $story) {
                $stories[$key]['current_user_vote'] = $userVotesMap[$story['id']] ?? null;
            }
        }
    } else {
        foreach ($stories as $key => $story) {
            $stories[$key]['current_user_vote'] = null;
        }
    }

    jsonResponse([
        'success' => true,
        'stories' => $stories,
        'page' => $page,
        'total_pages' => $total_pages
    ]);

} catch (PDOException $e) {
    error_log("Kesalahan database di get_stories.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan saat mengambil data cerita: ' . $e->getMessage()], 500);
} catch (Exception $e) {
    error_log("Kesalahan di get_stories.php: " . $e->getMessage());
    jsonResponse(['success' => false, 'message' => 'Terjadi kesalahan server: ' . $e->getMessage()], 500);
}

?>
