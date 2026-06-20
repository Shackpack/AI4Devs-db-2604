-- Script SQL Optimizado con Normalizaciones Adicionales e Índices
-- Basado en el ERD original con mejoras de rendimiento y estructura

-- Creación de la base de datos (opcional)
-- CREATE DATABASE hr_recruitment_optimized;
-- USE hr_recruitment_optimized;

-- Tablas principales del sistema
CREATE TABLE COMPANY (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE INTERVIEW_TYPE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE INTERVIEW_FLOW (
    id INT PRIMARY KEY AUTO_INCREMENT,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE INTERVIEW_STEP (
    id INT PRIMARY KEY AUTO_INCREMENT,
    interview_flow_id INT NOT NULL,
    interview_type_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    order_index INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (interview_flow_id) REFERENCES INTERVIEW_FLOW(id) ON DELETE CASCADE,
    FOREIGN KEY (interview_type_id) REFERENCES INTERVIEW_TYPE(id) ON DELETE RESTRICT,
    UNIQUE KEY unique_step_order (interview_flow_id, order_index)
);

CREATE TABLE EMPLOYEE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    role VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES COMPANY(id) ON DELETE CASCADE
);

-- Tablas de normalización mejorada
CREATE TABLE SALARY_RANGE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    min_salary DECIMAL(10,2) NOT NULL,
    max_salary DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    pay_frequency ENUM('hourly', 'monthly', 'annually') DEFAULT 'annually',
    level VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE BENEFIT_TYPE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    category VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE POSITION (
    id INT PRIMARY KEY AUTO_INCREMENT,
    company_id INT NOT NULL,
    interview_flow_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    status VARCHAR(50) DEFAULT 'active',
    is_visible BOOLEAN DEFAULT TRUE,
    location VARCHAR(255),
    job_description TEXT,
    salary_range_id INT,
    employment_type VARCHAR(50),
    company_description TEXT,
    application_deadline DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES COMPANY(id) ON DELETE CASCADE,
    FOREIGN KEY (interview_flow_id) REFERENCES INTERVIEW_FLOW(id) ON DELETE RESTRICT,
    FOREIGN KEY (salary_range_id) REFERENCES SALARY_RANGE(id) ON DELETE SET NULL
);

CREATE TABLE POSITION_CONTACT (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    contact_name VARCHAR(255),
    contact_email VARCHAR(255),
    contact_phone VARCHAR(20),
    contact_department VARCHAR(100),
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);

CREATE TABLE POSITION_BENEFIT (
    position_id INT NOT NULL,
    benefit_id INT NOT NULL,
    details TEXT,
    PRIMARY KEY (position_id, benefit_id),
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE,
    FOREIGN KEY (benefit_id) REFERENCES BENEFIT_TYPE(id) ON DELETE CASCADE
);

CREATE TABLE REQUIREMENT (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    requirement_type ENUM('skill', 'experience', 'education', 'certification', 'language'),
    description TEXT NOT NULL,
    is_mandatory BOOLEAN DEFAULT TRUE,
    years_experience INT,
    proficiency_level ENUM('basic', 'intermediate', 'advanced', 'expert'),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);

CREATE TABLE RESPONSIBILITY (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    description TEXT NOT NULL,
    priority_level ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    percentage_time INT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);

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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(id) ON DELETE CASCADE
);

CREATE TABLE CANDIDATE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE APPLICATION (
    id INT PRIMARY KEY AUTO_INCREMENT,
    position_id INT NOT NULL,
    candidate_id INT NOT NULL,
    application_date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE,
    FOREIGN KEY (candidate_id) REFERENCES CANDIDATE(id) ON DELETE CASCADE,
    UNIQUE KEY unique_application (position_id, candidate_id)
);

CREATE TABLE INTERVIEW (
    id INT PRIMARY KEY AUTO_INCREMENT,
    application_id INT NOT NULL,
    interview_step_id INT NOT NULL,
    employee_id INT NOT NULL,
    interview_date DATE NOT NULL,
    result VARCHAR(50),
    score INT CHECK (score >= 0 AND score <= 100),
    notes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (application_id) REFERENCES APPLICATION(id) ON DELETE CASCADE,
    FOREIGN KEY (interview_step_id) REFERENCES INTERVIEW_STEP(id) ON DELETE RESTRICT,
    FOREIGN KEY (employee_id) REFERENCES EMPLOYEE(id) ON DELETE RESTRICT
);

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

-- Índices básicos (existentes en el script original)
CREATE INDEX idx_employee_company ON EMPLOYEE(company_id);
CREATE INDEX idx_position_company ON POSITION(company_id);
CREATE INDEX idx_position_status ON POSITION(status);
CREATE INDEX idx_application_position ON APPLICATION(position_id);
CREATE INDEX idx_application_candidate ON APPLICATION(candidate_id);
CREATE INDEX idx_application_status ON APPLICATION(status);
CREATE INDEX idx_interview_application ON INTERVIEW(application_id);
CREATE INDEX idx_interview_employee ON INTERVIEW(employee_id);
CREATE INDEX idx_interview_date ON INTERVIEW(interview_date);
CREATE INDEX idx_interview_step_flow ON INTERVIEW_STEP(interview_flow_id);

-- Índices compuestos optimizados para consultas frecuentes
CREATE INDEX idx_position_company_status ON POSITION(company_id, status);
CREATE INDEX idx_application_position_status ON APPLICATION(position_id, status);
CREATE INDEX idx_interview_employee_date ON INTERVIEW(employee_id, interview_date);
CREATE INDEX idx_candidate_full_name ON CANDIDATE(lastName, firstName);
CREATE INDEX idx_position_salary_location ON POSITION(salary_range_id, location);
CREATE INDEX idx_application_date_status ON APPLICATION(application_date, status);

-- Índices de cobertura para vistas
CREATE INDEX idx_candidate_applications_covering ON APPLICATION(position_id, candidate_id, application_date, status, id);
CREATE INDEX idx_position_details_covering ON POSITION(company_id, status, title, location, salary_range_id, employment_type, application_deadline);

-- Índices para tablas de normalización
CREATE INDEX idx_address_candidate ON ADDRESS(candidate_id);
CREATE INDEX idx_address_primary ON ADDRESS(candidate_id, is_primary);
CREATE INDEX idx_position_contact_position ON POSITION_CONTACT(position_id);
CREATE INDEX idx_position_contact_primary ON POSITION_CONTACT(position_id, is_primary);
CREATE INDEX idx_requirement_position ON REQUIREMENT(position_id);
CREATE INDEX idx_requirement_type ON REQUIREMENT(position_id, requirement_type);
CREATE INDEX idx_responsibility_position ON RESPONSIBILITY(position_id);
CREATE INDEX idx_responsibility_priority ON RESPONSIBILITY(position_id, priority_level);
CREATE INDEX idx_position_benefit_position ON POSITION_BENEFIT(position_id);
CREATE INDEX idx_position_benefit_benefit ON POSITION_BENEFIT(benefit_id);

-- Índices de texto completo para búsquedas avanzadas
CREATE FULLTEXT INDEX idx_position_fulltext ON POSITION(title, description, job_description);
CREATE FULLTEXT INDEX idx_candidate_fulltext ON CANDIDATE(firstName, lastName, email);
CREATE FULLTEXT INDEX idx_interview_notes_fulltext ON INTERVIEW(notes);
CREATE FULLTEXT INDEX idx_requirement_fulltext ON REQUIREMENT(description);
CREATE FULLTEXT INDEX idx_responsibility_fulltext ON RESPONSIBILITY(description);

-- Vistas optimizadas
CREATE VIEW v_candidate_applications AS
SELECT 
    c.id as candidate_id,
    CONCAT(c.firstName, ' ', c.lastName) as candidate_name,
    c.email as candidate_email,
    p.title as position_title,
    comp.name as company_name,
    a.application_date,
    a.status as application_status,
    sr.min_salary,
    sr.max_salary,
    p.location
FROM CANDIDATE c
JOIN APPLICATION a ON c.id = a.candidate_id
JOIN POSITION p ON a.position_id = p.id
JOIN COMPANY comp ON p.company_id = comp.id
LEFT JOIN SALARY_RANGE sr ON p.salary_range_id = sr.id;

CREATE VIEW v_position_details AS
SELECT 
    p.id,
    p.title,
    p.status,
    p.location,
    sr.min_salary,
    sr.max_salary,
    sr.currency,
    p.employment_type,
    p.application_deadline,
    comp.name as company_name,
    COUNT(a.id) as application_count,
    COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
    COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
    COUNT(pb.benefit_id) as benefit_count,
    COUNT(r.id) as requirement_count
FROM POSITION p
JOIN COMPANY comp ON p.company_id = comp.id
LEFT JOIN SALARY_RANGE sr ON p.salary_range_id = sr.id
LEFT JOIN APPLICATION a ON p.id = a.position_id
LEFT JOIN POSITION_BENEFIT pb ON p.id = pb.position_id
LEFT JOIN REQUIREMENT r ON p.id = r.position_id
GROUP BY p.id, p.title, p.status, p.location, sr.min_salary, sr.max_salary, 
         sr.currency, p.employment_type, p.application_deadline, comp.name;

CREATE VIEW v_interview_pipeline AS
SELECT 
    p.id as position_id,
    p.title as position_title,
    ifs.name as flow_step,
    it.name as interview_type,
    COUNT(i.id) as interview_count,
    AVG(i.score) as avg_score,
    COUNT(CASE WHEN i.result = 'pass' THEN 1 END) as passed_count,
    COUNT(CASE WHEN i.result = 'fail' THEN 1 END) as failed_count
FROM POSITION p
JOIN INTERVIEW_FLOW iflow ON p.interview_flow_id = iflow.id
JOIN INTERVIEW_STEP ifs ON iflow.id = ifs.interview_flow_id
JOIN INTERVIEW_TYPE it ON ifs.interview_type_id = it.id
LEFT JOIN APPLICATION a ON p.id = a.position_id
LEFT JOIN INTERVIEW i ON a.id = i.application_id AND ifs.id = i.interview_step_id
GROUP BY p.id, p.title, ifs.name, it.name
ORDER BY p.id, ifs.order_index;

-- Vista materializada para estadísticas (MySQL 8.0+)
CREATE TABLE mv_application_stats (
    position_id INT PRIMARY KEY,
    title VARCHAR(255),
    total_applications INT,
    accepted_count INT,
    rejected_count INT,
    pending_count INT,
    avg_interview_score DECIMAL(5,2),
    conversion_rate DECIMAL(5,2),
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (position_id) REFERENCES POSITION(id) ON DELETE CASCADE
);

-- Función para calcular tasa de conversión
DELIMITER //
CREATE FUNCTION calculate_conversion_rate(position_id INT) 
RETURNS DECIMAL(5,2)
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE total_apps INT DEFAULT 0;
    DECLARE accepted_apps INT DEFAULT 0;
    
    SELECT COUNT(*) INTO total_apps 
    FROM APPLICATION WHERE position_id = position_id;
    
    SELECT COUNT(*) INTO accepted_apps 
    FROM APPLICATION WHERE position_id = position_id AND status = 'accepted';
    
    IF total_apps = 0 THEN
        RETURN 0;
    ELSE
        RETURN ROUND((accepted_apps / total_apps) * 100, 2);
    END IF;
END //
DELIMITER ;

-- Procedimiento para actualizar estadísticas
DELIMITER //
CREATE PROCEDURE update_application_stats()
BEGIN
    INSERT INTO mv_application_stats 
    (position_id, title, total_applications, accepted_count, rejected_count, pending_count, avg_interview_score, conversion_rate)
    SELECT 
        p.id,
        p.title,
        COUNT(a.id) as total_applications,
        COUNT(CASE WHEN a.status = 'accepted' THEN 1 END) as accepted_count,
        COUNT(CASE WHEN a.status = 'rejected' THEN 1 END) as rejected_count,
        COUNT(CASE WHEN a.status = 'pending' THEN 1 END) as pending_count,
        AVG(i.score) as avg_interview_score,
        calculate_conversion_rate(p.id) as conversion_rate
    FROM POSITION p
    LEFT JOIN APPLICATION a ON p.id = a.position_id
    LEFT JOIN INTERVIEW i ON a.id = i.application_id
    GROUP BY p.id, p.title
    ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        total_applications = VALUES(total_applications),
        accepted_count = VALUES(accepted_count),
        rejected_count = VALUES(rejected_count),
        pending_count = VALUES(pending_count),
        avg_interview_score = VALUES(avg_interview_score),
        conversion_rate = VALUES(conversion_rate),
        last_updated = CURRENT_TIMESTAMP;
END //
DELIMITER ;

-- Trigger para auditoría automática
DELIMITER //
CREATE TRIGGER audit_position_changes
AFTER UPDATE ON POSITION
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status OR OLD.title != NEW.title THEN
        INSERT INTO AUDIT_LOG (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES ('POSITION', NEW.id, 'UPDATE', 
                JSON_OBJECT('status', OLD.status, 'title', OLD.title),
                JSON_OBJECT('status', NEW.status, 'title', NEW.title),
                CURRENT_USER());
    END IF;
END //

CREATE TRIGGER audit_application_changes
AFTER UPDATE ON APPLICATION
FOR EACH ROW
BEGIN
    IF OLD.status != NEW.status THEN
        INSERT INTO AUDIT_LOG (table_name, record_id, operation, old_values, new_values, changed_by)
        VALUES ('APPLICATION', NEW.id, 'UPDATE', 
                JSON_OBJECT('status', OLD.status),
                JSON_OBJECT('status', NEW.status),
                CURRENT_USER());
    END IF;
END //

CREATE TRIGGER audit_interview_changes
AFTER INSERT ON INTERVIEW
FOR EACH ROW
BEGIN
    INSERT INTO AUDIT_LOG (table_name, record_id, operation, old_values, new_values, changed_by)
    VALUES ('INTERVIEW', NEW.id, 'INSERT', 
                NULL,
                JSON_OBJECT('application_id', NEW.application_id, 'interview_date', NEW.interview_date, 'result', NEW.result),
                CURRENT_USER());
END //
DELIMITER ;

-- Inserción de datos iniciales mejorados
INSERT INTO SALARY_RANGE (name, min_salary, max_salary, currency, pay_frequency, level) VALUES 
('Entry Level', 30000, 50000, 'USD', 'annually', 'junior'),
('Mid Level', 50000, 80000, 'USD', 'annually', 'mid'),
('Senior Level', 80000, 120000, 'USD', 'annually', 'senior'),
('Lead Level', 120000, 160000, 'USD', 'annually', 'lead'),
('Executive Level', 160000, 250000, 'USD', 'annually', 'executive');

INSERT INTO BENEFIT_TYPE (name, description, category) VALUES 
('Health Insurance', 'Comprehensive medical coverage', 'health'),
('Dental Insurance', 'Dental care coverage', 'health'),
('Vision Insurance', 'Eye care coverage', 'health'),
('401(k) Matching', 'Retirement savings matching', 'financial'),
('Paid Time Off', 'Vacation and sick leave', 'time_off'),
('Remote Work', 'Flexible work location', 'flexibility'),
('Professional Development', 'Training and education budget', 'career'),
('Gym Membership', 'Fitness benefits', 'wellness');

INSERT INTO INTERVIEW_TYPE (name, description) VALUES 
('Telefónica', 'Entrevista inicial por teléfono para preselección'),
('Técnica', 'Entrevista técnica para evaluar habilidades específicas'),
('Cultural', 'Entrevista para evaluar el ajuste con la cultura de la empresa'),
('Final', 'Entrevista final con el gerente o director'),
('Prueba práctica', 'Evaluación práctica de habilidades'),
('Psicométrica', 'Evaluación de competencias blandas y personalidad');

INSERT INTO INTERVIEW_FLOW (description) VALUES 
('Flujo estándar para desarrolladores'),
('Flujo rápido para posiciones junior'),
('Flujo ejecutivo para roles senior'),
('Flujo técnico especializado'),
('Flujo para roles de ventas y marketing');

-- Evento para actualizar estadísticas automáticamente (MySQL 8.0+)
-- CREATE EVENT update_stats_event
-- ON SCHEDULE EVERY 1 HOUR
-- DO CALL update_application_stats();

-- Comentarios de documentación
ALTER TABLE COMPANY COMMENT 'Tabla de empresas/clientes del sistema';
ALTER TABLE EMPLOYEE COMMENT 'Empleados que participan en procesos de reclutamiento';
ALTER TABLE POSITION COMMENT 'Posiciones vacantes disponibles';
ALTER TABLE CANDIDATE COMMENT 'Candidatos que aplican a posiciones';
ALTER TABLE APPLICATION COMMENT 'Aplicaciones de candidatos a posiciones específicas';
ALTER TABLE INTERVIEW COMMENT 'Entrevistas programadas y realizadas';
ALTER TABLE SALARY_RANGE COMMENT 'Rangos salariales estandarizados';
ALTER TABLE BENEFIT_TYPE COMMENT 'Catálogo de beneficios disponibles';
ALTER TABLE AUDIT_LOG COMMENT 'Registro de auditoría de cambios en el sistema';
