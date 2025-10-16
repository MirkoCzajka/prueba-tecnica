<?php
require_once __DIR__ . '/Database.php';

/**
 * Modelo para manejar las noticias
 */
class Noticia {
    private $db;
    
    public function __construct() {
        $this->db = new Database();
    }
    
    /**
     * Obtener todas las noticias
     */
    public function getAll(string $q = '') {
        $sql = "SELECT id, titulo, descripcion, miniatura, fecha, fuente FROM noticias";

        if ($q !== '') {
            $sql .= " WHERE titulo LIKE '%" . $q . "%'";
        }

        $sql .= " ORDER BY fecha DESC, id DESC";
        $stmt = $this->db->query($sql);
        return $stmt->fetchAll();
    }
    
    /**
     * Obtener una noticia por ID
     */
    public function getById($id) {
        $sql = "SELECT * FROM noticias WHERE id = ?";
        $stmt = $this->db->query($sql, [$id]);
        return $stmt->fetch();
    }
    
    /**
     * Crear una nueva noticia
     */
    public function create($data) {
        $sql = "INSERT INTO noticias (titulo, descripcion, miniatura, fecha, fuente) VALUES (?, ?, ?, ?, ?)";
        $params = [
            $data['titulo'],
            $data['descripcion'],
            $data['miniatura'] ?? null,
            $data['fecha'],
            $data['fuente']
        ];
        
        $this->db->query($sql, $params);
        return $this->db->lastInsertId();
    }
    
    /**
     * Actualizar una noticia
     */
    public function update($id, $data) {
        $sql = "UPDATE noticias SET titulo = ?, descripcion = ?, miniatura = ?, fecha = ?, fuente = ? WHERE id = ?";
        $params = [
            $data['titulo'],
            $data['descripcion'],
            $data['miniatura'] ?? null,
            $data['fecha'],
            $data['fuente'],
            $id
        ];
        
        $stmt = $this->db->query($sql, $params);
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Eliminar una noticia
     */
    public function delete($id) {
        // Primero obtenemos la noticia para eliminar la imagen
        $noticia = $this->getById($id);
        $dir = rtrim(Config::UPLOAD_DIR, "/\\") . DIRECTORY_SEPARATOR;
        if ($noticia && $noticia['miniatura'] && file_exists($dir . $noticia['miniatura'])) {
            unlink($dir . $noticia['miniatura']);
        }
        
        $sql = "DELETE FROM noticias WHERE id = ?";
        $stmt = $this->db->query($sql, [$id]);
        return $stmt->rowCount() > 0;
    }
    
    /**
     * Validar datos de noticia
     */
    public function validate($data) {
        $errors = [];
        
        if (empty($data['titulo'])) {
            $errors[] = "El título es obligatorio";
        }
        
        if (empty($data['descripcion'])) {
            $errors[] = "La descripción es obligatoria";
        }
        
        if (empty($data['fecha'])) {
            $errors[] = "La fecha es obligatoria";
        } elseif (!$this->isValidDate($data['fecha'])) {
            $errors[] = "La fecha no tiene un formato válido";
        }
        
        if (empty($data['fuente'])) {
            $errors[] = "La fuente es obligatoria";
        }
        
        return $errors;
    }
    
    /**
     * Validar formato de fecha
     */
    private function isValidDate($date) {
        $d = DateTime::createFromFormat('Y-m-d', $date);
        return $d && $d->format('Y-m-d') === $date;
    }
}
?>