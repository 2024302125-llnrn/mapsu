<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

function fetchFeedback(PDO $conn): array {
    $stmt = $conn->query("
        SELECT
            reportid,
            COALESCE(name, 'Anonymous') AS name,
            type,
            message,
            rating,
            status,
            date
        FROM reports
        ORDER BY reportid DESC  -- Sorting by ID is more reliable for 'newest first'
    ");

    return $stmt->fetchAll(PDO::FETCH_ASSOC);
}

try {
    $conn = getDBConnection();

    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        echo json_encode([
            'success' => true,
            'data' => fetchFeedback($conn)
        ]);
        exit;
    }

    $data = json_decode(file_get_contents('php://input'), true);

    if (!is_array($data) || !isset($data['action'])) {
        throw new Exception('No action specified');
    }

    $action = $data['action'];

    if ($action === 'create') {
        $feedbackType = trim($data['type'] ?? '');
        $message = trim($data['message'] ?? '');
        $name = trim($data['name'] ?? '');
        $rating = isset($data['rating']) ? (int)$data['rating'] : null;

        if ($feedbackType === '' || $message === '') {
            throw new Exception('Feedback type and message are required.');
        }

        $stmt = $conn->prepare("
            INSERT INTO reports (message, status, name, type, rating)
            VALUES (:message, 'Pending', :name, :type, :rating)
        ");

        $stmt->execute([
            'name' => $name !== '' ? $name : null,
            'type' => $feedbackType,
            'message' => $message,
            'rating' => $rating
        ]);

        echo json_encode([
            'success' => true,
            'message' => 'Feedback submitted successfully.'
        ]);
        exit;
    }

    if ($action === 'update') {
        $adminId = isset($data['adminid']) ? (int)$data['adminid'] : 0;
        $feedbackId = isset($data['id']) ? (int)$data['id'] : 0;
        $status = trim($data['status'] ?? '');

        if ($adminId <= 0) {
            throw new Exception('Invalid admin ID');
        }
        if ($feedbackId <= 0) {
            throw new Exception('Invalid feedback ID');
        }
        if ($status === '') {
            throw new Exception('Status is required.');
        }

        $conn->beginTransaction();

        $stmt = $conn->prepare("
            UPDATE reports
            SET status = :status
            WHERE reportid = :reportid
        ");

        $stmt->execute([
            'status' => $status,
            'reportid' => $feedbackId
        ]);

        $log = $conn->prepare("
            INSERT INTO adminupdates (adminid, description, date)
            VALUES (:aid, :descr, NOW())
        ");

        $log->execute([
            'aid' => $adminId,
            'descr' => 'Updated status to ' . $status . ' for feedback ID: ' . $feedbackId
        ]);

        $conn->commit();

        echo json_encode([
            'success' => true,
            'message' => 'Feedback status updated successfully.'
        ]);
        exit;
    }

    throw new Exception('Invalid action');
} catch (Exception $e) {
    if (isset($conn) && $conn->inTransaction()) {
        $conn->rollBack();
    }

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>