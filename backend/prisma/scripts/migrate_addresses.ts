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

async function migrateAddresses() {
  console.log('=== FASE 3a: MIGRACIÓN DE DIRECCIONES ===')

  const candidates = await prisma.$queryRaw`
    SELECT id, "firstName", "lastName", address FROM "Candidate"
    WHERE address IS NOT NULL AND address <> ''
  ` as Array<{ id: number; firstName: string; lastName: string; address: string }>

  console.log(`Candidatos con dirección: ${candidates.length}`)

  let migrated = 0
  let skipped = 0

  for (const c of candidates) {
    const existing = await prisma.$queryRaw`
      SELECT COUNT(*)::int as count FROM addresses WHERE candidate_id = ${c.id}
    ` as Array<{ count: number }>

    if (existing[0].count > 0) {
      console.log(`  ⏭️  Candidato ${c.id} (${c.firstName} ${c.lastName}) — ya migrado, omitiendo`)
      skipped++
      continue
    }

    await prisma.$executeRaw`
      INSERT INTO addresses (candidate_id, street, address_type, is_primary, created_at, updated_at)
      VALUES (${c.id}, ${c.address}, 'home', true, NOW(), NOW())
    `
    console.log(`  ✅ Candidato ${c.id} (${c.firstName} ${c.lastName}) — "${c.address}" migrado`)
    migrated++
  }

  console.log(`\nResumen: ${migrated} migrados, ${skipped} omitidos`)

  const total = await prisma.$queryRaw`
    SELECT COUNT(*)::int as count FROM addresses
  ` as Array<{ count: number }>
  console.log(`Total en tabla addresses: ${total[0].count}`)

  if (migrated + skipped !== candidates.length) {
    console.error('❌ ERROR: Discrepancia en conteo de migraciones')
    process.exit(1)
  }

  console.log('\n✅ FASE 3a COMPLETADA — Direcciones migradas correctamente')
}

migrateAddresses()
  .catch((err) => {
    console.error('❌ Error en migración de direcciones:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
