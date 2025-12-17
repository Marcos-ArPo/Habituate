drop database if exists AppHabitos;
create database AppHabitos;
use AppHabitos;

-- Tabla principal de usuarios
CREATE TABLE usuarios (
    id_usuario INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    contraseña_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100),
    fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP,
    avatar_url TEXT,
    config_modo_oscuro BOOLEAN DEFAULT FALSE,
    config_notificaciones BOOLEAN DEFAULT TRUE,
    token_fcm TEXT
);

-- Tabla de categorías personalizadas
CREATE TABLE categorias (
    id_categoria INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    nombre VARCHAR(50) NOT NULL,
    color VARCHAR(7) DEFAULT '#3498db',
    icono VARCHAR(50),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);

-- Tabla de hábitos
CREATE TABLE habitos (
    id_habito INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_categoria INT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    color VARCHAR(7) DEFAULT '#2ecc71',
    icono VARCHAR(50),
    dificultad INT DEFAULT 3 CHECK (dificultad BETWEEN 1 AND 5),
    frecuencia ENUM('diario', 'semanal', 'mensual') DEFAULT 'diario',
    hora_recordatorio TIME,
    dias_semana JSON, -- Ej: [1,3,5] para Lunes, Miércoles, Viernes
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE,
    activo BOOLEAN DEFAULT TRUE,
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL
);

-- Tabla de tareas
CREATE TABLE tareas (
    id_tarea INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    id_categoria INT,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT,
    fecha_vencimiento DATE,
    hora_vencimiento TIME,
    completada BOOLEAN DEFAULT FALSE,
    prioridad INT DEFAULT 3 CHECK (prioridad BETWEEN 1 AND 5),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_categoria) REFERENCES categorias(id_categoria) ON DELETE SET NULL
);

-- Tabla de registros diarios de hábitos
CREATE TABLE registros_habitos (
    id_registro INT PRIMARY KEY AUTO_INCREMENT,
    id_habito INT NOT NULL,
    fecha DATE NOT NULL,
    completado BOOLEAN DEFAULT FALSE,
    notas TEXT,
    calificacion INT CHECK (calificacion BETWEEN 1 AND 5),
    tiempo_dedicado_minutos INT DEFAULT 0,
    registrado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (id_habito) REFERENCES habitos(id_habito) ON DELETE CASCADE,
    UNIQUE KEY unique_habito_fecha (id_habito, fecha)
);

-- Tabla de logros predefinidos
CREATE TABLE logros (
    id_logro INT PRIMARY KEY AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    icono VARCHAR(50),
    tipo ENUM('habitos', 'racha', 'productividad', 'consistencia') NOT NULL,
    valor_requerido INT NOT NULL,
    meta_dias INT
);

-- Tabla de logros desbloqueados por usuarios
CREATE TABLE logros_usuarios (
    id_usuario INT NOT NULL,
    id_logro INT NOT NULL,
    fecha_desbloqueo DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id_usuario, id_logro),
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    FOREIGN KEY (id_logro) REFERENCES logros(id_logro) ON DELETE CASCADE
);

-- Tabla de estadísticas diarias
CREATE TABLE estadisticas_usuarios (
    id_estadistica INT PRIMARY KEY AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    fecha DATE NOT NULL,
    habitos_completados INT DEFAULT 0,
    tareas_completadas INT DEFAULT 0,
    racha_actual INT DEFAULT 0,
    racha_maxima INT DEFAULT 0,
    tiempo_productivo_minutos INT DEFAULT 0,
    FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE,
    UNIQUE KEY unique_usuario_fecha (id_usuario, fecha)
);

-- Trigger para actualizar estadísticas al completar un hábito
DELIMITER //
CREATE TRIGGER after_registro_habito_update
AFTER UPDATE ON registros_habitos
FOR EACH ROW
BEGIN
    IF NEW.completado != OLD.completado THEN
        -- Actualizar estadísticas del usuario para esa fecha
        INSERT INTO estadisticas_usuarios (id_usuario, fecha, habitos_completados)
        VALUES (
            (SELECT id_usuario FROM habitos WHERE id_habito = NEW.id_habito),
            NEW.fecha,
            1
        )
        ON DUPLICATE KEY UPDATE
        habitos_completados = habitos_completados + IF(NEW.completado = TRUE, 1, -1);
    END IF;
END;
//
DELIMITER ;

-- Vista para dashboard principal
CREATE VIEW vista_dashboard AS
SELECT 
    u.id_usuario,
    u.nombre,
    COUNT(DISTINCT h.id_habito) as total_habitos,
    COUNT(DISTINCT t.id_tarea) as total_tareas,
    COALESCE(SUM(CASE WHEN DATE(rh.fecha) = CURDATE() AND rh.completado = TRUE THEN 1 ELSE 0 END), 0) as habitos_hoy,
    COALESCE(SUM(CASE WHEN DATE(t.fecha_vencimiento) = CURDATE() AND t.completada = TRUE THEN 1 ELSE 0 END), 0) as tareas_hoy,
    eu.racha_actual
FROM usuarios u
LEFT JOIN habitos h ON u.id_usuario = h.id_usuario AND h.activo = TRUE
LEFT JOIN tareas t ON u.id_usuario = t.id_usuario
LEFT JOIN registros_habitos rh ON h.id_habito = rh.id_habito
LEFT JOIN estadisticas_usuarios eu ON u.id_usuario = eu.id_usuario AND eu.fecha = CURDATE()
GROUP BY u.id_usuario;