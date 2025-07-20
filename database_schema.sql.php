-- Database: local_wisdom
-- Buat database terlebih dahulu di phpMyAdmin atau command line

CREATE DATABASE IF NOT EXISTS local_wisdom;
USE local_wisdom;

-- Tabel users untuk menyimpan informasi pengguna
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Tabel stories untuk menyimpan cerita
CREATE TABLE stories (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    location VARCHAR(100) NOT NULL,
    photo VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- Tabel locations untuk menyimpan data lokasi
CREATE TABLE locations (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    latitude DECIMAL(10, 8) NULL,
    longitude DECIMAL(11, 8) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;


-- Tabel votes untuk sistem voting
CREATE TABLE votes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    story_id INT NOT NULL,
    user_id INT NULL,
    vote_type ENUM('up', 'down') NOT NULL,
    ip_address VARCHAR(45) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    UNIQUE KEY unique_vote (story_id, ip_address, user_id)
) ENGINE=InnoDB;

-- Insert contoh data
INSERT INTO stories (title, content, location) VALUES 
('Tradisi Makan Bajamba', 'Budaya makan bersama di Sumatra Barat yang mencerminkan kebersamaan dan gotong royong masyarakat Minangkabau. Bajamba dilakukan dengan duduk melingkar di lantai sambil menikmati hidangan khas Padang.', 'Padang'),
('Ritual Nyepi di Bali', 'Hari Raya Nyepi adalah tradisi Hindu Bali yang unik, dimana seluruh pulau Bali menjadi sunyi senyap selama 24 jam. Tidak ada aktivitas, tidak ada cahaya, dan tidak ada suara sebagai bentuk refleksi diri.', 'Denpasar'),
('Pasar Terapung Lok Baintan', 'Pasar tradisional yang unik di Kalimantan Selatan dimana transaksi jual beli dilakukan di atas perahu. Pasar ini sudah ada sejak ratusan tahun lalu dan menjadi daya tarik wisata budaya.', 'Banjarmasin'),
('Upacara Ngaben Bali', 'Upacara kremasi dalam tradisi Hindu Bali yang dipercaya dapat membebaskan roh dari ikatan duniawi. Prosesi ini melibatkan seluruh komunitas dan menunjukkan kekayaan budaya Bali.', 'Ubud'),
('Tradisi Mappacci Bugis', 'Ritual kecantikan pengantin wanita Bugis-Makassar dengan mengoleskan bedak tradisional. Tradisi ini melambangkan kesucian dan keberkahan untuk kehidupan berumah tangga.', 'Makassar');

-- Insert contoh data lokasi
INSERT INTO locations (name, latitude, longitude) VALUES 
('Padang', -0.9492, 100.3543),
('Denpasar', -8.6500, 115.2167),
('Banjarmasin', -3.3194, 114.5906),
('Ubud', -8.5069, 115.2625),
('Makassar', -5.1477, 119.4327);

-- Insert contoh votes
INSERT INTO votes (story_id, vote_type, ip_address) VALUES 
(1, 'up', '192.168.1.1'),
(1, 'up', '192.168.1.2'),
(2, 'up', '192.168.1.3'),
(3, 'up', '192.168.1.4'),
(3, 'up', '192.168.1.5'),
(4, 'up', '192.168.1.6');

-- View untuk menampilkan stories dengan vote count
CREATE VIEW stories_with_votes AS
SELECT 
    s.*,
    COALESCE(v.vote_count, 0) as votes
FROM stories s
LEFT JOIN (
    SELECT 
        story_id,
        SUM(CASE WHEN vote_type = 'up' THEN 1 WHEN vote_type = 'down' THEN -1 ELSE 0 END) as vote_count
    FROM votes 
    GROUP BY story_id
) v ON s.id = v.story_id
ORDER BY votes DESC, s.created_at DESC;
