<?php
function loadEnv($path) {
    if (!file_exists($path)) return;
    $lines = file($path, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos(trim($line), '#') === 0) continue;
        if (strpos($line, '=') !== false) {
            list($name, $value) = explode('=', $line, 2);
            putenv(trim($name) . "=" . trim($value));
        }
    }
}

loadEnv(__DIR__ . '/../.env');

function getDBConnection() {
    static $conn = null;
    if ($conn !== null) return $conn;

    $host = getenv('DB_HOST');
    $dbname = getenv('DB_NAME');
    $username = getenv('DB_USER');
    $dbPassword = getenv('DB_PASSWORD');
    $port = getenv('DB_PORT') ?: '4000';

    try {
    $dsn = "mysql:host=$host;port=$port;dbname=$dbname;charset=utf8mb4";
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        // This forces SSL mode 'REQUIRED'
        PDO::MYSQL_ATTR_SSL_CA => true, 
        // This disables the strict certificate verification which usually causes the 'insecure' error on local machines
        PDO::MYSQL_ATTR_SSL_VERIFY_SERVER_CERT => false,
    ];

    $conn = new PDO($dsn, $username, $dbPassword, $options);
    return $conn;
} catch (PDOException $e) {
        header('Content-Type: application/json');
        echo json_encode(['success' => false, 'error' => "Connection failed: " . $e->getMessage()]);
        exit;
    }
}