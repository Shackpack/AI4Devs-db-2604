import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

interface ValidationResult {
  success: boolean
  issues: Array<{
    type: 'error' | 'warning'
    message: string
    details?: any
  }>
  summary: {
    candidates: number
    addresses: number
    companies: number
    positions: number
    applications: number
    interviews: number
    employees: number
  }
}

async function validateMigrationSimple(): Promise<ValidationResult> {
  const result: ValidationResult = {
    success: true,
    issues: [],
    summary: {
      candidates: 0,
      addresses: 0,
      companies: 0,
      positions: 0,
      applications: 0,
      interviews: 0,
      employees: 0
    }
  }

  try {
    console.log('Starting simple migration validation...')

    // 1. Contar registros usando SQL raw para evitar errores de TypeScript
    console.log('\n1. Counting records using raw SQL...')

    const tables = [
      'candidates',
      'addresses', 
      'companies',
      'positions',
      'applications',
      'interviews',
      'employees',
      'salary_ranges',
      'interview_types',
      'interview_flows',
      'benefit_types'
    ]

    const counts: Record<string, number> = {}

    for (const table of tables) {
      try {
        const countResult = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM "${table}"
        `) as Array<{ count: bigint }>
        
        counts[table] = Number(countResult[0]?.count || 0)
      } catch (error) {
        counts[table] = 0
        console.log(`Table ${table} not found yet (expected during migration)`)
      }
    }

    // Asignar al summary
    result.summary.candidates = counts.candidates
    result.summary.addresses = counts.addresses
    result.summary.companies = counts.companies
    result.summary.positions = counts.positions
    result.summary.applications = counts.applications
    result.summary.interviews = counts.interviews
    result.summary.employees = counts.employees

    console.log('Record counts:')
    Object.entries(result.summary).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`)
    })

    console.log('\nReference data counts:')
    console.log(`  Salary ranges: ${counts.salary_ranges}`)
    console.log(`  Interview types: ${counts.interview_types}`)
    console.log(`  Interview flows: ${counts.interview_flows}`)
    console.log(`  Benefit types: ${counts.benefit_types}`)

    // 2. Validaciones básicas con SQL raw
    console.log('\n2. Basic validations...')

    // Validar emails únicos de candidatos
    try {
      const duplicateEmails = await prisma.$queryRawUnsafe(`
        SELECT email, COUNT(*) as count
        FROM "candidates"
        GROUP BY email
        HAVING COUNT(*) > 1
      `) as Array<{ email: string; count: number }>

      if (duplicateEmails.length > 0) {
        result.issues.push({
          type: 'error',
          message: 'Duplicate candidate emails found',
          details: duplicateEmails
        })
        result.success = false
      }
    } catch (error) {
      console.log('Could not validate candidate emails (table may not exist)')
    }

    // Validar emails únicos de empleados
    try {
      const duplicateEmployeeEmails = await prisma.$queryRawUnsafe(`
        SELECT email, COUNT(*) as count
        FROM "employees"
        GROUP BY email
        HAVING COUNT(*) > 1
      `) as Array<{ email: string; count: number }>

      if (duplicateEmployeeEmails.length > 0) {
        result.issues.push({
          type: 'error',
          message: 'Duplicate employee emails found',
          details: duplicateEmployeeEmails
        })
        result.success = false
      }
    } catch (error) {
      console.log('Could not validate employee emails (table may not exist)')
    }

    // Validar aplicaciones duplicadas
    try {
      const duplicateApplications = await prisma.$queryRawUnsafe(`
        SELECT position_id, candidate_id, COUNT(*) as count
        FROM "applications"
        GROUP BY position_id, candidate_id
        HAVING COUNT(*) > 1
      `) as Array<{ position_id: number; candidate_id: number; count: number }>

      if (duplicateApplications.length > 0) {
        result.issues.push({
          type: 'error',
          message: 'Duplicate applications found',
          details: duplicateApplications
        })
        result.success = false
      }
    } catch (error) {
      console.log('Could not validate applications (table may not exist)')
    }

    // 3. Validar integridad referencial básica
    console.log('\n3. Referential integrity checks...')

    // Verificar foreign keys si las tablas existen
    if (counts.applications > 0) {
      try {
        const orphanedApplications = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count
          FROM "applications" a
          LEFT JOIN "candidates" c ON a.candidate_id = c.id
          LEFT JOIN "positions" p ON a.position_id = p.id
          WHERE c.id IS NULL OR p.id IS NULL
        `) as Array<{ count: bigint }>

        if (Number(orphanedApplications[0]?.count) > 0) {
          result.issues.push({
            type: 'error',
            message: `${Number(orphanedApplications[0]?.count)} applications with invalid references`
          })
          result.success = false
        }
      } catch (error) {
        console.log('Could not validate application references')
      }
    }

    // 4. Validar datos de referencia
    console.log('\n4. Reference data validation...')

    if (counts.salary_ranges === 0) {
      result.issues.push({
        type: 'warning',
        message: 'No salary ranges found (may need seeding)'
      })
    }

    if (counts.interview_types === 0) {
      result.issues.push({
        type: 'warning',
        message: 'No interview types found (may need seeding)'
      })
    }

    if (counts.interview_flows === 0) {
      result.issues.push({
        type: 'warning',
        message: 'No interview flows found (may need seeding)'
      })
    }

    // 5. Generar reporte final
    console.log('\n5. Generating final report...')

    const addressCoverage = result.summary.candidates > 0 
      ? ((result.summary.addresses / result.summary.candidates) * 100).toFixed(2)
      : '0'

    console.log('\n=== VALIDATION REPORT ===')
    console.log(`Overall Status: ${result.success ? '✅ PASSED' : '❌ FAILED'}`)
    console.log(`Issues Found: ${result.issues.length}`)
    
    console.log('\nData Summary:')
    console.log(`- Candidates: ${result.summary.candidates}`)
    console.log(`- Addresses: ${result.summary.addresses} (${addressCoverage}% coverage)`)
    console.log(`- Companies: ${result.summary.companies}`)
    console.log(`- Positions: ${result.summary.positions}`)
    console.log(`- Applications: ${result.summary.applications}`)
    console.log(`- Interviews: ${result.summary.interviews}`)
    console.log(`- Employees: ${result.summary.employees}`)

    if (result.issues.length > 0) {
      console.log('\nIssues:')
      result.issues.forEach((issue, index) => {
        const icon = issue.type === 'error' ? '❌' : '⚠️'
        console.log(`${index + 1}. ${icon} ${issue.message}`)
        if (issue.details && Array.isArray(issue.details) && issue.details.length <= 3) {
          console.log(`   Details: ${JSON.stringify(issue.details, null, 2)}`)
        } else if (issue.details) {
          console.log(`   Details: ${issue.details.length || 'multiple'} items`)
        }
      })
    }

    if (result.success) {
      console.log('\n🎉 Migration validation completed successfully!')
    } else {
      console.log('\n❌ Migration validation failed. Please address the issues above.')
    }

    return result

  } catch (error) {
    console.error('Error during validation:', error)
    result.issues.push({
      type: 'error',
      message: `Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`
    })
    result.success = false
    return result
  } finally {
    await prisma.$disconnect()
  }
}

// Función para validación muy rápida (solo contar tablas)
async function quickValidation() {
  try {
    console.log('Running quick validation...')

    const tables = [
      'candidates',
      'addresses', 
      'companies',
      'positions',
      'applications',
      'interviews',
      'employees',
      'salary_ranges',
      'interview_types',
      'interview_flows',
      'benefit_types'
    ]

    const counts: Record<string, number> = {}

    for (const table of tables) {
      try {
        const countResult = await prisma.$queryRawUnsafe(`
          SELECT COUNT(*) as count FROM "${table}"
        `) as Array<{ count: bigint }>
        
        counts[table] = Number(countResult[0]?.count || 0)
      } catch (error) {
        counts[table] = 0
      }
    }

    console.log('Quick Validation Results:')
    Object.entries(counts).forEach(([table, count]) => {
      console.log(`${table}: ${count}`)
    })

    const addressCoverage = counts.candidates > 0 ? ((counts.addresses / counts.candidates) * 100).toFixed(2) : '0'
    console.log(`Address Coverage: ${addressCoverage}%`)

    return counts

  } catch (error) {
    console.error('Error during quick validation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (typeof require !== 'undefined' && require.main === module) {
  validateMigrationSimple()
    .then((result) => {
      if (!result.success) {
        if (typeof process !== 'undefined') {
          process.exit(1)
        }
      }
    })
    .catch((error) => {
      console.error(error)
      if (typeof process !== 'undefined') {
        process.exit(1)
      }
    })
}

export { validateMigrationSimple, quickValidation }
export default validateMigrationSimple
