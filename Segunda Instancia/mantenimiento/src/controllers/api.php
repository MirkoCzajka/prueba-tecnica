<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Manejar OPTIONS request para CORS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../models/Noticia.php';
require_once __DIR__ . '/../utils/FileUpload.php';

/**
 * API REST para gestión de noticias
 */
class NoticiaAPI {
    private $noticia;
    private $fileUpload;
    
    public function __construct() {
        $this->noticia = new Noticia();
        $this->fileUpload = new FileUpload();
    }
    
    public function handleRequest() {
        $method = $_SERVER['REQUEST_METHOD'];
        $path = $_SERVER['REQUEST_URI'];
        
        // Verificar si es una actualización con archivo (_method=PUT en query params)
        if ($method === 'POST' && isset($_GET['_method']) && $_GET['_method'] === 'PUT') {
            $method = 'PUT';
        }
        
        // Obtener el ID si está presente en la URL
        $id = $this->getIdFromPath($path);
        
        try {
            switch ($method) {
                case 'GET':
                    $q = isset($_GET['q']) ? trim($_GET['q']) : '';
                    if ($id) {
                        $this->getNoticia($id);
                    } else {
                        $this->getAllNoticias($q);
                    }
                    break;
                    
                case 'POST':
                    $this->createNoticia();
                    break;
                    
                case 'PUT':
                    if ($id) {
                        $this->updateNoticia($id);
                    } else {
                        $this->sendError('ID requerido para actualizar', 400);
                    }
                    break;
                    
                case 'DELETE':
                    if ($id) {
                        $this->deleteNoticia($id);
                    } else {
                        $this->sendError('ID requerido para eliminar', 400);
                    }
                    break;
                    
                default:
                    $this->sendError('Método no permitido', 405);
                    break;
            }
        } catch (Exception $e) {
            $this->sendError('Error del servidor: ' . $e->getMessage(), 500);
        }
    }
    
    private function getAllNoticias($q = '') {
        $noticias = $this->noticia->getAll($q);
        $this->sendResponse($noticias);
    }
    
    private function getNoticia($id) {
        $noticia = $this->noticia->getById($id);
        if ($noticia) {
            $this->sendResponse($noticia);
        } else {
            $this->sendError('Noticia no encontrada', 404);
        }
    }
    
    private function createNoticia() {
        $data = $this->getInputData();
        
        // Validar datos
        $errors = $this->noticia->validate($data);
        if (!empty($errors)) {
            $this->sendError($errors, 400);
            return;
        }
        
        // Manejar subida de archivo si existe
        if (isset($_FILES['miniatura'])) {
            $uploadResult = $this->fileUpload->uploadThumbnail($_FILES['miniatura']);
            if ($uploadResult['success']) {
                $data['miniatura'] = $uploadResult['filename'];
            } else {
                $this->sendError($uploadResult['message'], 400);
                return;
            }
        }
        
        $id = $this->noticia->create($data);
        $this->sendResponse(['id' => $id, 'message' => 'Noticia creada exitosamente'], 201);
    }
    
    private function updateNoticia($id) {
        $data = $this->getInputData();
        
        // Obtener noticia actual
        $noticiaActual = $this->noticia->getById($id);
        if (!$noticiaActual) {
            $this->sendError('Noticia no encontrada', 404);
            return;
        }
        
        // Validar datos
        $errors = $this->noticia->validate($data);
        if (!empty($errors)) {
            $this->sendError($errors, 400);
            return;
        }
        
        // Manejar miniatura
        if (isset($_FILES['miniatura']) && $_FILES['miniatura']['error'] === UPLOAD_ERR_OK) {
            // Hay archivo nuevo - eliminar el anterior
            if ($noticiaActual['miniatura']) {
                $this->fileUpload->deleteThumbnail($noticiaActual['miniatura']);
            }
            
            $uploadResult = $this->fileUpload->uploadThumbnail($_FILES['miniatura']);
            if ($uploadResult['success']) {
                $data['miniatura'] = $uploadResult['filename'];
            } else {
                $this->sendError($uploadResult['message'], 400);
                return;
            }
        } else {
            // No hay archivo nuevo - mantener el actual
            $data['miniatura'] = $noticiaActual['miniatura'];
        }

        $campos = ['titulo','descripcion','miniatura','fecha','fuente'];
        $sinCambios = true;
        foreach ($campos as $k) {
            if ((string)($data[$k] ?? '') !== (string)($noticiaActual[$k] ?? '')) {
                $sinCambios = false;
                break;
            }
        }
        if ($sinCambios) {
            $this->sendResponse(['message' => 'No hubo cambios']);
            return;
        }
        
        $success = $this->noticia->update($id, $data);
        if ($success) {
            $this->sendResponse(['message' => 'Noticia actualizada exitosamente']);
        } else {
            $this->sendError('Error al actualizar la noticia', 500);
        }
    }
    
    private function deleteNoticia($id) {
        $success = $this->noticia->delete($id);
        if ($success) {
            $this->sendResponse(['message' => 'Noticia eliminada exitosamente']);
        } else {
            $this->sendError('Noticia no encontrada', 404);
        }
    }
    
    private function getInputData() {
        // Para form-data (con archivos) - FormData siempre viene por $_POST
        if (!empty($_POST)) {
            return $_POST;
        }
        
        // Para JSON (application/json)
        $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
        if (strpos($contentType, 'application/json') !== false) {
            return json_decode(file_get_contents('php://input'), true);
        }
        
        // Fallback: intentar leer como JSON
        $input = file_get_contents('php://input');
        if (!empty($input)) {
            $decoded = json_decode($input, true);
            if ($decoded !== null) {
                return $decoded;
            }
        }
        
        return [];
    }
    
    private function getIdFromPath($path) {
        // Extraer ID de la URL si está presente
        if (preg_match('/\/api\.php\/(\d+)/', $path, $matches)) {
            return (int)$matches[1];
        }
        return isset($_GET['id']) ? (int)$_GET['id'] : null;
    }
    
    private function sendResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode([
            'success' => true,
            'data' => $data
        ]);
    }
    
    private function sendError($message, $status = 400) {
        http_response_code($status);
        echo json_encode([
            'success' => false,
            'error' => $message
        ]);
    }
}

// Ejecutar la API
$api = new NoticiaAPI();
$api->handleRequest();
?>