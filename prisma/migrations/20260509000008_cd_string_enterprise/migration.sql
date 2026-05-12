-- ════════════════════════════════════════════════════════════════════════
-- Migration: cd_string_enterprise
-- Converte campo cd de INTEGER (SERIAL) para VARCHAR com código completo
-- Cria tabela sequences e função next_cd() para geração atómica de códigos
-- ════════════════════════════════════════════════════════════════════════

-- ── PASSO 1 — Tabela de sequências ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS sequences (
  name    VARCHAR(50) PRIMARY KEY,
  current INTEGER NOT NULL DEFAULT 0
);

INSERT INTO sequences (name, current) VALUES
  ('users',              0),
  ('companies',          0),
  ('products',           0),
  ('price_proposals',    0),
  ('taxes',              0),
  ('orders',             0),
  ('order_lines',        0),
  ('shipments',          0),
  ('customs_dispatches', 0),
  ('audit_logs',         0)
ON CONFLICT (name) DO NOTHING;

-- ── PASSO 2 — Função next_cd() ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION next_cd(
  seq_name VARCHAR,
  prefix   VARCHAR,
  digits   INT DEFAULT 4
)
RETURNS VARCHAR AS $$
DECLARE
  next_val INTEGER;
BEGIN
  UPDATE sequences
    SET current = current + 1
  WHERE name = seq_name
  RETURNING current INTO next_val;

  IF next_val IS NULL THEN
    RAISE EXCEPTION 'Sequência "%" não encontrada na tabela sequences', seq_name;
  END IF;

  RETURN prefix || LPAD(next_val::TEXT, digits, '0');
END;
$$ LANGUAGE plpgsql;

-- ── PASSO 3 — USERS: converter INTEGER → VARCHAR + popular com USR- ─────
ALTER TABLE "users" DROP COLUMN "cd";
ALTER TABLE "users" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "users" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "users"
      SET cd = 'USR-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'users';
END $$;

ALTER TABLE "users" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "users_cd_key" ON "users"("cd");

-- ── PASSO 4 — COMPANIES ───────────────────────────────────────────────────
ALTER TABLE "companies" DROP COLUMN "cd";
ALTER TABLE "companies" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "companies" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "companies"
      SET cd = 'EMP-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'companies';
END $$;

ALTER TABLE "companies" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "companies_cd_key" ON "companies"("cd");

-- ── PASSO 5 — PRODUCTS ────────────────────────────────────────────────────
ALTER TABLE "products" DROP COLUMN "cd";
ALTER TABLE "products" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "products" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "products"
      SET cd = 'PRD-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'products';
END $$;

ALTER TABLE "products" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "products_cd_key" ON "products"("cd");

-- ── PASSO 6 — PRICE_PROPOSALS ─────────────────────────────────────────────
ALTER TABLE "price_proposals" DROP COLUMN "cd";
ALTER TABLE "price_proposals" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "price_proposals" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "price_proposals"
      SET cd = 'PP-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'price_proposals';
END $$;

ALTER TABLE "price_proposals" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "price_proposals_cd_key" ON "price_proposals"("cd");

-- ── PASSO 7 — TAXES ───────────────────────────────────────────────────────
ALTER TABLE "taxes" DROP COLUMN "cd";
ALTER TABLE "taxes" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "taxes" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "taxes"
      SET cd = 'TAX-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'taxes';
END $$;

ALTER TABLE "taxes" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "taxes_cd_key" ON "taxes"("cd");

-- ── PASSO 8 — ORDERS ──────────────────────────────────────────────────────
ALTER TABLE "orders" DROP COLUMN "cd";
ALTER TABLE "orders" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "orders" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "orders"
      SET cd = 'ORD-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'orders';
END $$;

ALTER TABLE "orders" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "orders_cd_key" ON "orders"("cd");

-- ── PASSO 9 — ORDER_LINES ─────────────────────────────────────────────────
ALTER TABLE "order_lines" DROP COLUMN "cd";
ALTER TABLE "order_lines" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "order_lines" ORDER BY id LOOP
    counter := counter + 1;
    UPDATE "order_lines"
      SET cd = 'OL-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'order_lines';
END $$;

ALTER TABLE "order_lines" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "order_lines_cd_key" ON "order_lines"("cd");

-- ── PASSO 10 — SHIPMENTS ──────────────────────────────────────────────────
ALTER TABLE "shipments" DROP COLUMN "cd";
ALTER TABLE "shipments" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "shipments" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "shipments"
      SET cd = 'SHP-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'shipments';
END $$;

ALTER TABLE "shipments" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "shipments_cd_key" ON "shipments"("cd");

-- ── PASSO 11 — CUSTOMS_DISPATCHES ─────────────────────────────────────────
ALTER TABLE "customs_dispatches" DROP COLUMN "cd";
ALTER TABLE "customs_dispatches" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "customs_dispatches" ORDER BY id LOOP
    counter := counter + 1;
    UPDATE "customs_dispatches"
      SET cd = 'DSP-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'customs_dispatches';
END $$;

ALTER TABLE "customs_dispatches" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "customs_dispatches_cd_key" ON "customs_dispatches"("cd");

-- ── PASSO 12 — AUDIT_LOGS ─────────────────────────────────────────────────
ALTER TABLE "audit_logs" DROP COLUMN "cd";
ALTER TABLE "audit_logs" ADD COLUMN "cd" VARCHAR(20);

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "audit_logs" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "audit_logs"
      SET cd = 'LOG-' || LPAD(counter::TEXT, 4, '0')
    WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'audit_logs';
END $$;

ALTER TABLE "audit_logs" ALTER COLUMN "cd" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "audit_logs_cd_key" ON "audit_logs"("cd");

-- ── VERIFICAÇÃO ───────────────────────────────────────────────────────────
-- Confirmar estado das sequências após migration:
-- SELECT name, current FROM sequences ORDER BY name;
--
-- Confirmar exemplos de cd por tabela:
-- SELECT cd FROM users LIMIT 3;
-- SELECT cd FROM companies LIMIT 3;
-- SELECT cd FROM orders LIMIT 3;
