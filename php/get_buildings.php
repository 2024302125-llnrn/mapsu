<?php
header('Content-Type: application/json');
require_once 'db_connect.php';

function normalizeImagePath(?string $path, string $subfolder = 'bldgs'): string {
    if (!$path || trim($path) === '' || $path === '[null]' || $path === 'null') {
        return '';
    }

    $normalized = trim($path);
    
    $normalized = str_replace('\\', '/', $normalized);
    
    $filename = basename($normalized);
    
    return "../assets/$subfolder/$filename";
}

try {
    $conn = getDBConnection();

    $stmt = $conn->query("
        SELECT 
            buildingid AS id,
            buildingname AS name,
            x_coordinate,
            y_coordinate,
            description AS info,
            image_path AS image,
            street_view
        FROM buildings
        ORDER BY buildingname
    ");

    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $buildings = [];

    foreach ($rows as $row) {
        $buildings[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'coordinates' => [
                (float)$row['x_coordinate'], 
                (float)$row['y_coordinate']
            ],
            'info' => $row['info'] ?? '',
            'image' => normalizeImagePath($row['image'] ?? '', 'bldgs'),
            'street_view' => normalizeImagePath($row['street_view'] ?? '', 'sv')
        ];
    }

    echo json_encode([
        'success' => true,
        'data' => $buildings
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>