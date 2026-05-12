-- ════════════════════════════════════════════════════════════════════════════
-- Migration: phase2_transactions_reports_roles  —  Corredor do Lobito v2.0
-- Gerado com base no estado real da base de dados (2026-05-10)
--
-- O QUE JÁ EXISTE (não tocar):
--   Tabelas: users, companies, products, price_proposals, taxes,
--            orders, order_lines, shipments, customs_dispatches, audit_logs
--   Enums:   Role (state/staff/specialist/producer/buyer/operator/customs),
--            UserStatus, LicenseStatus, CompanyCountry, ProductStatus,
--            PriceProposalStatus, OrderStatus, ShipmentStatus, CustomsStatus
--   Sequences: users=7, companies=6, products=5, price_proposals=5,
--              taxes=7, orders=7, order_lines=8, shipments=3,
--              customs_dispatches=3, audit_logs=41
--
-- O QUE ESTE SCRIPT CRIA:
--   1. Valores novos no enum Role: admin, analyst, compliance, company
--   2. Enums novos: TransactionStatus, PaymentMethod, ReportStatus,
--                   ReportType, TargetAudience
--   3. Tabela: transactions (com constraints e índices)
--   4. Tabela: reports (com constraints e índices)
--   5. Sequências: transactions=0, reports=0
-- ════════════════════════════════════════════════════════════════════════════


-- ── 1. NOVOS VALORES NO ENUM Role ────────────────────────────────────────────

ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'admin';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'analyst';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'compliance';
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'company';


-- ── 2. NOVOS ENUMS ────────────────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "TransactionStatus" AS ENUM (
    'pending', 'completed', 'blocked', 'cancelled', 'refunded'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "PaymentMethod" AS ENUM (
    'bank_transfer', 'cash', 'credit_card', 'letter_of_credit', 'other'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportStatus" AS ENUM ('draft', 'submitted', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "ReportType" AS ENUM (
    'operational', 'fiscal', 'strategic', 'compliance'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE "TargetAudience" AS ENUM ('public', 'government', 'internal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ── 3. TABELA transactions ────────────────────────────────────────────────────
-- Convenção Prisma: TEXT (não UUID) · TIMESTAMP(3) (não TIMESTAMPTZ)
-- updatedAt sem DEFAULT — Prisma fornece sempre o valor no insert/update

CREATE TABLE "transactions" (
    "id"            TEXT                NOT NULL,
    "cd"            TEXT                NOT NULL,
    "orderId"       TEXT                NOT NULL,
    "amount"        DECIMAL(15,4)       NOT NULL,
    "currency"      TEXT                NOT NULL DEFAULT 'USD',
    "method"        "PaymentMethod"     NOT NULL DEFAULT 'bank_transfer',
    "status"        "TransactionStatus" NOT NULL DEFAULT 'completed',
    "paidAt"        TIMESTAMP(3),
    "blockedAt"     TIMESTAMP(3),
    "blockedById"   TEXT,
    "blockedReason" TEXT,
    "cancelledAt"   TIMESTAMP(3),
    "metadata"      JSONB,
    "createdAt"     TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3)        NOT NULL,

    CONSTRAINT "transactions_pkey"     PRIMARY KEY ("id"),
    CONSTRAINT "transactions_cd_key"   UNIQUE ("cd"),
    CONSTRAINT "transactions_orderId_key" UNIQUE ("orderId"),
    CONSTRAINT "transactions_orderId_fkey"
        FOREIGN KEY ("orderId") REFERENCES "orders"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "transactions_status_idx" ON "transactions"("status");


-- ── 4. TABELA reports ─────────────────────────────────────────────────────────

CREATE TABLE "reports" (
    "id"              TEXT             NOT NULL,
    "cd"              TEXT             NOT NULL,
    "title"           TEXT             NOT NULL,
    "type"            "ReportType"     NOT NULL,
    "authorId"        TEXT             NOT NULL,
    "period"          TEXT,
    "content"         JSONB,
    "status"          "ReportStatus"   NOT NULL DEFAULT 'draft',
    "rejectionReason" TEXT,
    "submittedAt"     TIMESTAMP(3),
    "publishedAt"     TIMESTAMP(3),
    "publishedById"   TEXT,
    "targetAudience"  "TargetAudience" NOT NULL DEFAULT 'internal',
    "createdAt"       TIMESTAMP(3)     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3)     NOT NULL,

    CONSTRAINT "reports_pkey"      PRIMARY KEY ("id"),
    CONSTRAINT "reports_cd_key"    UNIQUE ("cd"),
    CONSTRAINT "reports_authorId_fkey"
        FOREIGN KEY ("authorId") REFERENCES "users"("id")
        ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "reports_type_idx"   ON "reports"("type");
CREATE INDEX "reports_status_idx" ON "reports"("status");


-- ── 5. SEQUÊNCIAS ─────────────────────────────────────────────────────────────

INSERT INTO sequences (name, current) VALUES
  ('transactions', 0),
  ('reports',      0)
ON CONFLICT (name) DO NOTHING;


-- ── VERIFICAÇÃO (executar após para confirmar) ────────────────────────────────
-- SELECT unnest(enum_range(NULL::"Role"))::text AS role ORDER BY role;
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name;
-- SELECT name, current FROM sequences ORDER BY name;
