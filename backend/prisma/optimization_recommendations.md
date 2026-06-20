# Recomendaciones de Normalización e Índices - Esquema Propuesto

## 1. Normalizaciones Adicionales Recomendadas

### 1.1 Descomposición de Direcciones (CANDIDATE)

**Problema:** El campo `address` no es atómico y contiene múltiples componentes.

**Solución:** Crear tabla separada para direcciones
```sql
CREATE TABLE ADDRESS (
    id INT PRIMARY KEY AUTO_INCREMENT,
    candidate_id INT NOT NULL,
    street VARCHAR(255),
    city VARCHAR(100),
    state VARCHAR(100),
    country VARCHAR(100),
    zip_code VARCHAR(20),
    address_type ENUM('home', 'work', 'other') DEFAULT 'home',
    is_primary BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(id) ON DELETE CASCADE
);
```

### 1.2 Normalización de Información de Contacto (POSITION)

**Problema:** `contact_info` es un campo TEXT no estructurado.

**Solución:** Tabla de contactos estructurada
```sql
CREATE TABLE POSITION_CONTACT (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_department VARCHAR(100),
    is_primary BOOLEAN DEFAULT TRUE,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);
```

### 1.3 Normalización de Beneficios (POSITION)

**Problema:** `benefits` es un campo TEXT no estructurado.

**Solución:** Tabla de beneficios con relación muchos-a-muchos
```sql
CREATE TABLE BENEFIT_TYPE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50)
);

CREATE TABLE POSITION_BENEFIT (
    position_id INT NOT NULL,
    benefit_id INT NOT NULL,
    details TEXT,
    PRIMARY KEY (position_id, benefit_id),
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE,
    FOREIGN KEY (benefit_id) REFERENCES BENEFIT_TYPE(id) ON DELETE CASCADE
);
```

### 1.4 Normalización de Requisitos y Responsabilidades (POSITION)

**Problema:** Campos TEXT que podrían ser estructurados.

**Solución:** Tablas separadas para mejor búsqueda y filtrado
```sql
CREATE TABLE REQUIREMENT (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    requirement_type ENUM('skill', 'experience', 'education', 'certification', 'language'),
    description TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    years_experience INT,
    proficiency_level ENUM('basic', 'intermediate', 'advanced', 'expert'),
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);

CREATE TABLE RESPONSIBILITY (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    description TEXT NOT NULL,
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    percentage_time INT,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);
```

### 1.5 Normalización de Salarios (POSITION)

**Problema:** Rangos salariales podrían estandarizarse.

**Solución:** Tabla de rangos salariales
```sql
CREATE TABLE SALARY_RANGE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    min_salary DECIMAL(10,2) NOT NULL,
    max_salary DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    pay_frequency ENUM('hourly', 'monthly', 'annually') DEFAULT 'annually',
    level VARCHAR(50)
);

-- Modificar POSITION para usar salary_range_id
ALTER TABLE POSITION ADD COLUMN salary_range_id INT,
ADD FOREIGN KEY (salary_range_id) REFERENCES SALARY_RANGE(id);
```

### 1.6 Auditoría Mejorada

**Solución:** Tabla de auditoría unificada
```sql
CREATE TABLE AUDIT_LOG (
    id INT PRIMARY KEY AUTO_INCREMENT,
    table_name VARCHAR(50) NOT NULL,
    record_id INT NOT NULL,
    operation ENUM('INSERT', 'UPDATE', 'DELETE') NOT NULL,
    old_values JSON,
    new_values JSON,
    changed_by VARCHAR(255),
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_audit_table_record (table_name, record_id),
    INDEX idx_audit_date (changed_at)
);
```

## 2. Índices Optimizados para Rendimiento

### 2.1 Índices Compuestos para Consultas Frecuentes

```sql
-- Para búsquedas de posiciones por empresa y estado
CREATE INDEX idx_position_company_status ON POSITION(company_id, status);

-- Para búsquedas de aplicaciones por posición y estado
CREATE INDEX idx_application_position_status ON APPLICATION(position_id, status);

-- Para entrevistas por empleado y fecha
CREATE INDEX idx_interview_employee_date ON INTERVIEW(employee_id, interview_date);

-- Para candidatos por nombre completo
CREATE INDEX idx_candidate_full_name ON CANDIDATE(lastName, firstName);

-- Para posiciones por salario y ubicación
CREATE INDEX idx_position_salary_location ON POSITION(salary_min, location);

-- Para aplicaciones por fecha y estado
CREATE INDEX idx_application_date_status ON APPLICATION(application_date, status);
```

### 2.2 Índices de Cobertura para Vistas

```sql
-- Índice para vista v_candidate_applications
CREATE INDEX idx_candidate_applications_covering ON 
APPLICATION(position_id, candidate_id, application_date, status)
INCLUDE (id);

-- Índice para vista v_position_details
CREATE INDEX idx_position_details_covering ON 
POSITION(company_id, status)
INCLUDE (title, location, salary_min, salary_max, employment_type, application_deadline);
```

### 2.3 Índices de Texto Completo

```sql
-- Para búsqueda en descripciones de posiciones
CREATE FULLTEXT INDEX idx_position_fulltext ON 
POSITION(title, description, job_description);

-- Para búsqueda en candidatos
CREATE FULLTEXT INDEX idx_candidate_fulltext ON 
CANDIDATE(firstName, lastName, email);

-- Para búsqueda en notas de entrevistas
CREATE FULLTEXT INDEX idx_interview_notes_fulltext ON 
INTERVIEW(notes);
```

### 2.4 Índices Particionados (para tablas grandes)

```sql
-- Para tabla INTERVIEW particionada por año
CREATE INDEX idx_interview_partitioned ON INTERVIEW(interview_date, application_id)
USING BTREE;

-- Para tabla APPLICATION particionada por mes
CREATE INDEX idx_application_partitioned ON APPLICATION(application_date, position_id)
USING BTREE;
```

## 3. Estrategias de Optimización Adicionales

### 3.1 Vistas Materializadas

```sql
-- Vista materializada para estadísticas de aplicaciones
CREATE MATERIALIZED VIEW mv_application_stats AS
SELECT 
    p.id as position_id,
    p.title,
    COUNT(a.id) as total_applications,
    COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
    AVG(i.score) as avg_interview_score
FROM POSITION p
LEFT JOIN APPLICATION a ON p.id = a.position_id
LEFT JOIN INTERVIEW i ON a.id = i.application_id
GROUP BY p.id, p.title;

-- Índice para la vista materializada
CREATE INDEX idx_mv_app_stats_position ON mv_application_stats(position_id);
```

### 3.2 Funciones y Procedimientos Almacenados

```sql
-- Función para calcular tasa de conversión
DELIMITER //
CREATE FUNCTION calculate_conversion_rate(position_id INT) 
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_apps INT;
    DECLARE accepted_apps INT;
    
    SELECT COUNT(*) INTO total_apps 
    FROM APPLICATION WHERE position_id = position_id;
    
    SELECT COUNT(*) INTO accepted_apps 
    FROM APPLICATION WHERE position_id = position_id AND status = 'accepted';
    
    IF total_apps = 0 THEN
        RETURN 0;
    ELSE
        RETURN (accepted_apps / total_apps) * 100;
    END IF;
END //
DELIMITER ;
```

### 3.3 Triggers para Auditoría Automática

```sql
-- Trigger para auditoría de cambios
DELIMITER //
CREATE TRIGGER audit_position_changes
AFTER UPDATE ON POSITION
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status OR OLD.salary_min != NEW.salary_min THEN
        INSERT INTO AUDIT_LOG (table_name, record_id, operation, old_values, new_values)
        VALUES ('POSITION', NEW.id, 'UPDATE', 
                JSON_OBJECT('status', OLD.status, 'salary_min', OLD.salary_min),
                JSON_OBJECT('status', NEW.status, 'salary_min', NEW.salary_min));
    END IF;
END //
DELIMITER ;
```

## 4. Recomendaciones de Implementación

### 4.1 Prioridad Alta
1. **Índices compuestos** para consultas críticas
2. **Vistas materializadas** para reportes frecuentes
3. **Auditoría básica** con timestamps

### 4.2 Prioridad Media
1. **Normalización de direcciones** y contactos
2. **Índices de texto completo** para búsquedas
3. **Funciones almacenadas** para lógica de negocio

### 4.3 Prioridad Baja
1. **Normalización completa** de beneficios y requisitos
2. **Particionamiento** de tablas grandes
3. **Triggers complejos** de auditoría

## 5. Impacto en Rendimiento

| Optimización | Impacto Consultas | Impacto Insert/Update | Complejidad |
|-------------|-------------------|----------------------|-------------|
| Índices Compuestos | ⭐⭐⭐⭐⭐ | ⭐⭐ | Baja |
| Vistas Materializadas | ⭐⭐⭐⭐⭐ | ⭐ | Media |
| Normalización Direcciones | ⭐⭐ | ⭐⭐ | Media |
| Índices Texto Completo | ⭐⭐⭐⭐ | ⭐⭐ | Baja |
| Auditoría Completa | ⭐ | ⭐⭐⭐ | Alta |

## 6. Script de Implementación

El script completo con todas estas mejoras está disponible en `backend/prisma/schema_optimized.sql`.
