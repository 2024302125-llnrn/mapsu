<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['email']) || !isset($data['password'])) {
    echo json_encode(['success' => false, 'error' => 'Credentials required']);
    exit;
}

try {
    $conn = getDBConnection();

    $loginIdentifier = $data['email'] ?? ''; 
    
    $stmt = $conn->prepare("
    SELECT adminid, name, password 
    FROM users 
    WHERE email = :email 
    LIMIT 1
");

    $stmt->execute(['email' => $loginIdentifier]);
    $admin = $stmt->fetch();

    if (!$admin) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid email or password'
        ]);
        exit;
    }

    if ($data['password'] !== $admin['password']) {
        echo json_encode([
            'success' => false,
            'error' => 'Invalid email or password'
        ]);
        exit;
    }

    echo json_encode([
        'success' => true,
        'adminid' => $admin['adminid'],
        'name' => $admin['name']
    ]);
} catch (Exception $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}