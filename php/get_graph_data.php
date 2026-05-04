<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

try {
    $conn = getDBConnection();

    $nodesStmt = $conn->query("
        SELECT
            nodeid,
            x_coordinate,
            y_coordinate
        FROM mapnodes
        ORDER BY nodeid
    ");

    $nodes = [];

    while ($row = $nodesStmt->fetch(PDO::FETCH_ASSOC)) {
        $nodes[$row['nodeid']] = [
            (float)$row['x_coordinate'],
            (float)$row['y_coordinate']
        ];
    }

    $edgesStmt = $conn->query("
        SELECT
            fromnode,
            tonode
        FROM edges
        ORDER BY edgeid
    ");

    $connections = [];

    while ($row = $edgesStmt->fetch(PDO::FETCH_ASSOC)) {
        $from = trim($row['fromnode']);
        $to = trim($row['tonode']);
        
        if (!isset($connections[$from])) {
            $connections[$from] = [];
        }
        if (!in_array($to, $connections[$from])) {
            $connections[$from][] = $to;
        }
    }

    echo json_encode([
        'success' => true,
        'nodes' => $nodes,
        'connections' => $connections
    ]);
    exit;

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
    exit;
}
?>