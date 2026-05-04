<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

$data = json_decode(file_get_contents('php://input'), true);

if (!isset($data['action'])) {
    echo json_encode([
        'success' => false,
        'error' => 'No action specified'
    ]);
    exit;
}

try {
    $conn = getDBConnection();
    $conn->beginTransaction();

    $action = $data['action'];
    $adminId = isset($data['adminid']) ? intval($data['adminid']) : 0;

    if ($adminId <= 0) {
        throw new Exception("Invalid admin ID");
    }

    switch ($action) {
        case 'create':
            $stmt = $conn->prepare("
                INSERT INTO buildings 
                (buildingname, x_coordinate, y_coordinate, description)
                VALUES (:name, :x, :y, :info)
            ");

            $stmt->execute([
                'name' => $data['name'],
                'x' => $data['x'],
                'y' => $data['y'],
                'info' => $data['info']
            ]);

            $descr = "Added building: " . $data['name'];
        break;

        case 'update':
            $stmt = $conn->prepare("
                UPDATE buildings 
                SET buildingname = :name,
                    x_coordinate = :x,
                    y_coordinate = :y,
                    description = :info
                WHERE buildingid = :id
            ");

            $stmt->execute([
                'name' => $data['name'],
                'x' => $data['x'],
                'y' => $data['y'],
                'info' => $data['info'],
                'id' => $data['id']
            ]);

            $descr = "Updated building ID: " . $data['id'];
        break;

        case 'delete':
            $stmt = $conn->prepare("
                DELETE FROM buildings 
                WHERE buildingid = :id
            ");

            $stmt->execute([
                'id' => $data['id']
            ]);

            $descr = "Deleted building ID: " . $data['id'];
        break;


        default:
            throw new Exception("Invalid action");
    }

    $log = $conn->prepare("
        INSERT INTO adminupdates 
        (adminid, description, date)
        VALUES (:aid, :descr, NOW())
    ");

    $log->execute([
        'aid' => $adminId,
        'descr' => $descr
    ]);

    $conn->commit();

    echo json_encode([
        'success' => true
    ]);

} catch (Exception $e) {

    if (isset($conn)) {
        $conn->rollBack();
    }

    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>