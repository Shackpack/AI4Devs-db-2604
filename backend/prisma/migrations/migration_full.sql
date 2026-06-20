-- ============================================================
-- MIGRACIÓN COMPLETA — LTIdb (AI4Devs-db-2604)
-- Fecha: 2026-06-20
-- Descripción: Migración desde esquema original (4 tablas PascalCase)
--              al esquema optimizado (20 tablas snake_case) con
--              normalización 1FN/2FN/3FN y datos de referencia.
--
-- PRERREQUISITOS:
--   - BD PostgreSQL con las 4 tablas originales:
--     "Candidate", "Education", "Resume", "WorkExperience"
--   - Los datos de "Candidate.address" deben existir antes de la Fase 3
--
-- EJECUCIÓN:
--   psql -h <host> -U <user> -d <dbname> -f migration_full.sql
--   o bien:
--   npx prisma db execute --file prisma/migrations/migration_full.sql --schema prisma/schema.prisma
--
-- FASES:
--   Fase 2 — Crear tablas nuevas (additive, sin tocar las existentes)
--   Fase 3 — Migrar datos existentes + seed de referencia
--   Fase 5 — Renombrar tablas originales a snake_case
--   Fase 6 — Eliminar columna obsoleta address de candidates
-- ============================================================


-- ============================================================
-- FASE 2: Crear tablas nuevas
-- Tablas existentes intactas: "Candidate", "Education", "Resume", "WorkExperience"
-- ============================================================

-- 1. companies
CREATE TABLE IF NOT EXISTS "companies" (
  "id"         SERIAL PRIMARY KEY,
  "name"       VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. interview_types
CREATE TABLE IF NOT EXISTS "interview_types" (
  "id"          SERIAL PRIMARY KEY,
  "name"        VARCHAR(100) NOT NULL,
  "description" TEXT,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. interview_flows
CREATE TABLE IF NOT EXISTS "interview_flows" (
  "id"          SERIAL PRIMARY KEY,
  "description" TEXT NOT NULL,
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 4. interview_steps
CREATE TABLE IF NOT EXISTS "interview_steps" (
  "id"                SERIAL PRIMARY KEY,
  "interview_flow_id" INTEGER NOT NULL,
  "interview_type_id" INTEGER NOT NULL,
  "name"              VARCHAR(255) NOT NULL,
  "order_index"       INTEGER NOT NULL,
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "interview_steps_flow_fk"          FOREIGN KEY ("interview_flow_id") REFERENCES "interview_flows"("id") ON DELETE CASCADE,
  CONSTRAINT "interview_steps_type_fk"          FOREIGN KEY ("interview_type_id") REFERENCES "interview_types"("id") ON DELETE RESTRICT,
  CONSTRAINT "interview_steps_flow_order_unique" UNIQUE ("interview_flow_id", "order_index")
);
CREATE INDEX IF NOT EXISTS "interview_steps_flow_idx" ON "interview_steps"("interview_flow_id");

-- 5. salary_ranges
CREATE TABLE IF NOT EXISTS "salary_ranges" (
  "id"            SERIAL PRIMARY KEY,
  "name"          VARCHAR(100) NOT NULL,
  "min_salary"    DECIMAL(10,2) NOT NULL,
  "max_salary"    DECIMAL(10,2) NOT NULL,
  "currency"      VARCHAR(3) NOT NULL DEFAULT 'USD',
  "pay_frequency" VARCHAR(50) NOT NULL DEFAULT 'annually',
  "level"         VARCHAR(50),
  "created_at"    TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 6. benefit_types
CREATE TABLE IF NOT EXISTS "benefit_types" (
  "id"          SERIAL PRIMARY KEY,
  "name"        VARCHAR(100) NOT NULL,
  "description" TEXT,
  "category"    VARCHAR(50),
  "created_at"  TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 7. employees
CREATE TABLE IF NOT EXISTS "employees" (
  "id"         SERIAL PRIMARY KEY,
  "company_id" INTEGER NOT NULL,
  "name"       VARCHAR(255) NOT NULL,
  "email"      VARCHAR(255) NOT NULL UNIQUE,
  "role"       VARCHAR(100),
  "is_active"  BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "employees_company_fk" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "employees_company_idx" ON "employees"("company_id");

-- 8. positions
CREATE TABLE IF NOT EXISTS "positions" (
  "id"                   SERIAL PRIMARY KEY,
  "company_id"           INTEGER NOT NULL,
  "interview_flow_id"    INTEGER NOT NULL,
  "title"                VARCHAR(255) NOT NULL,
  "description"          TEXT,
  "status"               VARCHAR(50) NOT NULL DEFAULT 'active',
  "is_visible"           BOOLEAN NOT NULL DEFAULT TRUE,
  "location"             VARCHAR(255),
  "job_description"      TEXT,
  "salary_range_id"      INTEGER,
  "employment_type"      VARCHAR(50),
  "company_description"  TEXT,
  "application_deadline" DATE,
  "created_at"           TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "positions_company_fk"      FOREIGN KEY ("company_id")        REFERENCES "companies"("id")       ON DELETE CASCADE,
  CONSTRAINT "positions_flow_fk"         FOREIGN KEY ("interview_flow_id") REFERENCES "interview_flows"("id") ON DELETE RESTRICT,
  CONSTRAINT "positions_salary_range_fk" FOREIGN KEY ("salary_range_id")   REFERENCES "salary_ranges"("id")  ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS "positions_company_idx"        ON "positions"("company_id");
CREATE INDEX IF NOT EXISTS "positions_status_idx"         ON "positions"("status");
CREATE INDEX IF NOT EXISTS "positions_company_status_idx" ON "positions"("company_id", "status");

-- 9. addresses (normalización de Candidate.address → tabla propia)
CREATE TABLE IF NOT EXISTS "addresses" (
  "id"           SERIAL PRIMARY KEY,
  "candidate_id" INTEGER NOT NULL,
  "street"       VARCHAR(255),
  "city"         VARCHAR(100),
  "state"        VARCHAR(100),
  "country"      VARCHAR(100),
  "zip_code"     VARCHAR(20),
  "address_type" VARCHAR(50) NOT NULL DEFAULT 'home',
  "is_primary"   BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "addresses_candidate_fk" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "addresses_candidate_idx"         ON "addresses"("candidate_id");
CREATE INDEX IF NOT EXISTS "addresses_candidate_primary_idx" ON "addresses"("candidate_id", "is_primary");

-- 10. applications
CREATE TABLE IF NOT EXISTS "applications" (
  "id"               SERIAL PRIMARY KEY,
  "position_id"      INTEGER NOT NULL,
  "candidate_id"     INTEGER NOT NULL,
  "application_date" DATE NOT NULL DEFAULT CURRENT_DATE,
  "status"           VARCHAR(50) NOT NULL DEFAULT 'pending',
  "notes"            TEXT,
  "created_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "applications_position_fk"  FOREIGN KEY ("position_id")  REFERENCES "positions"("id")  ON DELETE CASCADE,
  CONSTRAINT "applications_candidate_fk" FOREIGN KEY ("candidate_id") REFERENCES "Candidate"("id") ON DELETE CASCADE,
  CONSTRAINT "applications_unique"        UNIQUE ("position_id", "candidate_id")
);
CREATE INDEX IF NOT EXISTS "applications_position_idx"        ON "applications"("position_id");
CREATE INDEX IF NOT EXISTS "applications_candidate_idx"       ON "applications"("candidate_id");
CREATE INDEX IF NOT EXISTS "applications_status_idx"          ON "applications"("status");
CREATE INDEX IF NOT EXISTS "applications_position_status_idx" ON "applications"("position_id", "status");

-- 11. interviews
CREATE TABLE IF NOT EXISTS "interviews" (
  "id"                SERIAL PRIMARY KEY,
  "application_id"    INTEGER NOT NULL,
  "interview_step_id" INTEGER NOT NULL,
  "employee_id"       INTEGER NOT NULL,
  "interview_date"    DATE NOT NULL,
  "result"            VARCHAR(50),
  "score"             INTEGER CHECK ("score" >= 0 AND "score" <= 100),
  "notes"             TEXT,
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "interviews_application_fk" FOREIGN KEY ("application_id")    REFERENCES "applications"("id")    ON DELETE CASCADE,
  CONSTRAINT "interviews_step_fk"        FOREIGN KEY ("interview_step_id") REFERENCES "interview_steps"("id") ON DELETE RESTRICT,
  CONSTRAINT "interviews_employee_fk"    FOREIGN KEY ("employee_id")       REFERENCES "employees"("id")       ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS "interviews_application_idx"   ON "interviews"("application_id");
CREATE INDEX IF NOT EXISTS "interviews_employee_idx"      ON "interviews"("employee_id");
CREATE INDEX IF NOT EXISTS "interviews_date_idx"          ON "interviews"("interview_date");
CREATE INDEX IF NOT EXISTS "interviews_employee_date_idx" ON "interviews"("employee_id", "interview_date");

-- 12. position_contacts
CREATE TABLE IF NOT EXISTS "position_contacts" (
  "id"                 SERIAL PRIMARY KEY,
  "position_id"        INTEGER NOT NULL,
  "contact_name"       VARCHAR(255),
  "contact_email"      VARCHAR(255),
  "contact_phone"      VARCHAR(20),
  "contact_department" VARCHAR(100),
  "is_primary"         BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"         TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "position_contacts_position_fk" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "position_contacts_position_idx"         ON "position_contacts"("position_id");
CREATE INDEX IF NOT EXISTS "position_contacts_position_primary_idx" ON "position_contacts"("position_id", "is_primary");

-- 13. position_benefits
CREATE TABLE IF NOT EXISTS "position_benefits" (
  "position_id" INTEGER NOT NULL,
  "benefit_id"  INTEGER NOT NULL,
  "details"     TEXT,
  CONSTRAINT "position_benefits_pk"          PRIMARY KEY ("position_id", "benefit_id"),
  CONSTRAINT "position_benefits_position_fk" FOREIGN KEY ("position_id") REFERENCES "positions"("id")     ON DELETE CASCADE,
  CONSTRAINT "position_benefits_benefit_fk"  FOREIGN KEY ("benefit_id")  REFERENCES "benefit_types"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "position_benefits_position_idx" ON "position_benefits"("position_id");
CREATE INDEX IF NOT EXISTS "position_benefits_benefit_idx"  ON "position_benefits"("benefit_id");

-- 14. requirements
CREATE TABLE IF NOT EXISTS "requirements" (
  "id"                SERIAL PRIMARY KEY,
  "position_id"       INTEGER NOT NULL,
  "requirement_type"  VARCHAR(50) NOT NULL,
  "description"       TEXT NOT NULL,
  "is_mandatory"      BOOLEAN NOT NULL DEFAULT TRUE,
  "years_experience"  INTEGER,
  "proficiency_level" VARCHAR(50),
  "created_at"        TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "requirements_position_fk" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "requirements_position_idx"      ON "requirements"("position_id");
CREATE INDEX IF NOT EXISTS "requirements_position_type_idx" ON "requirements"("position_id", "requirement_type");

-- 15. responsibilities
CREATE TABLE IF NOT EXISTS "responsibilities" (
  "id"              SERIAL PRIMARY KEY,
  "position_id"     INTEGER NOT NULL,
  "description"     TEXT NOT NULL,
  "priority_level"  VARCHAR(50) NOT NULL DEFAULT 'medium',
  "percentage_time" INTEGER,
  "created_at"      TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT "responsibilities_position_fk" FOREIGN KEY ("position_id") REFERENCES "positions"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "responsibilities_position_idx"          ON "responsibilities"("position_id");
CREATE INDEX IF NOT EXISTS "responsibilities_position_priority_idx" ON "responsibilities"("position_id", "priority_level");

-- 16. audit_logs
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id"         SERIAL PRIMARY KEY,
  "table_name" VARCHAR(50) NOT NULL,
  "record_id"  INTEGER NOT NULL,
  "operation"  VARCHAR(50) NOT NULL,
  "old_values" JSONB,
  "new_values" JSONB,
  "changed_by" VARCHAR(255),
  "changed_at" TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS "audit_logs_table_record_idx" ON "audit_logs"("table_name", "record_id");
CREATE INDEX IF NOT EXISTS "audit_logs_changed_at_idx"   ON "audit_logs"("changed_at");


-- ============================================================
-- FASE 3: Migrar datos existentes + seed de referencia
-- ============================================================

-- 3a. Migrar campo address de "Candidate" → tabla addresses
-- (idempotente: no inserta si ya existe registro para ese candidate_id)
INSERT INTO addresses (candidate_id, street, address_type, is_primary, created_at, updated_at)
SELECT id, address, 'home', true, NOW(), NOW()
FROM "Candidate"
WHERE address IS NOT NULL AND address <> ''
  AND id NOT IN (SELECT candidate_id FROM addresses);

-- 3b. Seed: interview_types
INSERT INTO interview_types (name, description, created_at, updated_at) VALUES
  ('Telefónica',      'Entrevista inicial por teléfono',         NOW(), NOW()),
  ('Técnica',         'Evaluación de habilidades técnicas',      NOW(), NOW()),
  ('Cultural',        'Ajuste cultural con el equipo',           NOW(), NOW()),
  ('Final',           'Entrevista final con el responsable',     NOW(), NOW()),
  ('Prueba práctica', 'Evaluación práctica de habilidades',      NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3b. Seed: interview_flows
INSERT INTO interview_flows (description, created_at, updated_at) VALUES
  ('Flujo estándar para desarrolladores', NOW(), NOW()),
  ('Flujo rápido para posiciones junior', NOW(), NOW()),
  ('Flujo ejecutivo para roles senior',   NOW(), NOW()),
  ('Flujo técnico especializado',         NOW(), NOW())
ON CONFLICT DO NOTHING;

-- 3b. Seed: interview_steps (vincula flows con types por nombre)
INSERT INTO interview_steps (interview_flow_id, interview_type_id, name, order_index, created_at, updated_at)
SELECT f.id, t.id, t.name || ' (' || f.description || ')', step.order_index, NOW(), NOW()
FROM (VALUES
  ('Flujo estándar para desarrolladores', 'Telefónica',       1),
  ('Flujo estándar para desarrolladores', 'Técnica',          2),
  ('Flujo estándar para desarrolladores', 'Cultural',         3),
  ('Flujo estándar para desarrolladores', 'Final',            4),
  ('Flujo rápido para posiciones junior', 'Telefónica',       1),
  ('Flujo rápido para posiciones junior', 'Cultural',         2),
  ('Flujo ejecutivo para roles senior',   'Telefónica',       1),
  ('Flujo ejecutivo para roles senior',   'Técnica',          2),
  ('Flujo ejecutivo para roles senior',   'Prueba práctica',  3),
  ('Flujo ejecutivo para roles senior',   'Final',            4)
) AS step(flow_desc, type_name, order_index)
JOIN interview_flows f ON f.description = step.flow_desc
JOIN interview_types t ON t.name = step.type_name
ON CONFLICT (interview_flow_id, order_index) DO NOTHING;

-- 3b. Seed: salary_ranges
INSERT INTO salary_ranges (name, min_salary, max_salary, currency, pay_frequency, level, created_at) VALUES
  ('Entry Level',      30000,  50000,  'EUR', 'annually', 'junior',    NOW()),
  ('Mid Level',        50000,  80000,  'EUR', 'annually', 'mid',       NOW()),
  ('Senior Level',     80000,  120000, 'EUR', 'annually', 'senior',    NOW()),
  ('Lead Level',       120000, 160000, 'EUR', 'annually', 'lead',      NOW()),
  ('Executive Level',  160000, 250000, 'EUR', 'annually', 'executive', NOW())
ON CONFLICT DO NOTHING;

-- 3b. Seed: benefit_types
INSERT INTO benefit_types (name, description, category, created_at) VALUES
  ('Seguro médico',      'Cobertura médica completa',        'health',      NOW()),
  ('Seguro dental',      'Cobertura dental',                 'health',      NOW()),
  ('Plan de pensiones',  'Aportación a plan de pensiones',   'financial',   NOW()),
  ('Días de vacaciones', 'Días de vacaciones anuales',       'time_off',    NOW()),
  ('Trabajo remoto',     'Opción de trabajo en remoto',      'flexibility', NOW()),
  ('Formación',          'Budget anual para formación',      'development', NOW()),
  ('Ticket restaurante', 'Ticket restaurante diario',        'benefits',    NOW())
ON CONFLICT DO NOTHING;


-- ============================================================
-- FASE 5: Renombrar tablas originales a snake_case
-- Usa ALTER RENAME — no elimina datos
-- ============================================================

-- Tablas
ALTER TABLE "Candidate"      RENAME TO candidates;
ALTER TABLE "Education"      RENAME TO educations;
ALTER TABLE "Resume"         RENAME TO resumes;
ALTER TABLE "WorkExperience" RENAME TO work_experiences;

-- Secuencias
ALTER SEQUENCE "Candidate_id_seq"      RENAME TO candidates_id_seq;
ALTER SEQUENCE "Education_id_seq"      RENAME TO educations_id_seq;
ALTER SEQUENCE "Resume_id_seq"         RENAME TO resumes_id_seq;
ALTER SEQUENCE "WorkExperience_id_seq" RENAME TO work_experiences_id_seq;

-- Índices
ALTER INDEX "Candidate_pkey"      RENAME TO candidates_pkey;
ALTER INDEX "Candidate_email_key" RENAME TO candidates_email_key;
ALTER INDEX "Education_pkey"      RENAME TO educations_pkey;
ALTER INDEX "Resume_pkey"         RENAME TO resumes_pkey;
ALTER INDEX "WorkExperience_pkey" RENAME TO work_experiences_pkey;


-- ============================================================
-- FASE 6: Eliminar columna obsoleta
-- PRERREQUISITO: datos de address ya migrados a tabla addresses
-- ============================================================

ALTER TABLE candidates DROP COLUMN IF EXISTS address;

-- Actualizar estadísticas
ANALYZE candidates;
ANALYZE addresses;
