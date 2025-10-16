<?php
require_once __DIR__ . '/../../config/config.php';

/**
 * Clase para manejar la conexión a la base de datos
 */
class Database {
    private $connection;
    
    public function __construct() {
        $this->connect();
    }
    
    private function connect() {
        try {
            $dsn = "mysql:host=" . Config::DB_HOST . ";port=" . Config::DB_PORT . ";dbname=" . Config::DB_NAME . ";charset=" . Config::DB_CHARSET;
            $this->connection = new PDO($dsn, Config::DB_USER, Config::DB_PASS);
            $this->connection->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            $this->connection->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
        } catch(PDOException $e) {
            throw new Exception("Error de conexión: " . $e->getMessage());
        }
    }
    
    public function getConnection() {
        return $this->connection;
    }
    
    public function query($sql, $params = []) {
        try {
            $stmt = $this->connection->prepare($sql);
            $stmt->execute($params);
            return $stmt;
        } catch(PDOException $e) {
            throw new Exception("Error en la consulta: " . $e->getMessage());
        }
    }
    
    public function lastInsertId() {
        return $this->connection->lastInsertId();
    }
}
?>