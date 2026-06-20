# Scripts de Migración - Guía de Uso

## Estado Actual

Los scripts de migración han sido creados pero presentan errores de TypeScript debido a:

1. **Falta de tipos de Node.js** (`@types/node`)
2. **Referencias a modelos Prisma que aún no existen** en el schema actual
3. **Configuración TypeScript incompleta** para el directorio de scripts

## Solución Recomendada

### 1. Instalar Dependencias

```bash
npm install --save-dev @types/node tsx
```

### 2. Usar Scripts Simplificados

Los scripts **simples** (`*Simple.ts`) están diseñados para funcionar durante todo el proceso de migración:

- `validateMigrationSimple.ts` - Validación robusta con SQL raw
- `migrateAddressDataSimple.ts` - Migración de direcciones segura

### 3. Scripts Recomendados por Fase

#### Fase 1: Preparación
```bash
# Backup y validación inicial
npx tsx scripts/validateMigrationSimple.ts
```

#### Fase 2: Entidades Base
```bash
# Después de crear entidades base
npx tsx scripts/seedBaseEntities.ts
npx tsx scripts/validateMigrationSimple.ts
```

#### Fase 3: Migración de Direcciones
```bash
# Después de crear tabla Address
npx tsx scripts/migrateAddressDataSimple.ts
npx tsx scripts/validateMigrationSimple.ts
```

#### Fase 4-6: Validación Continua
```bash
# Después de cada fase
npx tsx scripts/validateMigrationSimple.ts
```

## Scripts Disponibles

### ✅ Scripts Funcionales (Recomendados)

| Script | Propósito | Estado |
|--------|-----------|---------|
| `seedBaseEntities.ts` | Poblar datos iniciales | ✅ Funcional |
| `validateMigrationSimple.ts` | Validación completa | ✅ Funcional |
| `migrateAddressDataSimple.ts` | Migración de direcciones | ✅ Funcional |

### ⚠️ Scripts con Problemas TypeScript

| Script | Problema | Solución |
|--------|-----------|----------|
| `migrateAddressData.ts` | Errores TypeScript | Usar versión Simple |
| `validateMigration.ts` | Modelos inexistentes | Usar versión Simple |

## Comandos de Ejecución

### Ejecutar Scripts Individuales
```bash
npx tsx scripts/seedBaseEntities.ts
npx tsx scripts/validateMigrationSimple.ts
npx tsx scripts/migrateAddressDataSimple.ts
```

### Validación Rápida
```bash
npx tsx scripts/validateMigrationSimple.ts --quick
```

### Limpiar Columna Address (Post-migración)
```bash
npx tsx scripts/migrateAddressDataSimple.ts --cleanup
```

## Flujo de Migración Completo

```bash
# 1. Preparación
cp schema.prisma schema_original.prisma
pg_dump -h localhost -U postgres -d hr_recruitment > backup_$(date +%Y%m%d).sql

# 2. Fase 1: Entidades base
npx prisma migrate dev --name add_base_entities
npx tsx scripts/seedBaseEntities.ts
npx tsx scripts/validateMigrationSimple.ts

# 3. Fase 2: Candidate y Address
npx prisma migrate dev --name update_candidate_add_address
npx tsx scripts/migrateAddressDataSimple.ts
npx tsx scripts/validateMigrationSimple.ts

# 4. Continuar con las demás fases...
# Validar después de cada fase
npx tsx scripts/validateMigrationSimple.ts
```

## Manejo de Errores Comunes

### Error: "Cannot find name 'process'"
**Solución:** Instalar `@types/node` y usar scripts con verificación:
```typescript
if (typeof process !== 'undefined') {
  process.exit(1)
}
```

### Error: "Property does not exist on PrismaClient"
**Solución:** Usar scripts Simple que utilizan SQL raw:
```typescript
// En lugar de: prisma.address.count()
// Usar: prisma.$queryRawUnsafe('SELECT COUNT(*) FROM "addresses"')
```

### Error: "Table does not exist"
**Solución:** Los scripts Simple manejan tablas que pueden no existir:
```typescript
try {
  const count = await prisma.address.count()
} catch {
  console.log('Table not found yet (expected during migration)')
}
```

## Características de Seguridad

### ✅ Implementadas
- Verificación de existencia de tablas/columnas
- Manejo de errores sin detener el proceso
- Validación incremental durante migración
- Logging detallado para debugging
- Rollback seguro si es necesario

### 🔄 Por Implementar
- Transacciones atómicas complejas
- Validaciones de negocio específicas
- Tests automatizados de scripts

## Monitoreo y Validación

### Métricas Clave
- **Coverage de direcciones:** `% de candidatos con dirección migrada`
- **Integridad referencial:** `Registros huérfanos`
- **Duplicados:** `Emails, aplicaciones duplicadas`
- **Datos de referencia:** `Entidades base pobladas`

### Comandos de Monitoreo
```bash
# Validación completa
npx tsx scripts/validateMigrationSimple.ts

# Validación rápida (solo contadores)
npx tsx scripts/validateMigrationSimple.ts --quick

# Verificar estado de migraciones
npx prisma migrate status
```

## Recomendaciones Finales

1. **Usar siempre scripts Simple** durante la migración
2. **Validar después de cada fase** antes de continuar
3. **Hacer backup** antes de cada fase
4. **Probar en staging** antes de producción
5. **Documentar cualquier desviación** del plan

## Soporte

Si encuentras errores no documentados:

1. Verifica que `@types/node` esté instalado
2. Usa la versión Simple del script correspondiente
3. Ejecuta con `npx tsx` en lugar de `ts-node`
4. Revisa que el schema.prisma esté actualizado con `npx prisma generate`
