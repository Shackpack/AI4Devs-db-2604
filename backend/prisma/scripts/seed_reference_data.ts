import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const { DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env
if (!DB_USER || !DB_PASSWORD || !DB_NAME || !DB_PORT) {
  console.error('❌ Variables de entorno no encontradas')
  process.exit(1)
}
process.env.DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@172.22.60.83:${DB_PORT}/${DB_NAME}`

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function seedReferenceData() {
  console.log('=== FASE 3b: SEED DE DATOS DE REFERENCIA ===')

  // --- interview_types ---
  await prisma.$executeRaw`
    INSERT INTO interview_types (name, description, created_at, updated_at) VALUES
      ('Telefónica',     'Entrevista inicial por teléfono',           NOW(), NOW()),
      ('Técnica',        'Evaluación de habilidades técnicas',        NOW(), NOW()),
      ('Cultural',       'Ajuste cultural con el equipo',             NOW(), NOW()),
      ('Final',          'Entrevista final con el responsable',       NOW(), NOW()),
      ('Prueba práctica','Evaluación práctica de habilidades',        NOW(), NOW())
    ON CONFLICT DO NOTHING
  `
  const itCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM interview_types` as Array<{ count: number }>
  console.log(`✅ interview_types: ${itCount[0].count} registros`)

  // --- interview_flows ---
  await prisma.$executeRaw`
    INSERT INTO interview_flows (description, created_at, updated_at) VALUES
      ('Flujo estándar para desarrolladores',  NOW(), NOW()),
      ('Flujo rápido para posiciones junior',  NOW(), NOW()),
      ('Flujo ejecutivo para roles senior',    NOW(), NOW()),
      ('Flujo técnico especializado',          NOW(), NOW())
    ON CONFLICT DO NOTHING
  `
  const ifCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM interview_flows` as Array<{ count: number }>
  console.log(`✅ interview_flows: ${ifCount[0].count} registros`)

  // --- interview_steps (vincular flows con types) ---
  // Flow 1 (estándar dev): Telefónica → Técnica → Cultural → Final
  // Flow 2 (junior): Telefónica → Cultural
  // Flow 3 (senior): Telefónica → Técnica → Prueba práctica → Final
  await prisma.$executeRaw`
    INSERT INTO interview_steps (interview_flow_id, interview_type_id, name, order_index, created_at, updated_at)
    SELECT f.id, t.id, t.name || ' (' || f.description || ')', step.order_index, NOW(), NOW()
    FROM (VALUES
      ('Flujo estándar para desarrolladores', 'Telefónica',      1),
      ('Flujo estándar para desarrolladores', 'Técnica',         2),
      ('Flujo estándar para desarrolladores', 'Cultural',        3),
      ('Flujo estándar para desarrolladores', 'Final',           4),
      ('Flujo rápido para posiciones junior', 'Telefónica',      1),
      ('Flujo rápido para posiciones junior', 'Cultural',        2),
      ('Flujo ejecutivo para roles senior',   'Telefónica',      1),
      ('Flujo ejecutivo para roles senior',   'Técnica',         2),
      ('Flujo ejecutivo para roles senior',   'Prueba práctica', 3),
      ('Flujo ejecutivo para roles senior',   'Final',           4)
    ) AS step(flow_desc, type_name, order_index)
    JOIN interview_flows f ON f.description = step.flow_desc
    JOIN interview_types t ON t.name = step.type_name
    ON CONFLICT (interview_flow_id, order_index) DO NOTHING
  `
  const isCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM interview_steps` as Array<{ count: number }>
  console.log(`✅ interview_steps: ${isCount[0].count} registros`)

  // --- salary_ranges ---
  await prisma.$executeRaw`
    INSERT INTO salary_ranges (name, min_salary, max_salary, currency, pay_frequency, level, created_at) VALUES
      ('Entry Level',     30000,  50000,  'EUR', 'annually', 'junior',    NOW()),
      ('Mid Level',       50000,  80000,  'EUR', 'annually', 'mid',       NOW()),
      ('Senior Level',    80000,  120000, 'EUR', 'annually', 'senior',    NOW()),
      ('Lead Level',      120000, 160000, 'EUR', 'annually', 'lead',      NOW()),
      ('Executive Level', 160000, 250000, 'EUR', 'annually', 'executive', NOW())
    ON CONFLICT DO NOTHING
  `
  const srCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM salary_ranges` as Array<{ count: number }>
  console.log(`✅ salary_ranges: ${srCount[0].count} registros`)

  // --- benefit_types ---
  await prisma.$executeRaw`
    INSERT INTO benefit_types (name, description, category, created_at) VALUES
      ('Seguro médico',      'Cobertura médica completa',         'health',      NOW()),
      ('Seguro dental',      'Cobertura dental',                  'health',      NOW()),
      ('Plan de pensiones',  'Aportación a plan de pensiones',    'financial',   NOW()),
      ('Días de vacaciones', 'Días de vacaciones anuales',        'time_off',    NOW()),
      ('Trabajo remoto',     'Opción de trabajo en remoto',       'flexibility', NOW()),
      ('Formación',          'Budget anual para formación',       'development', NOW()),
      ('Ticket restaurante', 'Ticket restaurante diario',         'benefits',    NOW())
    ON CONFLICT DO NOTHING
  `
  const btCount = await prisma.$queryRaw`SELECT COUNT(*)::int as count FROM benefit_types` as Array<{ count: number }>
  console.log(`✅ benefit_types: ${btCount[0].count} registros`)

  console.log('\n✅ FASE 3b COMPLETADA — Datos de referencia insertados')
}

seedReferenceData()
  .catch((err) => {
    console.error('❌ Error en seed de datos de referencia:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
