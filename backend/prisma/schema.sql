-- Script SQL generado desde el ERD Mermaid
-- Sistema de Gestión de Recursos Humanos y Reclutamiento

-- Creación de la base de datos (opcional)
-- CREATE DATABASE hr_recruitment;
-- USE hr_recruitment;

-- Tabla COMPANY
CREATE TABLE COMPANY (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla INTERVIEW_TYPE
CREATE TABLE INTERVIEW_TYPE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla INTERVIEW_FLOW
CREATE TABLE INTERVIEW_FLOW (
    id INT PRIMARY KEY AUTO_INCREMENT,
    description TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla INTERVIEW_STEP
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

-- Tabla EMPLOYEE
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

-- Tabla POSITION
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
    requirements TEXT,
    responsibilities TEXT,
    salary_min DECIMAL(10,2),
    salary_max DECIMAL(10,2),
    employment_type VARCHAR(50),
    benefits TEXT,
    company_description TEXT,
    application_deadline DATE,
    contact_info TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (company_id) REFERENCES COMPANY(id) ON DELETE CASCADE,
    FOREIGN KEY (interview_flow_id) REFERENCES INTERVIEW_FLOW(id) ON DELETE RESTRICT,
    CHECK (salary_max IS NULL OR salary_min IS NULL OR salary_max >= salary_min)
);

-- Tabla CANDIDATE
CREATE TABLE CANDIDATE (
    id INT PRIMARY KEY AUTO_INCREMENT,
    firstName VARCHAR(100) NOT NULL,
    lastName VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone VARCHAR(20),
    address TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabla APPLICATION
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

-- Tabla INTERVIEW
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

-- Índices para optimizar consultas
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

-- Vistas útiles para consultas comunes
CREATE VIEW v_candidate_applications AS
SELECT 
    c.id as candidate_id,
    CONCAT(c.firstName, ' ', c.lastName) as candidate_name,
    c.email as candidate_email,
    p.title as position_title,
    comp.name as company_name,
    a.application_date,
    a.status as application_status
FROM CANDIDATE c
JOIN APPLICATION a ON c.id = a.candidate_id
JOIN POSITION p ON a.position_id = p.id
JOIN COMPANY comp ON p.company_id = comp.id;

CREATE VIEW v_position_details AS
SELECT 
    p.id,
    p.title,
    p.status,
    p.location,
    p.salary_min,
    p.salary_max,
    p.employment_type,
    p.application_deadline,
    comp.name as company_name,
    COUNT(a.id) as application_count
FROM POSITION p
JOIN COMPANY comp ON p.company_id = comp.id
LEFT JOIN APPLICATION a ON p.id = a.position_id
GROUP BY p.id, p.title, p.status, p.location, p.salary_min, p.salary_max, 
         p.employment_type, p.application_deadline, comp.name;

-- Inserción de datos iniciales (opcional)
INSERT INTO INTERVIEW_TYPE (name, description) VALUES 
('Telefónica', 'Entrevista inicial por teléfono para preselección'),
('Técnica', 'Entrevista técnica para evaluar habilidades específicas'),
('Cultural', 'Entrevista para evaluar el ajuste con la cultura de la empresa'),
('Final', 'Entrevista final con el gerente o director'),
('Prueba práctica', 'Evaluación práctica de habilidades');

INSERT INTO INTERVIEW_FLOW (description) VALUES 
('Flujo estándar para desarrolladores'),
('Fluoso rápido para posiciones junior'),
('Fluso ejecutivo para roles senior'),
('Fluso técnico especializado');
