-- ============================================================
-- FASE 5: Renombrar tablas existentes con ALTER TABLE RENAME
-- NO se elimina ninguna tabla ni columna. Cero pérdida de datos.
-- ============================================================

-- 1. Renombrar tablas
ALTER TABLE "Candidate"      RENAME TO candidates;
ALTER TABLE "Education"      RENAME TO educations;
ALTER TABLE "Resume"         RENAME TO resumes;
ALTER TABLE "WorkExperience" RENAME TO work_experiences;

-- 2. Renombrar secuencias
ALTER SEQUENCE "Candidate_id_seq"      RENAME TO candidates_id_seq;
ALTER SEQUENCE "Education_id_seq"      RENAME TO educations_id_seq;
ALTER SEQUENCE "Resume_id_seq"         RENAME TO resumes_id_seq;
ALTER SEQUENCE "WorkExperience_id_seq" RENAME TO work_experiences_id_seq;

-- 3. Renombrar índices
ALTER INDEX "Candidate_pkey"      RENAME TO candidates_pkey;
ALTER INDEX "Candidate_email_key" RENAME TO candidates_email_key;
ALTER INDEX "Education_pkey"      RENAME TO educations_pkey;
ALTER INDEX "Resume_pkey"         RENAME TO resumes_pkey;
ALTER INDEX "WorkExperience_pkey" RENAME TO work_experiences_pkey;
