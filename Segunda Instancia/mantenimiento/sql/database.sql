-- Base de datos para el sistema de noticias
CREATE DATABASE IF NOT EXISTS sistema_noticias;
USE sistema_noticias;

-- Tabla de noticias
CREATE TABLE noticias (
    id INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT NOT NULL,
    miniatura VARCHAR(255) DEFAULT NULL,
    fecha DATE NOT NULL,
    fuente VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insertar algunos datos de prueba
INSERT INTO noticias (titulo, descripcion, miniatura, fecha, fuente) VALUES 
('Primera noticia de prueba', 'Esta es la descripción de la primera noticia para realizar pruebas del sistema.', 'primera.jpg', '2024-01-15', 'Diario Nacional'),
('Segunda noticia importante', 'Descripción detallada de la segunda noticia que contiene información relevante.', 'segunda.png', '2024-01-16', 'Revista Semanal'),
('Última actualización del sistema', 'Información sobre las mejoras implementadas en el sistema de gestión.', 'tercera.jpeg', '2024-01-17', 'Portal Tecnológico');