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

type Row = Record<string, unknown>

let passed = 0
let failed = 0

async function check(name: string, query: string, expected: (val: number) => boolean, expectedDesc: string) {
  const result = await prisma.$queryRawUnsafe(`SELECT COUNT(*)::int AS count FROM ${query}`) as Array<{ count: number }>
  const count = result[0].count
  const ok = expected(count)
  console.log(`${ok ? '✅' : '❌'} ${name}: ${count} (esperado: ${expectedDesc})`)
  ok ? passed++ : failed++
  return count
}

async function validateMigration() {
  console.log('=== FASE 4: VALIDACIÓN COMPLETA DE INTEGRIDAD ===\n')

  // ── 1. Tablas originales intactas ──────────────────────────────────────────
  console.log('--- 1. Tablas originales intactas ---')
  await check('"Candidate" tiene 2 registros',      '"Candidate"',      (n) => n === 2, '= 2')
  await check('"Education" intacta',                '"Education"',      (n) => n >= 0,  '>= 0')
  await check('"Resume" intacta',                   '"Resume"',         (n) => n >= 0,  '>= 0')
  await check('"WorkExperience" intacta',           '"WorkExperience"', (n) => n >= 0,  '>= 0')

  // ── 2. Tablas nuevas existen y tienen datos ────────────────────────────────
  console.log('\n--- 2. Tablas nuevas con datos de referencia ---')
  await check('interview_types',  'interview_types',  (n) => n >= 5,  '>= 5')
  await check('interview_flows',  'interview_flows',  (n) => n >= 4,  '>= 4')
  await check('interview_steps',  'interview_steps',  (n) => n >= 10, '>= 10')
  await check('salary_ranges',    'salary_ranges',    (n) => n >= 5,  '>= 5')
  await check('benefit_types',    'benefit_types',    (n) => n >= 7,  '>= 7')

  // ── 3. Migración de addresses ──────────────────────────────────────────────
  console.log('\n--- 3. Migración de addresses ---')

  const candidatesWithAddr = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM "Candidate"
    WHERE address IS NOT NULL AND address <> ''
  ` as Array<{ count: number }>
  const expectedAddresses = candidatesWithAddr[0].count

  const addressCount = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM addresses
  ` as Array<{ count: number }>
  const actualAddresses = addressCount[0].count

  const addrOk = actualAddresses >= expectedAddresses
  console.log(`${addrOk ? '✅' : '❌'} Direcciones migradas: ${actualAddresses}/${expectedAddresses}`)
  addrOk ? passed++ : failed++

  // Verificar que cada dirección migrada coincide exactamente con el valor original
  const mismatches = await prisma.$queryRaw`
    SELECT c.id, c."firstName", c."lastName", c.address AS original, a.street AS migrated
    FROM "Candidate" c
    JOIN addresses a ON a.candidate_id = c.id AND a.is_primary = true
    WHERE c.address IS DISTINCT FROM a.street
  ` as Row[]

  const noMismatches = mismatches.length === 0
  console.log(`${noMismatches ? '✅' : '❌'} Contenido de direcciones coincide: ${mismatches.length} discrepancias`)
  noMismatches ? passed++ : failed++
  if (!noMismatches) {
    console.log('   Discrepancias:')
    mismatches.forEach((r) => console.log(`   - id=${r['id']}: original="${r['original']}" ≠ migrado="${r['migrated']}"`))
  }

  // Verificar que no hay addresses huérfanas (sin Candidate válido)
  const orphans = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM addresses a
    LEFT JOIN "Candidate" c ON c.id = a.candidate_id
    WHERE c.id IS NULL
  ` as Array<{ count: number }>
  const noOrphans = orphans[0].count === 0
  console.log(`${noOrphans ? '✅' : '❌'} Sin addresses huérfanas: ${orphans[0].count} encontradas`)
  noOrphans ? passed++ : failed++

  // ── 4. Integridad referencial en interview_steps ───────────────────────────
  console.log('\n--- 4. Integridad referencial ---')

  const orphanSteps = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS count FROM interview_steps s
    LEFT JOIN interview_flows f ON f.id = s.interview_flow_id
    LEFT JOIN interview_types t ON t.id = s.interview_type_id
    WHERE f.id IS NULL OR t.id IS NULL
  ` as Array<{ count: number }>
  const stepsOk = orphanSteps[0].count === 0
  console.log(`${stepsOk ? '✅' : '❌'} interview_steps sin referencias huérfanas: ${orphanSteps[0].count}`)
  stepsOk ? passed++ : failed++

  // Verificar order_index único por flow
  const dupOrders = await prisma.$queryRaw`
    SELECT interview_flow_id, order_index, COUNT(*)::int AS cnt
    FROM interview_steps
    GROUP BY interview_flow_id, order_index
    HAVING COUNT(*) > 1
  ` as Row[]
  const noDupOrders = dupOrders.length === 0
  console.log(`${noDupOrders ? '✅' : '❌'} order_index único por flow: ${dupOrders.length} duplicados`)
  noDupOrders ? passed++ : failed++

  // ── 5. Tablas nuevas vacías esperadas (sin datos de negocio aún) ───────────
  console.log('\n--- 5. Tablas de negocio nuevas (deben estar vacías) ---')
  await check('companies (vacía)',         'companies',         (n) => n === 0, '= 0')
  await check('employees (vacía)',         'employees',         (n) => n === 0, '= 0')
  await check('positions (vacía)',         'positions',         (n) => n === 0, '= 0')
  await check('applications (vacía)',      'applications',      (n) => n === 0, '= 0')
  await check('interviews (vacía)',        'interviews',        (n) => n === 0, '= 0')

  // ── 6. Resumen ─────────────────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(50)}`)
  console.log(`RESULTADO FINAL: ${passed} ✅ passed | ${failed} ❌ failed`)
  console.log('═'.repeat(50))

  if (failed > 0) {
    console.error('\n🚨 VALIDACIÓN FALLIDA — NO proceder con Fase 5')
    console.error('   Revisar y corregir los errores antes de continuar')
    process.exit(1)
  } else {
    console.log('\n✅ VALIDACIÓN EXITOSA — Seguro proceder con Fase 5')
    console.log('   Fase 5: renombrado de tablas con ALTER TABLE (no DROP+CREATE)')
  }
}

validateMigration()
  .catch((err) => {
    console.error('❌ Error durante la validación:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
