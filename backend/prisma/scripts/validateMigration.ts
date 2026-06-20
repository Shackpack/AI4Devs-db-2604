import { PrismaClient } from '@prisma/client'
import { Prisma } from '@prisma/client'

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

async function validateMigration(): Promise<ValidationResult> {
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
    console.log('Starting migration validation...')

    // 1. Contar registros en todas las tablas
    console.log('\n1. Counting records in all tables...')
    
    result.summary.candidates = await prisma.candidate.count()
    
    // Contar tablas nuevas con manejo de errores (pueden no existir aún)
    try {
      result.summary.addresses = await prisma.address.count()
    } catch {
      result.summary.addresses = 0
      console.log('Address table not found yet (expected during migration)')
    }
    
    try {
      result.summary.companies = await prisma.company.count()
    } catch {
      result.summary.companies = 0
      console.log('Company table not found yet (expected during migration)')
    }
    
    try {
      result.summary.positions = await prisma.position.count()
    } catch {
      result.summary.positions = 0
      console.log('Position table not found yet (expected during migration)')
    }
    
    try {
      result.summary.applications = await prisma.application.count()
    } catch {
      result.summary.applications = 0
      console.log('Application table not found yet (expected during migration)')
    }
    
    try {
      result.summary.interviews = await prisma.interview.count()
    } catch {
      result.summary.interviews = 0
      console.log('Interview table not found yet (expected during migration)')
    }
    
    try {
      result.summary.employees = await prisma.employee.count()
    } catch {
      result.summary.employees = 0
      console.log('Employee table not found yet (expected during migration)')
    }

    console.log('Record counts:')
    Object.entries(result.summary).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`)
    })

    // 2. Validar integridad de datos migrados
    console.log('\n2. Validating data integrity...')

    // Validar que cada candidato con dirección tenga un registro en Address
    const candidatesWithoutAddress = await prisma.candidate.findMany({
      where: {
        addresses: {
          none: {}
        }
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true
      }
    })

    if (candidatesWithoutAddress.length > 0) {
      result.issues.push({
        type: 'warning',
        message: `${candidatesWithoutAddress.length} candidates without addresses`,
        details: candidatesWithoutAddress.slice(0, 5) // Mostrar primeros 5
      })
    }

    // Validar que todas las posiciones tengan empresa y flujo de entrevista
    const positionsWithoutCompany = await prisma.position.findMany({
      where: {
        company: null
      },
      select: {
        id: true,
        title: true
      }
    })

    if (positionsWithoutCompany.length > 0) {
      result.issues.push({
        type: 'error',
        message: `${positionsWithoutCompany.length} positions without company`,
        details: positionsWithoutCompany
      })
      result.success = false
    }

    const positionsWithoutFlow = await prisma.position.findMany({
      where: {
        interviewFlow: null
      },
      select: {
        id: true,
        title: true
      }
    })

    if (positionsWithoutFlow.length > 0) {
      result.issues.push({
        type: 'error',
        message: `${positionsWithoutFlow.length} positions without interview flow`,
        details: positionsWithoutFlow
      })
      result.success = false
    }

    // Validar que todas las aplicaciones tengan posición y candidato
    const applicationsWithoutPosition = await prisma.application.findMany({
      where: {
        position: null
      },
      select: {
        id: true,
        status: true
      }
    })

    if (applicationsWithoutPosition.length > 0) {
      result.issues.push({
        type: 'error',
        message: `${applicationsWithoutPosition.length} applications without position`,
        details: applicationsWithoutPosition
      })
      result.success = false
    }

    const applicationsWithoutCandidate = await prisma.application.findMany({
      where: {
        candidate: null
      },
      select: {
        id: true,
        status: true
      }
    })

    if (applicationsWithoutCandidate.length > 0) {
      result.issues.push({
        type: 'error',
        message: `${applicationsWithoutCandidate.length} applications without candidate`,
        details: applicationsWithoutCandidate
      })
      result.success = false
    }

    // Validar que todas las entrevistas tengan aplicación, paso y empleado
    const interviewsWithoutApplication = await prisma.interview.findMany({
      where: {
        application: null
      },
      select: {
        id: true,
        interviewDate: true
      }
    })

    if (interviewsWithoutApplication.length > 0) {
      result.issues.push({
        type: 'error',
        message: `${interviewsWithoutApplication.length} interviews without application`,
        details: interviewsWithoutApplication
      })
      result.success = false
    }

    // 3. Validar datos de referencia
    console.log('\n3. Validating reference data...')

    const salaryRangesCount = await prisma.salaryRange.count()
    const interviewTypesCount = await prisma.interviewType.count()
    const interviewFlowsCount = await prisma.interviewFlow.count()
    const benefitTypesCount = await prisma.benefitType.count()

    if (salaryRangesCount === 0) {
      result.issues.push({
        type: 'error',
        message: 'No salary ranges found'
      })
      result.success = false
    }

    if (interviewTypesCount === 0) {
      result.issues.push({
        type: 'error',
        message: 'No interview types found'
      })
      result.success = false
    }

    if (interviewFlowsCount === 0) {
      result.issues.push({
        type: 'error',
        message: 'No interview flows found'
      })
      result.success = false
    }

    if (benefitTypesCount === 0) {
      result.issues.push({
        type: 'error',
        message: 'No benefit types found'
      })
      result.success = false
    }

    console.log('Reference data counts:')
    console.log(`  Salary ranges: ${salaryRangesCount}`)
    console.log(`  Interview types: ${interviewTypesCount}`)
    console.log(`  Interview flows: ${interviewFlowsCount}`)
    console.log(`  Benefit types: ${benefitTypesCount}`)

    // 4. Validar unicidad y constraints
    console.log('\n4. Validating constraints...')

    // Verificar emails únicos de candidatos
    const duplicateCandidateEmails = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count
      FROM "candidates"
      GROUP BY email
      HAVING COUNT(*) > 1
    ` as Array<{ email: string; count: number }>

    if (duplicateCandidateEmails.length > 0) {
      result.issues.push({
        type: 'error',
        message: 'Duplicate candidate emails found',
        details: duplicateCandidateEmails
      })
      result.success = false
    }

    // Verificar emails únicos de empleados
    const duplicateEmployeeEmails = await prisma.$queryRaw`
      SELECT email, COUNT(*) as count
      FROM "employees"
      GROUP BY email
      HAVING COUNT(*) > 1
    ` as Array<{ email: string; count: number }>

    if (duplicateEmployeeEmails.length > 0) {
      result.issues.push({
        type: 'error',
        message: 'Duplicate employee emails found',
        details: duplicateEmployeeEmails
      })
      result.success = false
    }

    // 5. Validar relaciones de negocio
    console.log('\n5. Validating business logic...')

    // Verificar que no haya aplicaciones duplicadas (position + candidate)
    const duplicateApplications = await prisma.$queryRaw`
      SELECT position_id, candidate_id, COUNT(*) as count
      FROM "applications"
      GROUP BY position_id, candidate_id
      HAVING COUNT(*) > 1
    ` as Array<{ position_id: number; candidate_id: number; count: number }>

    if (duplicateApplications.length > 0) {
      result.issues.push({
        type: 'error',
        message: 'Duplicate applications found',
        details: duplicateApplications
      })
      result.success = false
    }

    // Verificar scores de entrevistas en rango válido
    const invalidInterviewScores = await prisma.interview.findMany({
      where: {
        OR: [
          { score: { lt: 0 } },
          { score: { gt: 100 } }
        ]
      },
      select: {
        id: true,
        score: true
      }
    })

    if (invalidInterviewScores.length > 0) {
      result.issues.push({
        type: 'warning',
        message: `${invalidInterviewScores.length} interviews with invalid scores`,
        details: invalidInterviewScores
      })
    }

    // 6. Generar reporte final
    console.log('\n6. Generating final report...')

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
        if (issue.details) {
          console.log(`   Details: ${JSON.stringify(issue.details, null, 2)}`)
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

// Función para validación rápida (solo contadores)
async function quickValidation() {
  try {
    console.log('Running quick validation...')

    const counts = await prisma.$transaction([
      prisma.candidate.count(),
      prisma.address.count(),
      prisma.company.count(),
      prisma.position.count(),
      prisma.application.count(),
      prisma.interview.count(),
      prisma.employee.count(),
      prisma.salaryRange.count(),
      prisma.interviewType.count(),
      prisma.interviewFlow.count(),
      prisma.benefitType.count()
    ])

    const [
      candidates,
      addresses,
      companies,
      positions,
      applications,
      interviews,
      employees,
      salaryRanges,
      interviewTypes,
      interviewFlows,
      benefitTypes
    ] = counts

    console.log('Quick Validation Results:')
    console.log(`Candidates: ${candidates}`)
    console.log(`Addresses: ${addresses}`)
    console.log(`Companies: ${companies}`)
    console.log(`Positions: ${positions}`)
    console.log(`Applications: ${applications}`)
    console.log(`Interviews: ${interviews}`)
    console.log(`Employees: ${employees}`)
    console.log(`Salary Ranges: ${salaryRanges}`)
    console.log(`Interview Types: ${interviewTypes}`)
    console.log(`Interview Flows: ${interviewFlows}`)
    console.log(`Benefit Types: ${benefitTypes}`)

    const addressCoverage = candidates > 0 ? ((addresses / candidates) * 100).toFixed(2) : '0'
    console.log(`Address Coverage: ${addressCoverage}%`)

    return {
      candidates,
      addresses,
      companies,
      positions,
      applications,
      interviews,
      employees,
      salaryRanges,
      interviewTypes,
      interviewFlows,
      benefitTypes,
      addressCoverage: parseFloat(addressCoverage)
    }

  } catch (error) {
    console.error('Error during quick validation:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  validateMigration()
    .then((result) => {
      if (!result.success) {
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export { validateMigration, quickValidation }
export default validateMigration
