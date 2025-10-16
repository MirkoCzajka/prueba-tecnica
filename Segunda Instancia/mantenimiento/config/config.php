<?php
/**
 * Configuración de ejemplo para el Sistema de Gestión de Noticias
 * 
 * Copia este archivo como 'config.php' y modifica los valores según tu entorno
 */
class Config {
    // ================================
    // CONFIGURACIÓN DE BASE DE DATOS
    // ================================
    const DB_HOST = 'host.docker.internal';              // Servidor de base de datos
    const DB_PORT = '3310';
    const DB_NAME = 'sistema_noticias';       // Nombre de la base de datos
    const DB_USER = 'root';                   // Usuario de la base de datos
    const DB_PASS = 'root';                       // Contraseña de la base de datos
    const DB_CHARSET = 'utf8mb4';             // Charset de la conexión
    
    // ================================
    // CONFIGURACIÓN DE UPLOADS
    // ================================
    const BASE_PATH   = __DIR__ . '/..';
    const UPLOAD_DIR = self::BASE_PATH . '/uploads/';            // Directorio para archivos subidos (ruta absoluta)
    const MAX_FILE_SIZE = 5242880;                          // Tamaño máximo: 5MB (en bytes)
    const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif']; // Extensiones permitidas
    
    // ================================
    // CONFIGURACIÓN DE LA API
    // ================================
    const API_VERSION = 'v1';                                            // Versión de la API
    const BASE_URL = 'http://localhost:8082/prueba_tecnica/'; // URL base del proyecto
    
    // ================================
    // CONFIGURACIÓN DE DESARROLLO
    // ================================
    const DEBUG_MODE = true;                  // Modo debug (false en producción)
    const SHOW_ERRORS = true;                 // Mostrar errores (false en producción)
    const LOG_ERRORS = true;                  // Registrar errores en log
}

// Configurar zona horaria
date_default_timezone_set('America/Argentina/Buenos_Aires'); // Cambiar según tu ubicación
?>