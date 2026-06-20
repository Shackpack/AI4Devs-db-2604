-- ============================================================
-- FASE 6: Eliminar columnas obsoletas
-- PRERREQUISITO: datos de address verificados en tabla addresses
-- ============================================================

-- Eliminar columna address de candidates (migrada a tabla addresses en Fase 3)
ALTER TABLE candidates DROP COLUMN address;

-- Actualizar estadísticas de la base de datos
ANALYZE candidates;
ANALYZE addresses;
