-- Migration: add_cd_all_tables
-- Adiciona campo cd (SERIAL auto-incremento, UNIQUE) a todas as tabelas
-- O campo id (UUID) mantém-se como chave primária para todas as relações

-- AlterTable
ALTER TABLE "users" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "companies" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "products" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "price_proposals" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "taxes" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "order_lines" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "shipments" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "customs_dispatches" ADD COLUMN "cd" SERIAL NOT NULL;

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN "cd" SERIAL NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "users_cd_key" ON "users"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cd_key" ON "companies"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "products_cd_key" ON "products"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "price_proposals_cd_key" ON "price_proposals"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "taxes_cd_key" ON "taxes"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "orders_cd_key" ON "orders"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "order_lines_cd_key" ON "order_lines"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_cd_key" ON "shipments"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "customs_dispatches_cd_key" ON "customs_dispatches"("cd");

-- CreateIndex
CREATE UNIQUE INDEX "audit_logs_cd_key" ON "audit_logs"("cd");
