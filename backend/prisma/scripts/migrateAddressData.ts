import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAddressData() {
  try {
    console.log('Starting address data migration...')

    // Obtener todos los candidatos que tienen dirección en el campo antiguo
    // Nota: Esto asume que el campo address todavía existe en la tabla Candidate
    // Si ya fue eliminado, este script necesitará ajustarse
    
    // Primero, verificamos si la columna address existe
    try {
      const result = await prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'candidates' 
        AND column_name = 'address'
      ` as Array<{ column_name: string }>

      if (result.length === 0) {
        console.log('Address column does not exist in candidates table. Skipping migration.')
        return
      }
    } catch (error) {
      console.log('Could not check for address column. Assuming it exists.')
    }

    // Obtener candidatos con dirección no nula
    const candidatesWithAddress = await prisma.$queryRaw`
      SELECT id, firstName, lastName, email, address 
      FROM "candidates" 
      WHERE address IS NOT NULL 
      AND address != ''
    ` as Array<{
      id: number
      firstName: string
      lastName: string
      email: string
      address: string
    }>

    console.log(`Found ${candidatesWithAddress.length} candidates with addresses to migrate`)

    let migratedCount = 0
    let skippedCount = 0

    for (const candidate of candidatesWithAddress) {
      try {
        // Verificar si ya existe una dirección para este candidato
        const existingAddress = await prisma.address.findFirst({
          where: { candidateId: candidate.id }
        })

        if (existingAddress) {
          console.log(`Candidate ${candidate.id} already has address records. Skipping.`)
          skippedCount++
          continue
        }

        // Crear registro en Address
        // Por simplicidad, ponemos toda la dirección en el campo street
        // En un caso real, podríamos intentar parsear la dirección
        await prisma.address.create({
          data: {
            candidateId: candidate.id,
            street: candidate.address,
            isPrimary: true,
            addressType: 'home'
          }
        })

        migratedCount++
        console.log(`Migrated address for candidate ${candidate.id}: ${candidate.firstName} ${candidate.lastName}`)

      } catch (error) {
        console.error(`Error migrating address for candidate ${candidate.id}:`, error)
      }
    }

    console.log(`\nAddress migration completed:`)
    console.log(`- Successfully migrated: ${migratedCount}`)
    console.log(`- Skipped (already exists): ${skippedCount}`)

    // Validación posterior
    const totalAddresses = await prisma.address.count()
    const totalCandidates = await prisma.candidate.count()
    
    console.log(`\nValidation:`)
    console.log(`- Total candidates: ${totalCandidates}`)
    console.log(`- Total addresses: ${totalAddresses}`)
    console.log(`- Coverage: ${((totalAddresses / totalCandidates) * 100).toFixed(2)}%`)

  } catch (error) {
    console.error('Error during address migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Función para parsear direcciones simples (opcional)
function parseAddress(address: string) {
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
async function migrateAddressDataWithParsing() {
  try {
    console.log('Starting enhanced address data migration with parsing...')

    const candidatesWithAddress = await prisma.$queryRaw`
      SELECT id, firstName, lastName, email, address 
      FROM "candidates" 
      WHERE address IS NOT NULL 
      AND address != ''
    ` as Array<{
      id: number
      firstName: string
      lastName: string
      email: string
      address: string
    }>

    console.log(`Found ${candidatesWithAddress.length} candidates with addresses to migrate`)

    let migratedCount = 0
    let parsedCount = 0

    for (const candidate of candidatesWithAddress) {
      try {
        const existingAddress = await prisma.address.findFirst({
          where: { candidateId: candidate.id }
        })

        if (existingAddress) {
          continue
        }

        // Intentar parsear la dirección
        const parsedAddress = parseAddress(candidate.address)
        
        // Si el parsing parece exitoso (múltiples campos), usarlo
        const hasMultipleFields = Object.values(parsedAddress).filter(v => v).length > 1
        
        await prisma.address.create({
          data: {
            candidateId: candidate.id,
            street: parsedAddress.street || candidate.address,
            city: parsedAddress.city,
            state: parsedAddress.state,
            country: parsedAddress.country,
            zipCode: parsedAddress.zipCode,
            isPrimary: true,
            addressType: 'home'
          }
        })

        migratedCount++
        if (hasMultipleFields) parsedCount++
        
        console.log(`Migrated address for candidate ${candidate.id}: ${candidate.firstName} ${candidate.lastName}`)

      } catch (error) {
        console.error(`Error migrating address for candidate ${candidate.id}:`, error)
      }
    }

    console.log(`\nEnhanced address migration completed:`)
    console.log(`- Successfully migrated: ${migratedCount}`)
    console.log(`- Successfully parsed: ${parsedCount}`)
    console.log(`- Simple migration only: ${migratedCount - parsedCount}`)

  } catch (error) {
    console.error('Error during enhanced address migration:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (typeof require !== 'undefined' && require.main === module) {
  migrateAddressData()
    .catch((error) => {
      console.error(error)
      if (typeof process !== 'undefined') {
        process.exit(1)
      }
    })
}

export { migrateAddressData, migrateAddressDataWithParsing }
export default migrateAddressData
