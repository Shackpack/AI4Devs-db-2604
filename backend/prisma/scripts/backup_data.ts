import * as dotenv from 'dotenv'
import * as path from 'path'
import * as fs from 'fs'

dotenv.config({ path: path.resolve(__dirname, '..', '.env') })

const { DB_USER, DB_PASSWORD, DB_NAME, DB_PORT } = process.env
if (!DB_USER || !DB_PASSWORD || !DB_NAME || !DB_PORT) {
  console.error('❌ Variables de entorno DB_USER, DB_PASSWORD, DB_NAME, DB_PORT no encontradas')
  process.exit(1)
}
process.env.DATABASE_URL = `postgresql://${DB_USER}:${DB_PASSWORD}@172.22.60.83:${DB_PORT}/${DB_NAME}`

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function backupData() {
  console.log('=== FASE 1: BACKUP DE DATOS ===')
  console.log(`Timestamp: ${new Date().toISOString()}`)

  const candidates = await prisma.candidate.findMany()
  const educations = await prisma.education.findMany()
  const workExperiences = await prisma.workExperience.findMany()
  const resumes = await prisma.resume.findMany()

  const backup = {
    timestamp: new Date().toISOString(),
    source_db: process.env.DATABASE_URL?.replace(/:\/\/.*@/, '://***@') ?? 'unknown',
    counts: {
      candidates: candidates.length,
      educations: educations.length,
      workExperiences: workExperiences.length,
      resumes: resumes.length,
    },
    data: {
      candidates,
      educations,
      workExperiences,
      resumes,
    },
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const backupDir = path.resolve(__dirname, '..', '..', '..', 'backups')

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }

  const filePath = path.join(backupDir, `backup_${timestamp}.json`)
  fs.writeFileSync(filePath, JSON.stringify(backup, null, 2), 'utf-8')

  const stats = fs.statSync(filePath)

  console.log('\n=== RESULTADO ===')
  console.log(`✅ Candidatos:        ${candidates.length}`)
  console.log(`✅ Educaciones:       ${educations.length}`)
  console.log(`✅ Exp. laborales:    ${workExperiences.length}`)
  console.log(`✅ CVs/Resumes:       ${resumes.length}`)
  console.log(`\n✅ Archivo generado: ${filePath}`)
  console.log(`✅ Tamaño:           ${stats.size} bytes`)

  if (stats.size === 0) {
    console.error('❌ ERROR: El archivo de backup está vacío')
    process.exit(1)
  }

  console.log('\n✅ FASE 1 COMPLETADA — Backup verificado')
  console.log('   Guardar la ruta del backup antes de continuar con Fase 2:')
  console.log(`   ${filePath}`)
}

backupData()
  .catch((err) => {
    console.error('❌ Error durante el backup:', err)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
