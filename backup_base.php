<?php
$fileName = $_POST['fileName'];
$json = $_POST['json'];

$backupDir = __DIR__ . '/backup/';
$filePath = $backupDir . $fileName;

if (file_put_contents($filePath, $json) !== false) {
    echo json_encode(['success' => true, 'valid' => $filePath]);
} else {
    echo json_encode(['success' => false, 'error' => 'Fallo al crear el backup']);
}
