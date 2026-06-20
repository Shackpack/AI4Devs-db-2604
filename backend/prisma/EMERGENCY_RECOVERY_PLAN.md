# 🚨 EMERGENCY RECOVERY PLAN - DATA LOSS INCIDENT

## INCIDENT SUMMARY
- **Time:** 2026-06-20 14:48 UTC+02:00
- **Issue:** Complete data loss during migration
- **Cause:** `prisma migrate dev` applied full optimized schema, then `prisma migrate reset` deleted all data
- **Impact:** ALL DATABASE DATA PERMANENTLY LOST

## ROOT CAUSE ANALYSIS
1. **Schema approach:** Used full replacement instead of incremental migration
2. **Backup missing:** No SQL backup created before migration
3. **Tool misuse:** `migrate dev` not suitable for massive schema changes
4. **Validation missing:** Did not preview migration impact

## IMMEDIATE ACTIONS REQUIRED

### STEP 1: Restore Working Environment
- [x] Clean migrations directory
- [x] Reset database to clean state
- [ ] Restore original schema structure
- [ ] Verify basic functionality

### STEP 2: Create Safe Migration Strategy
- [ ] Use `db push` for individual table creation
- [ ] Create data seeding scripts
- [ ] Implement incremental migrations
- [ ] Add validation checkpoints

### STEP 3: Data Recovery (If Possible)
- [ ] Check if any backups exist elsewhere
- [ ] Contact database administrator for backups
- [ ] Review application logs for data traces
- [ ] Document data loss for stakeholders

## SAFE MIGRATION APPROACH

### Phase 1: Base Tables (No Dependencies)
```sql
-- Create tables one by one using db push
CREATE TABLE companies (...);
CREATE TABLE interview_types (...);
CREATE TABLE interview_flows (...);
CREATE TABLE salary_ranges (...);
CREATE TABLE benefit_types (...);
```

### Phase 2: Seed Base Data
```typescript
// Use seed scripts to populate reference data
npx tsx scripts/seedBaseEntities.ts
```

### Phase 3: Add Dependent Tables
```sql
-- Create tables with foreign keys
CREATE TABLE employees (...);
CREATE TABLE positions (...);
```

### Phase 4: Migrate Existing Data
```typescript
-- Carefully migrate data from old structure
npx tsx scripts/migrateExistingData.ts
```

## PREVENTION MEASURES

### Before Next Migration:
1. **ALWAYS create SQL backup:**
   ```bash
   pg_dump -h host -U user -d database > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **Preview migrations:**
   ```bash
   npx prisma migrate diff --from-schema-datasource postgresql://... --to-schema-datamodel schema.prisma
   ```

3. **Use db push for development:**
   ```bash
   npx prisma db push  # Safer for incremental changes
   ```

4. **Test on staging first**

### Migration Safety Checklist:
- [ ] SQL backup created
- [ ] Migration preview reviewed
- [ ] Impact analysis completed
- [ ] Rollback plan ready
- [ ] Stakeholder approval obtained

## CURRENT STATUS
- **Database:** Empty, clean state
- **Schema:** Original 4-table structure
- **Data:** ALL LOST
- **Next Action:** Restore original schema and implement safe migration

## LESSONS LEARNED
1. Never use `migrate dev` for massive schema changes
2. Always create SQL backup before any migration
3. Use incremental approach with validation
4. Test migrations on non-production environment
5. Have rollback procedures ready

## CONTACTS TO NOTIFY
- Database Administrator
- Project Stakeholders
- Development Team
- Management (data loss incident)
