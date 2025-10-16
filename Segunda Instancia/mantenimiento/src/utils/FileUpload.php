<?php
require_once __DIR__ . '/../../config/config.php';

/**
 * Clase para manejar la subida de archivos
 */
class FileUpload {
    
    /**
     * Subir archivo de miniatura
     */
    public function uploadThumbnail($file) {
        if (!isset($file) || $file['error'] !== UPLOAD_ERR_OK) {
            return ['success' => false, 'message' => 'No se ha seleccionado ningún archivo o hubo un error en la subida'];
        }
        
        // Validar tamaño del archivo
        if ($file['size'] > Config::MAX_FILE_SIZE) {
            return ['success' => false, 'message' => 'El archivo es demasiado grande. Máximo 5MB'];
        }
        
        // Validar extensión
        $extension = strtolower(pathinfo($file['name'], PATHINFO_EXTENSION));
        if (!in_array($extension, Config::ALLOWED_EXTENSIONS)) {
            return ['success' => false, 'message' => 'Tipo de archivo no permitido. Solo: ' . implode(', ', Config::ALLOWED_EXTENSIONS)];
        }
        
        // Crear directorio si no existe
        $dir = rtrim(Config::UPLOAD_DIR, "/\\") . DIRECTORY_SEPARATOR;
        if (!is_dir($dir) && !mkdir($dir, 0777, true)) {
            return ['success' => false, 'message' => 'No se pudo crear el directorio de uploads'];
        }
        
        // Generar nombre único para el archivo
        $filename = uniqid() . '_' . time() . '.' . $extension;
        $filepath = $dir . $filename;
        
        // Mover el archivo
        if (move_uploaded_file($file['tmp_name'], $filepath)) {
            return ['success' => true, 'filename' => $filename];
        } else {
            return ['success' => false, 'message' => 'Error al guardar el archivo'];
        }
    }
    
    /**
     * Eliminar archivo de miniatura
     */
    public function deleteThumbnail($filename) {
        $dir = rtrim(Config::UPLOAD_DIR, "/\\") . DIRECTORY_SEPARATOR;
        if ($filename && file_exists($dir . $filename)) {
            return unlink($dir . $filename);
        }
        return true;
    }
}
?>