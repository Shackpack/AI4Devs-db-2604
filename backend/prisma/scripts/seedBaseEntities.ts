import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedBaseEntities() {
  try {
    console.log('Starting seed of base entities...')

    // Crear rangos salariales
    console.log('Creating salary ranges...')
    await prisma.salaryRange.createMany({
      data: [
        { name: 'Entry Level', minSalary: 30000, maxSalary: 50000, currency: 'USD', payFrequency: 'annually', level: 'junior' },
        { name: 'Mid Level', minSalary: 50000, maxSalary: 80000, currency: 'USD', payFrequency: 'annually', level: 'mid' },
        { name: 'Senior Level', minSalary: 80000, maxSalary: 120000, currency: 'USD', payFrequency: 'annually', level: 'senior' },
        { name: 'Lead Level', minSalary: 120000, maxSalary: 160000, currency: 'USD', payFrequency: 'annually', level: 'lead' },
        { name: 'Executive Level', minSalary: 160000, maxSalary: 250000, currency: 'USD', payFrequency: 'annually', level: 'executive' }
      ],
      skipDuplicates: true
    })

    // Crear tipos de entrevista
    console.log('Creating interview types...')
    await prisma.interviewType.createMany({
      data: [
        { name: 'Telefónica', description: 'Entrevista inicial por teléfono para preselección' },
        { name: 'Técnica', description: 'Entrevista técnica para evaluar habilidades específicas' },
        { name: 'Cultural', description: 'Entrevista para evaluar el ajuste con la cultura de la empresa' },
        { name: 'Final', description: 'Entrevista final con el gerente o director' },
        { name: 'Prueba práctica', description: 'Evaluación práctica de habilidades' },
        { name: 'Psicométrica', description: 'Evaluación de competencias blandas y personalidad' }
      ],
      skipDuplicates: true
    })

    // Crear flujos de entrevista
    console.log('Creating interview flows...')
    await prisma.interviewFlow.createMany({
      data: [
        { description: 'Flujo estándar para desarrolladores' },
        { description: 'Flujo rápido para posiciones junior' },
        { description: 'Flujo ejecutivo para roles senior' },
        { description: 'Flujo técnico especializado' },
        { description: 'Flujo para roles de ventas y marketing' }
      ],
      skipDuplicates: true
    })

    // Crear tipos de beneficios
    console.log('Creating benefit types...')
    await prisma.benefitType.createMany({
      data: [
        { name: 'Health Insurance', description: 'Comprehensive medical coverage', category: 'health' },
        { name: 'Dental Insurance', description: 'Dental care coverage', category: 'health' },
        { name: 'Vision Insurance', description: 'Eye care coverage', category: 'health' },
        { name: '401(k) Matching', description: 'Retirement savings matching', category: 'financial' },
        { name: 'Paid Time Off', description: 'Vacation and sick leave', category: 'time_off' },
        { name: 'Remote Work', description: 'Flexible work location', category: 'flexibility' },
        { name: 'Professional Development', description: 'Training and education budget', category: 'career' },
        { name: 'Gym Membership', description: 'Fitness benefits', category: 'wellness' },
        { name: 'Stock Options', description: 'Company stock participation', category: 'financial' },
        { name: 'Transportation', description: 'Transportation benefits or allowance', category: 'transportation' }
      ],
      skipDuplicates: true
    })

    // Crear pasos de entrevista para cada flujo
    console.log('Creating interview steps...')
    const interviewTypes = await prisma.interviewType.findMany()
    const interviewFlows = await prisma.interviewFlow.findMany()

    for (const flow of interviewFlows) {
      if (flow.description.includes('desarrolladores') || flow.description.includes('técnico')) {
        // Flujo técnico
        await prisma.interviewStep.createMany({
          data: [
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Telefónica')!.id,
              name: 'Screening Telefónico',
              orderIndex: 1
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Técnica')!.id,
              name: 'Entrevista Técnica - Nivel 1',
              orderIndex: 2
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Técnica')!.id,
              name: 'Entrevista Técnica - Nivel 2',
              orderIndex: 3
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Cultural')!.id,
              name: 'Entrevista Cultural',
              orderIndex: 4
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Final')!.id,
              name: 'Entrevista Final',
              orderIndex: 5
            }
          ],
          skipDuplicates: true
        })
      } else if (flow.description.includes('ejecutivo')) {
        // Flujo ejecutivo
        await prisma.interviewStep.createMany({
          data: [
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Telefónica')!.id,
              name: 'Contacto Inicial',
              orderIndex: 1
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Psicométrica')!.id,
              name: 'Evaluación Psicométrica',
              orderIndex: 2
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Cultural')!.id,
              name: 'Entrevista con HR Director',
              orderIndex: 3
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Final')!.id,
              name: 'Entrevista con CEO/Board',
              orderIndex: 4
            }
          ],
          skipDuplicates: true
        })
      } else if (flow.description.includes('junior')) {
        // Flujo rápido
        await prisma.interviewStep.createMany({
          data: [
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Telefónica')!.id,
              name: 'Screening Rápido',
              orderIndex: 1
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Técnica')!.id,
              name: 'Prueba Técnica Breve',
              orderIndex: 2
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Final')!.id,
              name: 'Entrevista Final',
              orderIndex: 3
            }
          ],
          skipDuplicates: true
        })
      } else {
        // Flujo estándar
        await prisma.interviewStep.createMany({
          data: [
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Telefónica')!.id,
              name: 'Screening Telefónico',
              orderIndex: 1
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Técnica')!.id,
              name: 'Entrevista Técnica',
              orderIndex: 2
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Cultural')!.id,
              name: 'Entrevista Cultural',
              orderIndex: 3
            },
            {
              interviewFlowId: flow.id,
              interviewTypeId: interviewTypes.find(t => t.name === 'Final')!.id,
              name: 'Entrevista Final',
              orderIndex: 4
            }
          ],
          skipDuplicates: true
        })
      }
    }

    console.log('Base entities seeded successfully!')
    
    // Mostrar resumen
    const salaryRanges = await prisma.salaryRange.count()
    const interviewTypes = await prisma.interviewType.count()
    const interviewFlows = await prisma.interviewFlow.count()
    const interviewSteps = await prisma.interviewStep.count()
    const benefitTypes = await prisma.benefitType.count()

    console.log('\nSeed Summary:')
    console.log(`- Salary Ranges: ${salaryRanges}`)
    console.log(`- Interview Types: ${interviewTypes}`)
    console.log(`- Interview Flows: ${interviewFlows}`)
    console.log(`- Interview Steps: ${interviewSteps}`)
    console.log(`- Benefit Types: ${benefitTypes}`)

  } catch (error) {
    console.error('Error seeding base entities:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  seedBaseEntities()
    .catch((error) => {
      console.error(error)
      process.exit(1)
    })
}

export default seedBaseEntities
