# Plan de Actualización con Prisma - Optimizaciones de Base de Datos

## Resumen Ejecutivo

Este plan describe la migración desde el esquema actual (4 tablas simples) al esquema optimizado (15+ tablas con relaciones complejas) utilizando Prisma Migrate de forma segura y escalable.

## 1. Estrategia de Migración

### 1.1 Enfoque por Fases
- **Fase 1:** Preparación y análisis
- **Fase 2:** Creación de nuevas entidades
- **Fase 3:** Migración de datos existentes
- **Fase 4:** Actualización de relaciones
- **Fase 5:** Optimización y limpieza

### 1.2 Principios Clave
- **Zero-downtime:** Mantener el sistema funcional durante la migración
- **Reversible:** Cada migración debe poder revertirse
- **Validado:** Verificar datos después de cada paso
- **Incremental:** Cambios pequeños y validados

## 2. Estado Actual vs Estado Deseado

### Estado Actual (PostgreSQL)
```prisma
model Candidate {
  id                Int               @id @default(autoincrement())
  firstName         String            @db.VarChar(100)
  lastName          String            @db.VarChar(100)
  email             String            @unique @db.VarChar(255)
  phone             String?           @db.VarChar(15)
  address           String?           @db.VarChar(100)
  educations        Education[]
  workExperiences   WorkExperience[]
  resumes           Resume[]
}

model Education { /* ... */ }
model WorkExperience { /* ... */ }
model Resume { /* ... */ }
```

### Estado Deseado (PostgreSQL Optimizado)
```prisma
model Company { /* Nueva */ }
model Employee { /* Nueva */ }
model Position { /* Nueva */ }
model Candidate { /* Modificada */ }
model Application { /* Nueva */ }
model Interview { /* Nueva */ }
model InterviewFlow { /* Nueva */ }
model InterviewStep { /* Nueva */ }
model InterviewType { /* Nueva */ }
model Address { /* Nueva */ }
model PositionContact { /* Nueva */ }
model SalaryRange { /* Nueva */ }
model BenefitType { /* Nueva */ }
model PositionBenefit { /* Nueva */ }
model Requirement { /* Nueva */ }
model Responsibility { /* Nueva */ }
model AuditLog { /* Nueva */ }
// + modelos existentes modificados
```

## 3. Plan de Migración Detallado

### Fase 1: Preparación (Día 0)

#### 1.1 Backup y Validación
```bash
# Backup completo de la base de datos
pg_dump -h localhost -U postgres -d hr_recruitment > backup_$(date +%Y%m%d).sql

# Validar integridad de datos existentes
npx prisma db pull
npx prisma generate
```

#### 1.2 Crear Schema Prisma de Referencia
```bash
# Generar schema actual como referencia
cp schema.prisma schema_original.prisma
```

### Fase 2: Nuevas Entidades Base (Día 1)

#### 2.1 Crear entidades sin dependencias
```prisma
// Agregar a schema.prisma
model Company {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(255)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  employees   Employee[]
  positions   Position[]
}

model InterviewType {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(100)
  description String?
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  interviewSteps InterviewStep[]
}

model InterviewFlow {
  id          Int       @id @default(autoincrement())
  description String
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  positions   Position[]
  interviewSteps InterviewStep[]
}

model SalaryRange {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(100)
  minSalary    Decimal   @db.Decimal(10, 2) @map("min_salary")
  maxSalary    Decimal   @db.Decimal(10, 2) @map("max_salary")
  currency     String    @default("USD") @db.VarChar(3)
  payFrequency String    @default("annually") @map("pay_frequency") @db.VarChar(50)
  level        String?   @db.VarChar(50)
  createdAt    DateTime  @default(now()) @map("created_at")
  positions    Position[]
}

model BenefitType {
  id          Int       @id @default(autoincrement())
  name        String    @db.VarChar(100)
  description String?
  category    String?   @db.VarChar(50)
  createdAt   DateTime  @default(now()) @map("created_at")
  positionBenefits PositionBenefit[]
}
```

#### 2.2 Generar y aplicar migración
```bash
npx prisma migrate dev --name add_base_entities
npx prisma db push
```

#### 2.3 Poblar datos iniciales
```typescript
// scripts/seedBaseEntities.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function seedBaseEntities() {
  // Crear rangos salariales
  await prisma.salaryRange.createMany({
    data: [
      { name: 'Entry Level', minSalary: 30000, maxSalary: 50000, level: 'junior' },
      { name: 'Mid Level', minSalary: 50000, maxSalary: 80000, level: 'mid' },
      { name: 'Senior Level', minSalary: 80000, maxSalary: 120000, level: 'senior' },
      { name: 'Lead Level', minSalary: 120000, maxSalary: 160000, level: 'lead' },
      { name: 'Executive Level', minSalary: 160000, maxSalary: 250000, level: 'executive' }
    ]
  })

  // Crear tipos de entrevista
  await prisma.interviewType.createMany({
    data: [
      { name: 'Telefónica', description: 'Entrevista inicial por teléfono' },
      { name: 'Técnica', description: 'Entrevista técnica para evaluar habilidades' },
      { name: 'Cultural', description: 'Entrevista para evaluar ajuste cultural' },
      { name: 'Final', description: 'Entrevista final con gerente' },
      { name: 'Prueba práctica', description: 'Evaluación práctica de habilidades' }
    ]
  })

  // Crear flujos de entrevista
  await prisma.interviewFlow.createMany({
    data: [
      { description: 'Flujo estándar para desarrolladores' },
      { description: 'Flujo rápido para posiciones junior' },
      { description: 'Flujo ejecutivo para roles senior' },
      { description: 'Flujo técnico especializado' }
    ]
  })

  // Crear tipos de beneficios
  await prisma.benefitType.createMany({
    data: [
      { name: 'Health Insurance', description: 'Comprehensive medical coverage', category: 'health' },
      { name: 'Dental Insurance', description: 'Dental care coverage', category: 'health' },
      { name: '401(k) Matching', description: 'Retirement savings matching', category: 'financial' },
      { name: 'Paid Time Off', description: 'Vacation and sick leave', category: 'time_off' },
      { name: 'Remote Work', description: 'Flexible work location', category: 'flexibility' }
    ]
  })
}
```

### Fase 3: Modificar Candidate y Agregar Address (Día 2)

#### 3.1 Actualizar modelo Candidate
```prisma
model Candidate {
  id          Int       @id @default(autoincrement())
  firstName   String    @db.VarChar(100)
  lastName    String    @db.VarChar(100)
  email       String    @unique @db.VarChar(255)
  phone       String?   @db.VarChar(20)
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  // Relaciones nuevas
  addresses   Address[]
  applications Application[]
  
  // Relaciones existentes (mantener)
  educations        Education[]
  workExperiences   WorkExperience[]
  resumes           Resume[]
}
```

#### 3.2 Agregar modelo Address
```prisma
model Address {
  id          Int       @id @default(autoincrement())
  candidateId Int      @map("candidate_id")
  street      String?   @db.VarChar(255)
  city        String?   @db.VarChar(100)
  state       String?   @db.VarChar(100)
  country     String?   @db.VarChar(100)
  zipCode     String?   @db.VarChar(20) @map("zip_code")
  addressType String    @default("home") @map("address_type") @db.VarChar(50)
  isPrimary   Boolean   @default(true) @map("is_primary")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")
  
  candidate   Candidate  @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  
  @@index([candidateId])
  @@index([candidateId, isPrimary])
}
```

#### 3.3 Migración de datos de address
```typescript
// scripts/migrateAddressData.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function migrateAddressData() {
  // Obtener todos los candidatos con address
  const candidatesWithAddress = await prisma.candidate.findMany({
    where: { address: { not: null } }
  })

  for (const candidate of candidatesWithAddress) {
    // Crear registro en Address
    await prisma.address.create({
      data: {
        candidateId: candidate.id,
        street: candidate.address, // Por ahora, todo en street
        isPrimary: true
      }
    })
  }

  console.log(`Migrated ${candidatesWithAddress.length} addresses`)
}
```

### Fase 4: Entidades de Posiciones (Día 3-4)

#### 4.1 Agregar modelos de Position
```prisma
model Position {
  id                  Int       @id @default(autoincrement())
  companyId           Int       @map("company_id")
  interviewFlowId     Int       @map("interview_flow_id")
  title               String    @db.VarChar(255)
  description         String?
  status              String    @default("active") @db.VarChar(50)
  isVisible           Boolean   @default(true) @map("is_visible")
  location            String?   @db.VarChar(255)
  jobDescription      String?   @map("job_description")
  salaryRangeId       Int?      @map("salary_range_id")
  employmentType      String?   @db.VarChar(50)
  companyDescription  String?   @map("company_description")
  applicationDeadline DateTime? @map("application_deadline") @db.Date
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  
  // Relaciones
  company         Company           @relation(fields: [companyId], references: [id], onDelete: Cascade)
  interviewFlow   InterviewFlow     @relation(fields: [interviewFlowId], references: [id], onDelete: Restrict)
  salaryRange     SalaryRange?      @relation(fields: [salaryRangeId], references: [id])
  applications    Application[]
  contacts        PositionContact[]
  benefits        PositionBenefit[]
  requirements    Requirement[]
  responsibilities Responsibility[]
  
  @@index([companyId])
  @@index([status])
  @@index([companyId, status])
  @@index([salaryRangeId, location])
}

model PositionContact {
  id               Int       @id @default(autoincrement())
  positionId       Int       @map("position_id")
  contactName      String?   @map("contact_name") @db.VarChar(255)
  contactEmail     String?   @map("contact_email") @db.VarChar(255)
  contactPhone     String?   @map("contact_phone") @db.VarChar(20)
  contactDepartment String?  @map("contact_department") @db.VarChar(100)
  isPrimary        Boolean   @default(true) @map("is_primary")
  createdAt        DateTime  @default(now()) @map("created_at")
  
  position         Position  @relation(fields: [positionId], references: [id], onDelete: Cascade)
  
  @@index([positionId])
  @@index([positionId, isPrimary])
}

model PositionBenefit {
  positionId Int    @map("position_id")
  benefitId  Int    @map("benefit_id")
  details    String?
  
  position   Position   @relation(fields: [positionId], references: [id], onDelete: Cascade)
  benefit    BenefitType @relation(fields: [benefitId], references: [id], onDelete: Cascade)
  
  @@id([positionId, benefitId])
  @@index([positionId])
  @@index([benefitId])
}
```

#### 4.2 Agregar modelos de Requirements y Responsibilities
```prisma
model Requirement {
  id               Int       @id @default(autoincrement())
  positionId       Int       @map("position_id")
  requirementType  String    @map("requirement_type") // skill, experience, education, certification, language
  description      String
  isMandatory      Boolean   @default(true) @map("is_mandatory")
  yearsExperience  Int?      @map("years_experience")
  proficiencyLevel String?   @map("proficiency_level") // basic, intermediate, advanced, expert
  createdAt        DateTime  @default(now()) @map("created_at")
  
  position         Position  @relation(fields: [positionId], references: [id], onDelete: Cascade)
  
  @@index([positionId])
  @@index([positionId, requirementType])
}

model Responsibility {
  id             Int       @id @default(autoincrement())
  positionId     Int       @map("position_id")
  description    String
  priorityLevel  String    @default("medium") @map("priority_level") // low, medium, high, critical
  percentageTime Int?      @map("percentage_time")
  createdAt      DateTime  @default(now()) @map("created_at")
  
  position       Position  @relation(fields: [positionId], references: [id], onDelete: Cascade)
  
  @@index([positionId])
  @@index([positionId, priorityLevel])
}
```

### Fase 5: Entidades de Aplicaciones y Entrevistas (Día 5)

#### 5.1 Agregar modelos de Application e Interview
```prisma
model Application {
  id              Int       @id @default(autoincrement())
  positionId      Int       @map("position_id")
  candidateId     Int       @map("candidate_id")
  applicationDate DateTime  @default(now()) @map("application_date") @db.Date
  status          String    @default("pending") @db.VarChar(50)
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // Relaciones
  position    Position    @relation(fields: [positionId], references: [id], onDelete: Cascade)
  candidate   Candidate   @relation(fields: [candidateId], references: [id], onDelete: Cascade)
  interviews  Interview[]
  
  @@unique([positionId, candidateId])
  @@index([positionId])
  @@index([candidateId])
  @@index([status])
  @@index([positionId, status])
  @@index([applicationDate, status])
}

model Interview {
  id              Int       @id @default(autoincrement())
  applicationId   Int       @map("application_id")
  interviewStepId Int       @map("interview_step_id")
  employeeId      Int       @map("employee_id")
  interviewDate   DateTime  @map("interview_date") @db.Date
  result          String?   @db.VarChar(50)
  score           Int?
  notes           String?
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  
  // Relaciones
  application     Application    @relation(fields: [applicationId], references: [id], onDelete: Cascade)
  interviewStep   InterviewStep  @relation(fields: [interviewStepId], references: [id], onDelete: Restrict)
  employee        Employee       @relation(fields: [employeeId], references: [id], onDelete: Restrict)
  
  @@index([applicationId])
  @@index([employeeId])
  @@index([interviewDate])
  @@index([employeeId, interviewDate])
  @@check([score], raw => "score >= 0 AND score <= 100")
}
```

#### 5.2 Completar modelo Employee y InterviewStep
```prisma
model Employee {
  id        Int       @id @default(autoincrement())
  companyId Int       @map("company_id")
  name      String    @db.VarChar(255)
  email     String    @unique @db.VarChar(255)
  role      String?   @db.VarChar(100)
  isActive  Boolean   @default(true) @map("is_active")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  
  // Relaciones
  company   Company   @relation(fields: [companyId], references: [id], onDelete: Cascade)
  interviews Interview[]
  
  @@index([companyId])
}

model InterviewStep {
  id               Int       @id @default(autoincrement())
  interviewFlowId  Int       @map("interview_flow_id")
  interviewTypeId  Int       @map("interview_type_id")
  name             String    @db.VarChar(255)
  orderIndex       Int       @map("order_index")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  
  // Relaciones
  interviewFlow    InterviewFlow  @relation(fields: [interviewFlowId], references: [id], onDelete: Cascade)
  interviewType    InterviewType  @relation(fields: [interviewTypeId], references: [id], onDelete: Restrict)
  interviews       Interview[]
  
  @@unique([interviewFlowId, orderIndex])
  @@index([interviewFlowId])
}
```

### Fase 6: Auditoría y Optimización (Día 6)

#### 6.1 Agregar modelo de Auditoría
```prisma
model AuditLog {
  id         Int       @id @default(autoincrement())
  tableName  String    @map("table_name") @db.VarChar(50)
  recordId   Int       @map("record_id")
  operation  String    // INSERT, UPDATE, DELETE
  oldValues  Json?
  newValues  Json?
  changedBy  String?   @map("changed_by") @db.VarChar(255)
  changedAt  DateTime  @default(now()) @map("changed_at")
  
  @@index([tableName, recordId])
  @@index([changedAt])
}
```

#### 6.2 Agregar índices de texto completo (PostgreSQL)
```typescript
// scripts/addFullTextIndexes.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addFullTextIndexes() {
  // Índices de texto completo para PostgreSQL
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "position_fulltext_idx" 
    ON "Position" USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '') || ' ' || COALESCE(job_description, '')))
  `
  
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "candidate_fulltext_idx" 
    ON "Candidate" USING gin(to_tsvector('english', firstName || ' ' || lastName || ' ' || email))
  `
  
  await prisma.$executeRaw`
    CREATE INDEX IF NOT EXISTS "requirement_fulltext_idx" 
    ON "Requirement" USING gin(to_tsvector('english', description))
  `
}
```

## 4. Scripts de Migración

### 4.1 Script de Validación
```typescript
// scripts/validateMigration.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function validateMigration() {
  // Validar datos migrados
  const candidates = await prisma.candidate.count()
  const addresses = await prisma.address.count()
  const companies = await prisma.company.count()
  const positions = await prisma.position.count()
  
  console.log('Migration Validation:')
  console.log(`Candidates: ${candidates}`)
  console.log(`Addresses: ${addresses}`)
  console.log(`Companies: ${companies}`)
  console.log(`Positions: ${positions}`)
  
  // Validar que cada candidato con address tenga un registro en Address
  const candidatesWithoutAddress = await prisma.candidate.findMany({
    where: {
      addresses: {
        none: {}
      }
    }
  })
  
  if (candidatesWithoutAddress.length > 0) {
    console.warn(`Warning: ${candidatesWithoutAddress.length} candidates without addresses`)
  }
}
```

### 4.2 Script de Rollback
```typescript
// scripts/rollback.ts
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function rollback() {
  // Eliminar en orden inverso
  await prisma.auditLog.deleteMany()
  await prisma.interview.deleteMany()
  await prisma.application.deleteMany()
  await prisma.responsibility.deleteMany()
  await prisma.requirement.deleteMany()
  await prisma.positionBenefit.deleteMany()
  await prisma.positionContact.deleteMany()
  await prisma.position.deleteMany()
  await prisma.employee.deleteMany()
  await prisma.interviewStep.deleteMany()
  await prisma.benefitType.deleteMany()
  await prisma.salaryRange.deleteMany()
  await prisma.address.deleteMany()
  await prisma.interviewFlow.deleteMany()
  await prisma.interviewType.deleteMany()
  await prisma.company.deleteMany()
  
  console.log('Rollback completed')
}
```

## 5. Comandos de Ejecución

### 5.1 Secuencia de Migración
```bash
# Fase 1: Preparación
cp schema.prisma schema_original.prisma
pg_dump -h localhost -U postgres -d hr_recruitment > backup_$(date +%Y%m%d).sql

# Fase 2: Entidades base
npx prisma migrate dev --name add_base_entities
npx prisma db seed

# Fase 3: Candidate y Address
npx prisma migrate dev --name update_candidate_add_address
npx tsx scripts/migrateAddressData.ts

# Fase 4: Posiciones
npx prisma migrate dev --name add_position_entities
npx tsx scripts/seedPositions.ts

# Fase 5: Aplicaciones y Entrevistas
npx prisma migrate dev --name add_application_interview_entities

# Fase 6: Auditoría y optimización
npx prisma migrate dev --name add_audit_and_indexes
npx tsx scripts/addFullTextIndexes.ts

# Validación final
npx tsx scripts/validateMigration.ts
```

### 5.2 Comandos de Monitoreo
```bash
# Verificar estado de migraciones
npx prisma migrate status

# Generar cliente actualizado
npx prisma generate

# Verificar schema
npx prisma db pull
npx prisma validate
```

## 6. Consideraciones de Producción

### 6.1 Tiempos Estimados
- **Fase 1:** 2 horas (preparación)
- **Fase 2:** 4 horas (entidades base + seed)
- **Fase 3:** 6 horas (migración de datos)
- **Fase 4:** 8 horas (posiciones + relaciones)
- **Fase 5:** 6 horas (aplicaciones + entrevistas)
- **Fase 6:** 4 horas (auditoría + índices)

**Total:** ~30 horas distribuidas en 6 días

### 6.2 Puntos de Control
- Backup antes de cada fase
- Validación después de cada migración
- Pruebas en entorno staging
- Documentación de cambios

### 6.3 Riesgos y Mitigación
- **Pérdida de datos:** Backups automáticos
- **Downtime:** Migración por fases
- **Rendimiento:** Monitoreo constante
- **Rollback:** Scripts preparados

## 7. Post-Migración

### 7.1 Tareas de Limpieza
```sql
-- Eliminar campo address original de Candidate (después de validación)
ALTER TABLE "Candidate" DROP COLUMN "address";

-- Actualizar estadísticas de la base de datos
ANALYZE;

-- Rebuild índices si es necesario
REINDEX DATABASE hr_recruitment;
```

### 7.2 Monitoreo Continuo
```typescript
// scripts/postMigrationHealthCheck.ts
async function healthCheck() {
  // Verificar performance de consultas críticas
  // Validar integridad de datos
  // Verificar espacio en disco
  // Monitorear conexiones
}
```

Este plan asegura una migración segura, estructurada y reversible utilizando las mejores prácticas de Prisma Migrate.
