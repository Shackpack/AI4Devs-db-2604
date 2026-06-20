import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAddressDataSimple() {
  try {
    console.log('Starting simple address data migration...')

    // 1. Verificar si la columna address existe en candidates
    console.log('1. Checking if address column exists...')
    
    let addressColumnExists = false
    try {
      const result = await prisma.$queryRawUnsafe(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'address'
      `) as Array<{ column_name: string }>

      addressColumnExists = result.length > 0
    } catch (error) {
      console.log('Could not check for address column. Assuming it does not exist.')
      addressColumnExists = false
    }

    if (!addressColumnExists) {
      console.log('Address column does not exist in candidates table. Migration not needed.')
      return
    }

    // 2. Verificar si la tabla addresses existe
    console.log('2. Checking if addresses table exists...')
    
    let addressesTableExists = false
    try {
      await prisma.$queryRawUnsafe(`SELECT 1 FROM addresses LIMIT 1`)
      addressesTableExists = true
    } catch (error) {
      console.log('Addresses table does not exist yet. Please create it first.')
      return
    }

    // 3. Obtener candidatos con dirección no nula
    console.log('3. Finding candidates with addresses...')
    
    const candidatesWithAddress = await prisma.$queryRawUnsafe(`
      SELECT id, firstName, lastName, email, address 
      FROM "candidates" 
      WHERE address IS NOT NULL 
      AND address != ''
      AND address != 'null'
    `) as Array<{
      id: number
      firstName: string
      lastName: string
      email: string
      address: string
    }>

    console.log(`Found ${candidatesWithAddress.length} candidates with addresses to migrate`)

    if (candidatesWithAddress.length === 0) {
      console.log('No candidates with addresses found. Migration complete.')
      return
    }

    // 4. Migrar datos
    console.log('4. Migrating addresses...')
    
    let migratedCount = 0
    let skippedCount = 0
    let errorCount = 0

    for (const candidate of candidatesWithAddress) {
      try {
        // Verificar si ya existe una dirección para este candidato
        const existingAddress = await prisma.$queryRawUnsafe(`
          SELECT id FROM "addresses" 
          WHERE "candidateId" = $1 
          LIMIT 1
        `, candidate.id) as Array<{ id: number }>

        if (existingAddress.length > 0) {
          console.log(`Candidate ${candidate.id} already has address records. Skipping.`)
          skippedCount++
          continue
        }

        // Crear registro en Address usando SQL raw
        await prisma.$queryRawUnsafe(`
          INSERT INTO "addresses" 
          ("candidateId", street, "isPrimary", "addressType", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, NOW(), NOW())
        `, candidate.id, candidate.address, true, 'home')

        migratedCount++
        console.log(`Migrated address for candidate ${candidate.id}: ${candidate.firstName} ${candidate.lastName}`)

      } catch (error) {
        console.error(`Error migrating address for candidate ${candidate.id}:`, error)
        errorCount++
      }
    }

    console.log(`\nAddress migration completed:`)
    console.log(`- Successfully migrated: ${migratedCount}`)
    console.log(`- Skipped (already exists): ${skippedCount}`)
    console.log(`- Errors: ${errorCount}`)

    // 5. Validación posterior
    console.log('\n5. Post-migration validation...')
    
    const totalAddresses = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "addresses"
    `) as Array<{ count: bigint }>
    
    const totalCandidates = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "candidates"
    `) as Array<{ count: bigint }>
    
    console.log(`Validation:`)
    console.log(`- Total candidates: ${Number(totalCandidates[0]?.count)}`)
    console.log(`- Total addresses: ${Number(totalAddresses[0]?.count)}`)
    
    const coverage = Number(totalCandidates[0]?.count) > 0 
      ? ((Number(totalAddresses[0]?.count) / Number(totalCandidates[0]?.count)) * 100).toFixed(2)
      : '0'
    console.log(`- Coverage: ${coverage}%`)

    if (errorCount === 0) {
      console.log('\n✅ Address migration completed successfully!')
    } else {
      console.log(`\n⚠️ Address migration completed with ${errorCount} errors.`)
    }

  } catch (error) {
    console.error('Error during address migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Función para parsear direcciones simples (mejorada)
function parseAddress(address: string): {
  street?: string
  city?: string
  state?: string
  country?: string
  zipCode?: string
} {
  const parts = address.split(',').map(part => part.trim())
  
  const result: {
    street?: string
    city?: string
    state?: string
    country?: string
    zipCode?: string
  } = {}

  if (parts.length >= 1) result.street = parts[0]
  if (parts.length >= 2) result.city = parts[1]
  if (parts.length >= 3) {
    const stateZip = parts[2].split(' ').map(p => p.trim())
    if (stateZip.length >= 1) result.state = stateZip[0]
    if (stateZip.length >= 2) result.zipCode = stateZip[stateZip.length - 1]
  }
  if (parts.length >= 4) result.country = parts[3]

  return result
}

// Versión mejorada que intenta parsear direcciones
async function migrateAddressDataWithParsingSimple() {
  try {
    console.log('Starting enhanced address data migration with parsing...')

    // Verificar condiciones iniciales
    const addressColumnExists = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'candidates' 
      AND column_name = 'address'
    `) as Array<{ column_name: string }>

    if (addressColumnExists.length === 0) {
      console.log('Address column does not exist. Migration not needed.')
      return
    }

    const candidatesWithAddress = await prisma.$queryRawUnsafe(`
      SELECT id, firstName, lastName, email, address 
      FROM "candidates" 
      WHERE address IS NOT NULL 
      AND address != ''
      AND address != 'null'
    `) as Array<{
      id: number
      firstName: string
      lastName: string
      email: string
      address: string
    }>

    console.log(`Found ${candidatesWithAddress.length} candidates with addresses to migrate`)

    let migratedCount = 0
    let parsedCount = 0
    let errorCount = 0

    for (const candidate of candidatesWithAddress) {
      try {
        const existingAddress = await prisma.$queryRawUnsafe(`
          SELECT id FROM "addresses" 
          WHERE "candidateId" = $1 
          LIMIT 1
        `, candidate.id) as Array<{ id: number }>

        if (existingAddress.length > 0) {
          continue
        }

        // Intentar parsear la dirección
        const parsedAddress = parseAddress(candidate.address)
        
        // Si el parsing parece exitoso (múltiples campos), usarlo
        const hasMultipleFields = Object.values(parsedAddress).filter(v => v).length > 1
        
        await prisma.$queryRawUnsafe(`
          INSERT INTO "addresses" 
          ("candidateId", street, city, state, country, "zipCode", "isPrimary", "addressType", "createdAt", "updatedAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        `, 
          candidate.id,
          parsedAddress.street || candidate.address,
          parsedAddress.city,
          parsedAddress.state,
          parsedAddress.country,
          parsedAddress.zipCode,
          true,
          'home'
        )

        migratedCount++
        if (hasMultipleFields) parsedCount++
        
        console.log(`Migrated address for candidate ${candidate.id}: ${candidate.firstName} ${candidate.lastName}`)

      } catch (error) {
        console.error(`Error migrating address for candidate ${candidate.id}:`, error)
        errorCount++
      }
    }

    console.log(`\nEnhanced address migration completed:`)
    console.log(`- Successfully migrated: ${migratedCount}`)
    console.log(`- Successfully parsed: ${parsedCount}`)
    console.log(`- Simple migration only: ${migratedCount - parsedCount}`)
    console.log(`- Errors: ${errorCount}`)

    if (errorCount === 0) {
      console.log('\n✅ Enhanced address migration completed successfully!')
    } else {
      console.log(`\n⚠️ Enhanced address migration completed with ${errorCount} errors.`)
    }

  } catch (error) {
    console.error('Error during enhanced address migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Función para limpiar la columna address después de la migración
async function cleanupAddressColumn() {
  try {
    console.log('Starting cleanup of address column...')
    
    // Verificar si la columna existe
    const addressColumnExists = await prisma.$queryRawUnsafe(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'candidates' 
      AND column_name = 'address'
    `) as Array<{ column_name: string }>

    if (addressColumnExists.length === 0) {
      console.log('Address column does not exist. Nothing to cleanup.')
      return
    }

    // Verificar que todas las direcciones hayan sido migradas
    const candidatesWithAddress = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count
      FROM "candidates" 
      WHERE address IS NOT NULL 
      AND address != ''
      AND address != 'null'
    `) as Array<{ count: bigint }>

    const totalAddresses = await prisma.$queryRawUnsafe(`
      SELECT COUNT(*) as count FROM "addresses"
    `) as Array<{ count: bigint }>

    if (Number(candidatesWithAddress[0]?.count) > Number(totalAddresses[0]?.count)) {
      console.log('⚠️ Not all addresses have been migrated. Skipping cleanup.')
      return
    }

    console.log('All addresses migrated successfully. Dropping address column...')
    
    // Eliminar la columna address
    await prisma.$queryRawUnsafe(`
      ALTER TABLE "candidates" DROP COLUMN "address"
    `)

    console.log('✅ Address column cleanup completed successfully!')

  } catch (error) {
    console.error('Error during address column cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (typeof require !== 'undefined' && require.main === module) {
  migrateAddressDataSimple()
    .catch((error) => {
      console.error(error)
      if (typeof process !== 'undefined') {
        process.exit(1)
      }
    })
}

export { 
  migrateAddressDataSimple, 
  migrateAddressDataWithParsingSimple, 
  cleanupAddressColumn,
  parseAddress 
}
export default migrateAddressDataSimple
