# Plan de Migración v2 — Seguro contra Pérdida de Datos

## Principios Rectores (Senior DB Engineer)

1. **NUNCA usar `prisma migrate dev` en una BD con datos reales** — usar `prisma migrate deploy` o SQL directo.
2. **Ninguna tabla se elimina hasta que los datos estén en la nueva estructura y validados.**
3. **Ninguna columna se elimina hasta que la nueva columna/tabla tenga los datos migrados y validados.**
4. **Cada paso es atómico: o se completa 100% o no se aplica.**
5. **Backup SQL verificable ANTES de cualquier cambio estructural.**
6. **Toda migración se prueba primero contra una copia de la BD (staging).**

---

## Contexto: Estado Real de la BD

- **4 tablas activas:** `Candidate`, `Education`, `Resume`, `WorkExperience`
- **2 registros en `Candidate`** con datos reales
- **1 migración registrada:** `20260620130944_restart`
- **Riesgo principal:** `schema_optimized.prisma` usa `@@map` en todas las tablas, lo que causaría DROP + CREATE si se aplica directamente con `migrate dev`

---

## Problema del @@map — Crítico

El `schema_optimized.prisma` mapea las tablas existentes con nuevos nombres:
- `Candidate` → `candidates`
- `Education` → `educations`
- `WorkExperience` → `work_experiences`
- `Resume` → `resumes`

**Prisma interpreta esto como: DROP tabla antigua + CREATE tabla nueva = pérdida de datos.**

**Solución:** Las tablas existentes conservarán sus nombres actuales en Prisma hasta que se complete la migración. Los `@@map` se aplicarán solo DESPUÉS de mover los datos.

---

## Estrategia: Expansión → Migración → Contracción

```
[Fase 1] Backup verificado
[Fase 2] Crear tablas NUEVAS (sin tocar las existentes)
[Fase 3] Migrar datos existentes a las nuevas estructuras
[Fase 4] Validar integridad de datos migrados
[Fase 5] Actualizar referencias en la aplicación
[Fase 6] Eliminar columnas/tablas obsoletas (SOLO tras validación)
```

---

## FASE 1: Backup Verificado

### Objetivo
Tener un backup SQL recuperable antes de cualquier cambio.

### Pasos

**1.1 Backup con Prisma (sin necesidad de pg_dump)**
```typescript
// scripts/backup_data.ts
import { PrismaClient } from '@prisma/client'
import * as fs from 'fs'

const prisma = new PrismaClient()

async function backupData() {
  const candidates = await prisma.candidate.findMany({
    include: { Education: true, WorkExperience: true, Resume: true }
  })
  
  const backup = {
    timestamp: new Date().toISOString(),
    candidates,
    education: await prisma.education.findMany(),
    workExperience: await prisma.workExperience.findMany(),
    resume: await prisma.resume.findMany(),
  }
  
  fs.writeFileSync(
    `backup_${new Date().toISOString().replace(/[:.]/g, '-')}.json`,
    JSON.stringify(backup, null, 2)
  )
  console.log(`✅ Backup completado: ${candidates.length} candidatos`)
}

backupData().catch(console.error).finally(() => prisma.$disconnect())
```

**1.2 Verificación del backup**
```bash
# Verificar que el archivo existe y tiene contenido
npx tsx scripts/backup_data.ts
```

### Criterio de éxito
- [ ] Archivo JSON generado con timestamp
- [ ] JSON contiene los 2 registros de Candidate con sus relaciones
- [ ] Tamaño del archivo > 0 bytes

---

## FASE 2: Crear Tablas Nuevas (Additive Only)

### Objetivo
Añadir SOLO tablas nuevas. **Cero cambios a tablas existentes.**

### Estrategia de schema para esta fase

Crear un schema intermedio que mantenga los modelos existentes SIN `@@map` (para no renombrar tablas) y añada los nuevos modelos.

**2.1 Schema de la Fase 2 (`schema_phase2.prisma`)**

Los modelos existentes se mantienen exactamente como están:
```prisma
// MODELOS EXISTENTES — SIN CAMBIOS, SIN @@map
model Candidate {
  id             Int              @id @default(autoincrement())
  firstName      String           @db.VarChar(100)
  lastName       String           @db.VarChar(100)
  email          String           @unique @db.VarChar(255)
  phone          String?          @db.VarChar(15)
  address        String?          @db.VarChar(100)  // se mantiene hasta fase 3
  Education      Education[]
  Resume         Resume[]
  WorkExperience WorkExperience[]
  // Nuevas relaciones (se añaden, no rompen nada)
  addresses      Address[]
  applications   Application[]
}

model Education {
  id          Int       @id @default(autoincrement())
  institution String    @db.VarChar(100)
  title       String    @db.VarChar(250)
  startDate   DateTime
  endDate     DateTime?
  candidateId Int
  candidate   Candidate @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  @@map("educations")
}
// ... Resume y WorkExperience igual
```

Los modelos nuevos sí usan `@@map` porque son tablas nuevas que no existen:
```prisma
model Company { ... @@map("companies") }
model InterviewType { ... @@map("interview_types") }
// etc.
```

**2.2 Generar migración SOLO con tablas nuevas**
```bash
# Copiar schema_phase2.prisma como schema.prisma
cp backend/prisma/schema.prisma backend/prisma/schema_original_backup.prisma
# Aplicar el schema de fase 2
cp backend/prisma/schema_phase2.prisma backend/prisma/schema.prisma

# Crear el archivo de migración manualmente (NO usar migrate dev)
npx prisma migrate diff \
  --from-schema-datasource backend/prisma/schema_original_backup.prisma \
  --to-schema-datamodel backend/prisma/schema_phase2.prisma \
  --script > backend/prisma/migrations/phase2_add_new_tables/migration.sql
```

**2.3 Revisar el SQL generado ANTES de aplicar**
```bash
# Abrir y verificar que el SQL solo contiene CREATE TABLE, no DROP TABLE
cat backend/prisma/migrations/phase2_add_new_tables/migration.sql
```

**⚠️ STOP: Si el SQL contiene cualquier `DROP TABLE` o `DROP COLUMN` → NO continuar.**

**2.4 Aplicar la migración**
```bash
# Aplicar solo si el SQL es seguro
npx prisma migrate deploy
```

### Criterio de éxito
- [ ] SQL generado no contiene `DROP TABLE` ni `DROP COLUMN`
- [ ] Tablas nuevas creadas: `companies`, `interview_types`, `interview_flows`, `interview_steps`, `salary_ranges`, `benefit_types`, `employees`, `positions`, `applications`, `interviews`, `addresses`, `position_contacts`, `position_benefits`, `requirements`, `responsibilities`, `audit_logs`
- [ ] Tablas existentes intactas: `Candidate`, `Education`, `Resume`, `WorkExperience`
- [ ] Los 2 registros de `Candidate` siguen presentes

**Verificación:**
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;

SELECT COUNT(*) FROM "Candidate";  -- debe ser 2
```

---

## FASE 3: Migración de Datos Existentes

### Objetivo
Copiar datos de las tablas antiguas a las nuevas estructuras. **Las tablas antiguas NO se tocan.**

### 3.1 Migrar el campo `address` de Candidate → tabla `addresses`

```typescript
// scripts/migrate_addresses.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAddresses() {
  // Leer candidatos CON address usando tabla original
  const candidates = await prisma.$queryRaw<Array<{id: number, address: string | null}>>`
    SELECT id, address FROM "Candidate" WHERE address IS NOT NULL AND address != ''
  `
  
  console.log(`Encontrados ${candidates.length} candidatos con dirección`)
  
  for (const c of candidates) {
    // Verificar que no existe ya un registro en addresses para este candidato
    const existing = await prisma.$queryRaw<Array<{count: string}>>`
      SELECT COUNT(*)::text as count FROM addresses WHERE candidate_id = ${c.id}
    `
    
    if (parseInt(existing[0].count) === 0) {
      await prisma.$executeRaw`
        INSERT INTO addresses (candidate_id, street, address_type, is_primary, created_at, updated_at)
        VALUES (${c.id}, ${c.address}, 'home', true, NOW(), NOW())
      `
      console.log(`  ✅ Migrada dirección de candidato ${c.id}`)
    } else {
      console.log(`  ⏭️ Candidato ${c.id} ya tiene dirección migrada`)
    }
  }
  
  console.log('✅ Migración de direcciones completada')
}

migrateAddresses().catch(console.error).finally(() => prisma.$disconnect())
```

### 3.2 Seed de entidades de referencia

```typescript
// scripts/seed_reference_data.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedReferenceData() {
  // Usar upsert para idempotencia (se puede ejecutar varias veces sin duplicar)
  
  await prisma.$executeRaw`
    INSERT INTO interview_types (name, description, created_at, updated_at)
    VALUES 
      ('Telefónica', 'Entrevista inicial por teléfono', NOW(), NOW()),
      ('Técnica', 'Evaluación de habilidades técnicas', NOW(), NOW()),
      ('Cultural', 'Ajuste cultural con el equipo', NOW(), NOW()),
      ('Final', 'Entrevista final con gerente', NOW(), NOW()),
      ('Prueba práctica', 'Evaluación práctica', NOW(), NOW())
    ON CONFLICT DO NOTHING
  `
  
  await prisma.$executeRaw`
    INSERT INTO interview_flows (description, created_at, updated_at)
    VALUES 
      ('Flujo estándar para desarrolladores', NOW(), NOW()),
      ('Flujo rápido para posiciones junior', NOW(), NOW()),
      ('Flujo ejecutivo para roles senior', NOW(), NOW())
    ON CONFLICT DO NOTHING
  `
  
  await prisma.$executeRaw`
    INSERT INTO salary_ranges (name, min_salary, max_salary, currency, pay_frequency, level, created_at)
    VALUES 
      ('Entry Level', 30000, 50000, 'USD', 'annually', 'junior', NOW()),
      ('Mid Level', 50000, 80000, 'USD', 'annually', 'mid', NOW()),
      ('Senior Level', 80000, 120000, 'USD', 'annually', 'senior', NOW()),
      ('Lead Level', 120000, 160000, 'USD', 'annually', 'lead', NOW()),
      ('Executive Level', 160000, 250000, 'USD', 'annually', 'executive', NOW())
    ON CONFLICT DO NOTHING
  `
  
  await prisma.$executeRaw`
    INSERT INTO benefit_types (name, description, category, created_at)
    VALUES 
      ('Health Insurance', 'Cobertura médica', 'health', NOW()),
      ('Dental Insurance', 'Cobertura dental', 'health', NOW()),
      ('Remote Work', 'Trabajo remoto flexible', 'flexibility', NOW()),
      ('Paid Time Off', 'Vacaciones y bajas', 'time_off', NOW()),
      ('401(k) Matching', 'Aportación a pensión', 'financial', NOW())
    ON CONFLICT DO NOTHING
  `
  
  console.log('✅ Datos de referencia insertados')
}

seedReferenceData().catch(console.error).finally(() => prisma.$disconnect())
```

### Criterio de éxito
- [ ] `SELECT COUNT(*) FROM addresses` = número de candidatos con dirección previa
- [ ] `SELECT COUNT(*) FROM "Candidate"` = 2 (sin cambios)
- [ ] `SELECT COUNT(*) FROM interview_types` = 5
- [ ] `SELECT COUNT(*) FROM interview_flows` >= 3
- [ ] `SELECT COUNT(*) FROM salary_ranges` = 5

---

## FASE 4: Validación de Integridad

### Objetivo
Verificar que TODOS los datos están correctamente migrados antes de cualquier eliminación.

```typescript
// scripts/validate_migration.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateMigration() {
  let passed = 0
  let failed = 0

  async function check(name: string, query: string, expectedMin: number) {
    const result = await prisma.$queryRawUnsafe<Array<{count: string}>>(`SELECT COUNT(*)::text as count FROM ${query}`)
    const count = parseInt(result[0].count)
    const ok = count >= expectedMin
    console.log(`${ok ? '✅' : '❌'} ${name}: ${count} (mínimo esperado: ${expectedMin})`)
    ok ? passed++ : failed++
    return count
  }

  console.log('\n=== VALIDACIÓN DE TABLAS EXISTENTES ===')
  const candidateCount = await check('"Candidate" intacta', '"Candidate"', 2)
  await check('"Education" intacta', '"Education"', 0)
  await check('"Resume" intacta', '"Resume"', 0)
  await check('"WorkExperience" intacta', '"WorkExperience"', 0)

  console.log('\n=== VALIDACIÓN DE DATOS MIGRADOS ===')
  // Verificar que candidatos con address tienen su registro en addresses
  const candidatesWithOldAddress = await prisma.$queryRaw<Array<{count: string}>>`
    SELECT COUNT(*)::text as count FROM "Candidate" WHERE address IS NOT NULL AND address != ''
  `
  const oldCount = parseInt(candidatesWithOldAddress[0].count)
  
  const addressesMigrated = await prisma.$queryRaw<Array<{count: string}>>`
    SELECT COUNT(*)::text as count FROM addresses
  `
  const newCount = parseInt(addressesMigrated[0].count)
  
  const addressOk = newCount >= oldCount
  console.log(`${addressOk ? '✅' : '❌'} Direcciones migradas: ${newCount}/${oldCount}`)
  addressOk ? passed++ : failed++

  // Verificar integridad referencial: todas las addresses apuntan a Candidates válidos
  const orphanAddresses = await prisma.$queryRaw<Array<{count: string}>>`
    SELECT COUNT(*)::text as count FROM addresses a
    LEFT JOIN "Candidate" c ON a.candidate_id = c.id
    WHERE c.id IS NULL
  `
  const orphans = parseInt(orphanAddresses[0].count)
  const noOrphans = orphans === 0
  console.log(`${noOrphans ? '✅' : '❌'} Sin addresses huérfanas: ${orphans} huérfanas`)
  noOrphans ? passed++ : failed++

  console.log('\n=== VALIDACIÓN DE TABLAS DE REFERENCIA ===')
  await check('interview_types', 'interview_types', 1)
  await check('interview_flows', 'interview_flows', 1)
  await check('salary_ranges', 'salary_ranges', 1)
  await check('benefit_types', 'benefit_types', 1)

  console.log(`\n=== RESULTADO: ${passed} ✅ | ${failed} ❌ ===`)
  
  if (failed > 0) {
    console.error('\n🚨 VALIDACIÓN FALLIDA — NO proceder con la Fase 5')
    process.exit(1)
  } else {
    console.log('\n✅ VALIDACIÓN EXITOSA — Seguro proceder con Fase 5')
  }
}

validateMigration().catch(console.error).finally(() => prisma.$disconnect())
```

**Ejecución:**
```bash
npx tsx scripts/validate_migration.ts
```

**⚠️ STOP: Si la validación falla → NO continuar. Analizar y corregir.**

---

## FASE 5: Actualizar Schema Final y Renombrar Tablas

### Objetivo
Aplicar el `schema_optimized.prisma` completo, incluyendo los `@@map` de tablas existentes, **solo cuando los datos estén validados**.

### 5.1 Renombrar tablas existentes (con datos ya migrados a nuevas)

El renombrado de `Candidate → candidates`, `Education → educations`, etc. se hace con SQL directo para tener control total:

```sql
-- migrations/phase5_rename_tables/migration.sql
-- Renombrar tablas existentes conservando todos sus datos
ALTER TABLE "Candidate" RENAME TO candidates;
ALTER TABLE "Education" RENAME TO educations;
ALTER TABLE "Resume" RENAME TO resumes;
ALTER TABLE "WorkExperience" RENAME TO work_experiences;

-- Actualizar secuencias
ALTER SEQUENCE "Candidate_id_seq" RENAME TO candidates_id_seq;
ALTER SEQUENCE "Education_id_seq" RENAME TO educations_id_seq;
ALTER SEQUENCE "Resume_id_seq" RENAME TO resumes_id_seq;
ALTER SEQUENCE "WorkExperience_id_seq" RENAME TO work_experiences_id_seq;

-- Actualizar índices
ALTER INDEX "Candidate_pkey" RENAME TO candidates_pkey;
ALTER INDEX "Candidate_email_key" RENAME TO candidates_email_key;
ALTER INDEX "Education_pkey" RENAME TO educations_pkey;
ALTER INDEX "Resume_pkey" RENAME TO resumes_pkey;
ALTER INDEX "WorkExperience_pkey" RENAME TO work_experiences_pkey;
```

**Verificar antes de aplicar:**
```bash
# Previsualizar el SQL
cat backend/prisma/migrations/phase5_rename_tables/migration.sql
```

**Aplicar:**
```bash
npx prisma migrate deploy
```

### 5.2 Verificar datos tras renombrado
```sql
SELECT COUNT(*) FROM candidates;          -- debe ser 2
SELECT COUNT(*) FROM educations;          -- igual que antes
SELECT COUNT(*) FROM resumes;             -- igual que antes
SELECT COUNT(*) FROM work_experiences;    -- igual que antes
```

### 5.3 Activar el schema optimizado completo
```bash
# Reemplazar schema.prisma con el optimizado
cp backend/prisma/schema_optimized.prisma backend/prisma/schema.prisma

# Generar el cliente de Prisma
npx prisma generate

# Verificar que el schema está sincronizado con la BD
npx prisma migrate diff \
  --from-schema-datasource backend/prisma/schema.prisma \
  --to-schema-datamodel backend/prisma/schema.prisma \
  --exit-code
# Si retorna 0 = schema sincronizado
```

### Criterio de éxito
- [ ] `SELECT COUNT(*) FROM candidates` = 2
- [ ] `SELECT COUNT(*) FROM addresses` >= número original de candidatos con address
- [ ] `npx prisma validate` sin errores
- [ ] `npx prisma migrate status` sin migraciones pendientes

---

## FASE 6: Eliminar Columnas Obsoletas

### Objetivo
Limpiar columnas que ya fueron migradas. **Solo tras validación completa.**

### 6.1 Eliminar columna `address` de `candidates`

**Antes de ejecutar, verificar:**
```sql
-- Confirmar que todos los address están migrados
SELECT c.id, c."firstName", c.address as old_address, a.street as new_address
FROM candidates c
LEFT JOIN addresses a ON a.candidate_id = c.id
WHERE c.address IS NOT NULL;
```

Si todos tienen correspondencia en `addresses`:
```sql
-- Crear migración Prisma para eliminar la columna
-- (el schema_optimized.prisma ya no tiene el campo address en Candidate)
npx prisma migrate diff \
  --from-schema-datasource backend/prisma/schema.prisma \
  --to-schema-datamodel backend/prisma/schema.prisma \
  --script > backend/prisma/migrations/phase6_drop_old_columns/migration.sql
```

**Verificar SQL antes de aplicar:**
```bash
cat backend/prisma/migrations/phase6_drop_old_columns/migration.sql
# Solo debe contener ALTER TABLE ... DROP COLUMN address
# NO debe contener DROP TABLE
```

```bash
npx prisma migrate deploy
```

### 6.2 Añadir índices de texto completo
```sql
CREATE INDEX IF NOT EXISTS candidates_fulltext_idx 
ON candidates USING gin(to_tsvector('spanish', "firstName" || ' ' || "lastName" || ' ' || email));

CREATE INDEX IF NOT EXISTS positions_fulltext_idx 
ON positions USING gin(to_tsvector('spanish', title || ' ' || COALESCE(description, '')));
```

### Criterio de éxito
- [ ] Columna `address` eliminada de `candidates`
- [ ] `SELECT COUNT(*) FROM candidates` = 2 (sin pérdida de datos)
- [ ] `SELECT COUNT(*) FROM addresses` correcto
- [ ] Índices de texto completo creados

---

## Resumen de Comandos por Fase

| Fase | Acción | Comando |
|---|---|---|
| 1 | Backup JSON | `npx tsx scripts/backup_data.ts` |
| 2 | Crear tablas nuevas | `npx prisma migrate deploy` |
| 3 | Migrar datos | `npx tsx scripts/migrate_addresses.ts && npx tsx scripts/seed_reference_data.ts` |
| 4 | Validar | `npx tsx scripts/validate_migration.ts` |
| 5 | Renombrar tablas | `npx prisma migrate deploy` |
| 6 | Limpiar columnas | `npx prisma migrate deploy` |

---

## Checklist de Seguridad (antes de cada fase)

- [ ] ¿Existe un backup reciente y verificado?
- [ ] ¿El SQL generado NO contiene `DROP TABLE`?
- [ ] ¿El SQL generado NO contiene `DROP COLUMN` antes de validar datos?
- [ ] ¿La validación de la fase anterior pasó al 100%?
- [ ] ¿Se ha probado el script en una copia de la BD?

---

## Rollback por Fase

| Fase fallida | Acción de rollback |
|---|---|
| Fase 2 | `DROP TABLE` de las tablas nuevas creadas (no afecta datos originales) |
| Fase 3 | `DELETE FROM addresses` + `DELETE FROM interview_types` etc. (datos originales intactos) |
| Fase 4 | No hay cambios estructurales, solo análisis |
| Fase 5 | `ALTER TABLE candidates RENAME TO "Candidate"` etc. |
| Fase 6 | Restaurar columna: `ALTER TABLE candidates ADD COLUMN address VARCHAR(100)` + copiar desde `addresses` |
