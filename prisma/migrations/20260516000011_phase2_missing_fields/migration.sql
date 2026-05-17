-- FASE 2 — Campos em falta nos modelos (MASTER-BUSINESS-RULES.md §14)

-- 2.1 User.phone (MOD 7.1)
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- 2.2 Company.companyType — enum novo (MOD 7.2)
DO $$ BEGIN
  CREATE TYPE "CompanyType" AS ENUM (
    'importer', 'exporter', 'mixed', 'producer', 'logistics'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "companyType" "CompanyType";

-- 2.3 Company.documentationValidation — resultado estruturado da validação STAFF (MOD 7.2)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "documentationValidation" JSONB;

-- 2.4 Company.verifiedByState — flag de aprovação STATE (MOD 7.2)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS "verifiedByState" BOOLEAN NOT NULL DEFAULT FALSE;

-- 2.5 Product.metadata — especificações técnicas adicionais (MOD 7.3)
ALTER TABLE products ADD COLUMN IF NOT EXISTS metadata JSONB;
