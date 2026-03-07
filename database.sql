-- ═══════════════════════════════════════════════════
--  CRUD_DB · database.sql
--  Ejecuta este script en MySQL / MariaDB primero
-- ═══════════════════════════════════════════════════

-- 1. Crear la base de datos (si no existe)
CREATE DATABASE IF NOT EXISTS crud_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE crud_db;

-- 2. Crear la tabla de usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id         INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(100)    NOT NULL,
  email      VARCHAR(160)    NOT NULL,
  rol        ENUM('admin','editor','viewer') NOT NULL DEFAULT 'viewer',
  activo     TINYINT(1)      NOT NULL DEFAULT 1,
  created_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP       NOT NULL DEFAULT CURRENT_TIMESTAMP
                                       ON UPDATE CURRENT_TIMESTAMP,

  PRIMARY KEY (id),
  UNIQUE KEY uq_email (email),
  INDEX idx_rol    (rol),
  INDEX idx_activo (activo)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_unicode_ci;

-- 3. Datos de ejemplo (opcional, comenta si no los necesitas)
INSERT IGNORE INTO usuarios (nombre, email, rol, activo) VALUES
  ('Ana García',      'ana@ejemplo.com',     'admin',  1),
  ('Carlos López',    'carlos@ejemplo.com',  'editor', 1),
  ('María Martínez',  'maria@ejemplo.com',   'viewer', 1),
  ('Pedro Sánchez',   'pedro@ejemplo.com',   'editor', 0),
  ('Laura Fernández', 'laura@ejemplo.com',   'viewer', 1);
