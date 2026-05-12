# Corredor do Lobito — Campo `cd` Enterprise
> **Decisão de Arquitectura:** O código é gerado e armazenado com prefixo directamente na base de dados.  
> Exemplo: `"cd": "ORD-0001"` — não um inteiro, não calculado no frontend.

---

## 1. Por que o prefixo deve estar na base de dados

### Abordagem anterior (errada para enterprise)

```
DB guarda:     cd = 1
API devolve:   "cd": 1
Frontend faz:  "ORD-" + "0001" = "ORD-0001"
```

**Problema:** O código real (`ORD-0001`) só existe no frontend. Se o backend, um relatório, um email, uma integração externa ou o audit log referenciarem este pedido, cada sistema tem de saber que `1` significa `ORD-0001`. Há risco de inconsistência.

---

### Abordagem enterprise (correcta)

```
DB guarda:     cd = "ORD-0001"
API devolve:   "cd": "ORD-0001"
Frontend:      {{ order.cd }}    ← sem formatação
Audit log:     "entityCode": "ORD-0001"
Email:         "O seu pedido ORD-0001 foi aprovado."
Relatório:     Pedido ORD-0001 | $513.00 | Pago
```

**`ORD-0001` é a identidade do pedido em todo o ecossistema — base de dados, API, UI, documentos, emails, relatórios.**

---

## 2. Prefixo por Tabela — Definição Oficial

| Tabela | Prefixo | Exemplo | Semântica |
|--------|---------|---------|-----------|
| `users` | `USR-` | `USR-0001` | Utilizador do sistema |
| `companies` | `EMP-` | `EMP-0001` | Empresa (do port. Empresa) |
| `products` | `PRD-` | `PRD-0001` | Produto do catálogo |
| `price_proposals` | `PP-` | `PP-0001` | Price Proposal |
| `taxes` | `TAX-` | `TAX-0001` | Regra fiscal |
| `orders` | `ORD-` | `ORD-0001` | Pedido de compra |
| `order_lines` | `OL-` | `OL-0001` | Linha de pedido |
| `shipments` | `SHP-` | `SHP-0001` | Embarque logístico |
| `customs_dispatches` | `DSP-` | `DSP-0001` | Despacho aduaneiro |
| `audit_logs` | `LOG-` | `LOG-0001` | Registo de auditoria |

**Formato:** `[PREFIXO][4 dígitos com zero à esquerda]`  
Ex: `ORD-0001`, `ORD-0042`, `ORD-1000`

---

## 3. Arquitectura da Solução

### 3.1 Tabela de Sequências (PostgreSQL)

Uma tabela central controla o contador de cada entidade:

```sql
CREATE TABLE sequences (
  name    VARCHAR(50) PRIMARY KEY,
  current INTEGER     NOT NULL DEFAULT 0
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
  ('audit_logs',         0);
```

### 3.2 Função PostgreSQL — `next_cd()`

Função atómica que incrementa o contador e devolve o código formatado:

```sql
CREATE OR REPLACE FUNCTION next_cd(
  seq_name VARCHAR,
  prefix   VARCHAR,
  digits   INT DEFAULT 4
)
RETURNS VARCHAR AS $$
DECLARE
  next_val INTEGER;
BEGIN
  -- Incremento atómico — seguro em concorrência
  UPDATE sequences
    SET current = current + 1
  WHERE name = seq_name
  RETURNING current INTO next_val;

  IF next_val IS NULL THEN
    RAISE EXCEPTION 'Sequência "%" não existe na tabela sequences', seq_name;
  END IF;

  RETURN prefix || LPAD(next_val::TEXT, digits, '0');
END;
$$ LANGUAGE plpgsql;
```

**Teste da função:**
```sql
SELECT next_cd('orders', 'ORD-');         -- → 'ORD-0001'
SELECT next_cd('orders', 'ORD-');         -- → 'ORD-0002'
SELECT next_cd('companies', 'EMP-');      -- → 'EMP-0001'
SELECT next_cd('audit_logs', 'LOG-');     -- → 'LOG-0001'
```

### 3.3 Campo `cd` como VARCHAR no Schema

```prisma
// Antes (inteiro)
cd Int @default(autoincrement()) @unique

// Depois (string com código completo)
cd String @unique  // ex: "ORD-0001"
```

---

## 4. SQL Completo da Migration

Aplicar no Supabase SQL Editor **na ordem exacta**:

```sql
-- ════════════════════════════════════════════════════════════
-- PASSO 1 — Criar tabela de sequências
-- ════════════════════════════════════════════════════════════
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

-- ════════════════════════════════════════════════════════════
-- PASSO 2 — Criar função next_cd()
-- ════════════════════════════════════════════════════════════
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
    RAISE EXCEPTION 'Sequência "%" não encontrada', seq_name;
  END IF;

  RETURN prefix || LPAD(next_val::TEXT, digits, '0');
END;
$$ LANGUAGE plpgsql;

-- ════════════════════════════════════════════════════════════
-- PASSO 3 — Alterar campo cd de INTEGER para VARCHAR
--           e actualizar dados existentes com o código correcto
-- ════════════════════════════════════════════════════════════

-- USERS: converter cd INTEGER → VARCHAR com prefixo USR-
ALTER TABLE "users" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "users" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "users" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "users" SET cd = 'USR-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'users';
END $$;

ALTER TABLE "users" ALTER COLUMN "cd" SET NOT NULL;

-- COMPANIES
ALTER TABLE "companies" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "companies" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "companies" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "companies" SET cd = 'EMP-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'companies';
END $$;

ALTER TABLE "companies" ALTER COLUMN "cd" SET NOT NULL;

-- PRODUCTS
ALTER TABLE "products" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "products" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "products" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "products" SET cd = 'PRD-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'products';
END $$;

ALTER TABLE "products" ALTER COLUMN "cd" SET NOT NULL;

-- PRICE_PROPOSALS
ALTER TABLE "price_proposals" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "price_proposals" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "price_proposals" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "price_proposals" SET cd = 'PP-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'price_proposals';
END $$;

ALTER TABLE "price_proposals" ALTER COLUMN "cd" SET NOT NULL;

-- TAXES
ALTER TABLE "taxes" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "taxes" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "taxes" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "taxes" SET cd = 'TAX-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'taxes';
END $$;

ALTER TABLE "taxes" ALTER COLUMN "cd" SET NOT NULL;

-- ORDERS
ALTER TABLE "orders" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "orders" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "orders" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "orders" SET cd = 'ORD-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'orders';
END $$;

ALTER TABLE "orders" ALTER COLUMN "cd" SET NOT NULL;

-- ORDER_LINES
ALTER TABLE "order_lines" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "order_lines" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "order_lines" ORDER BY id LOOP
    counter := counter + 1;
    UPDATE "order_lines" SET cd = 'OL-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'order_lines';
END $$;

ALTER TABLE "order_lines" ALTER COLUMN "cd" SET NOT NULL;

-- SHIPMENTS
ALTER TABLE "shipments" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "shipments" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "shipments" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "shipments" SET cd = 'SHP-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'shipments';
END $$;

ALTER TABLE "shipments" ALTER COLUMN "cd" SET NOT NULL;

-- CUSTOMS_DISPATCHES
ALTER TABLE "customs_dispatches" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "customs_dispatches" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "customs_dispatches" ORDER BY id LOOP
    counter := counter + 1;
    UPDATE "customs_dispatches" SET cd = 'DSP-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'customs_dispatches';
END $$;

ALTER TABLE "customs_dispatches" ALTER COLUMN "cd" SET NOT NULL;

-- AUDIT_LOGS
ALTER TABLE "audit_logs" DROP COLUMN IF EXISTS "cd";
ALTER TABLE "audit_logs" ADD COLUMN "cd" VARCHAR(20) UNIQUE;

DO $$
DECLARE r RECORD; counter INT := 0;
BEGIN
  FOR r IN SELECT id FROM "audit_logs" ORDER BY "createdAt" LOOP
    counter := counter + 1;
    UPDATE "audit_logs" SET cd = 'LOG-' || LPAD(counter::TEXT, 4, '0') WHERE id = r.id;
  END LOOP;
  UPDATE sequences SET current = counter WHERE name = 'audit_logs';
END $$;

ALTER TABLE "audit_logs" ALTER COLUMN "cd" SET NOT NULL;

-- ════════════════════════════════════════════════════════════
-- VERIFICAÇÃO FINAL
-- ════════════════════════════════════════════════════════════
SELECT name, current FROM sequences ORDER BY name;
```

---

## 5. Alterações ao Schema Prisma

```prisma
// Antes
cd Int @default(autoincrement()) @unique

// Depois — em todos os 10 models
cd String @unique
```

Schema completo com a alteração:

```prisma
model User {
  id  String @id @default(uuid())
  cd  String @unique   // "USR-0001"
  // ...
}

model Company {
  id  String @id @default(uuid())
  cd  String @unique   // "EMP-0001"
  // ...
}

model Product {
  id  String @id @default(uuid())
  cd  String @unique   // "PRD-0001"
  // ...
}

model PriceProposal {
  id  String @id @default(uuid())
  cd  String @unique   // "PP-0001"
  // ...
}

model Tax {
  id  String @id @default(uuid())
  cd  String @unique   // "TAX-0001"
  // ...
}

model Order {
  id  String @id @default(uuid())
  cd  String @unique   // "ORD-0001"
  // ...
}

model OrderLine {
  id  String @id @default(uuid())
  cd  String @unique   // "OL-0001"
  // ...
}

model Shipment {
  id  String @id @default(uuid())
  cd  String @unique   // "SHP-0001"
  // ...
}

model CustomsDispatch {
  id  String @id @default(uuid())
  cd  String @unique   // "DSP-0001"
  // ...
}

model AuditLog {
  id  String @id @default(uuid())
  cd  String @unique   // "LOG-0001"
  // ...
}
```

---

## 6. Backend — CodeGeneratorService

Criar `src/common/services/code-generator.service.ts`:

```typescript
// src/common/services/code-generator.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export type EntitySequence =
  | 'users' | 'companies' | 'products' | 'price_proposals'
  | 'taxes' | 'orders' | 'order_lines' | 'shipments'
  | 'customs_dispatches' | 'audit_logs';

export const CD_PREFIX: Record<EntitySequence, string> = {
  users:              'USR-',
  companies:          'EMP-',
  products:           'PRD-',
  price_proposals:    'PP-',
  taxes:              'TAX-',
  orders:             'ORD-',
  order_lines:        'OL-',
  shipments:          'SHP-',
  customs_dispatches: 'DSP-',
  audit_logs:         'LOG-',
};

@Injectable()
export class CodeGeneratorService {
  constructor(private prisma: PrismaService) {}

  async generate(entity: EntitySequence): Promise<string> {
    const prefix = CD_PREFIX[entity];
    const result = await this.prisma.$queryRaw<[{ cd: string }]>`
      SELECT next_cd(${entity}::VARCHAR, ${prefix}::VARCHAR) AS cd
    `;
    return result[0].cd;
  }
}
```

Registar no `CommonModule` ou no `PrismaModule` como provider global:

```typescript
// src/common/common.module.ts
import { Global, Module } from '@nestjs/common';
import { CodeGeneratorService } from './services/code-generator.service';

@Global()
@Module({
  providers: [CodeGeneratorService],
  exports:   [CodeGeneratorService],
})
export class CommonModule {}
```

---

## 7. Backend — Usar o CodeGeneratorService nos Services

Cada service que cria entidades usa o `CodeGeneratorService` antes do insert:

### CompaniesService

```typescript
// companies.service.ts
@Injectable()
export class CompaniesService {
  constructor(
    private prisma:    PrismaService,
    private audit:     AuditService,
    private codeGen:   CodeGeneratorService,  // ← injectar
  ) {}

  async create(dto: CreateCompanyDto) {
    const cd = await this.codeGen.generate('companies'); // → "EMP-0001"

    return this.prisma.company.create({
      data: { ...dto, cd, licenseStatus: 'pending' },
    });
  }
}
```

### OrdersService

```typescript
async create(dto: CreateOrderDto, user: AuthUser) {
  const cd = await this.codeGen.generate('orders'); // → "ORD-0001"

  const order = await this.prisma.order.create({
    data: {
      cd,
      buyerId:   user.id,
      companyId: dto.companyId,
      status:    'draft',
      lines: {
        create: await Promise.all(dto.lines.map(async (l) => ({
          cd:              await this.codeGen.generate('order_lines'),
          productId:       l.productId,
          priceProposalId: l.priceProposalId,
          qty:             l.qty,
          unitPrice:       0,
        }))),
      },
    },
  });
  return order;
}
```

### AuditService — código automático nos logs

```typescript
async log(payload: AuditPayload) {
  const cd = await this.codeGen.generate('audit_logs'); // → "LOG-0001"

  await this.prisma.auditLog.create({
    data: {
      cd,
      userId:     payload.userId,
      role:       payload.role,
      action:     payload.action,
      entity:     payload.entity,
      entityId:   payload.entityId,
      beforeJson: payload.before ? JSON.stringify(payload.before) : null,
      afterJson:  payload.after  ? JSON.stringify(payload.after)  : null,
    },
  });
}
```

### ShipmentsService

```typescript
async create(dto: CreateShipmentDto, user: AuthUser) {
  const cd = await this.codeGen.generate('shipments'); // → "SHP-0001"

  return this.prisma.shipment.create({
    data: { cd, orderId: dto.orderId, operatorId: user.id, ... },
  });
}
```

O mesmo padrão aplica-se a **todos os services** que fazem `prisma.X.create()`.

---

## 8. Resposta da API — O que o Frontend recebe

Após a implementação, todas as respostas da API incluem `cd` como string completa:

```json
// GET /orders/ORD-0001  OU  GET /orders/:uuid
{
  "id":  "a522e4d3-38bf-4306-bca8-db03da0d6aa4",
  "cd":  "ORD-0001",
  "status": "paid",
  "totalAmount": "513.0000",
  ...
}

// GET /companies
[
  { "id": "...", "cd": "EMP-0001", "name": "Lobito Trade Lda", ... },
  { "id": "...", "cd": "EMP-0002", "name": "Zamco International", ... },
  { "id": "...", "cd": "EMP-0003", "name": "Congo Minerals SARL", ... }
]

// GET /shipments
[
  { "id": "...", "cd": "SHP-0001", "origin": "Porto do Lobito", "status": "customs_approved", ... }
]
```

---

## 9. Frontend — Simplificado (sem pipe/formatter)

Com o código armazenado na DB, o frontend **não precisa de formatar nada**:

```typescript
// Interface — cd é string, não number
export interface Order {
  id:  string;
  cd:  string;   // "ORD-0001" — já formatado
  status: OrderStatus;
  totalAmount: string | null;
  // ...
}
```

```html
<!-- Antes (com formatação no frontend) -->
{{ order.cd | formatCd:'ORD-' }}

<!-- Depois (directo — sem pipe) -->
{{ order.cd }}
```

```html
<!-- Título de detalhe -->
<h2>Pedido {{ order.cd }}</h2>
<!-- → "Pedido ORD-0001" -->

<!-- Tabela -->
<td>{{ company.cd }}</td>
<!-- → "EMP-0001" -->

<!-- Audit log -->
<td>{{ log.cd }}</td>
<!-- → "LOG-0040" -->
```

---

## 10. Consistência em Todo o Ecossistema

Com o código na base de dados, `ORD-0001` é o mesmo em todos os contextos:

```
Base de dados:   orders.cd = "ORD-0001"
API response:    { "cd": "ORD-0001" }
Frontend UI:     "Pedido ORD-0001"
Audit log:       action: PAY_ORDER, entity: order, entityId: "ORD-0001"
Email (futuro):  "O seu pedido ORD-0001 foi aprovado."
Relatório PDF:   Nº ORD-0001 | $513.00 | 09 Mai 2026
Suporte:         "Qual é o número?" → "ORD-0001"
```

---

## 11. Plano de Implementação

### Backend

| Passo | Acção |
|-------|-------|
| 1 | Aplicar SQL da secção 4 no Supabase (tabela sequences + função + migrar colunas) |
| 2 | Actualizar `prisma/schema.prisma` — `cd String @unique` em todos os 10 models |
| 3 | `npx prisma generate` |
| 4 | Criar `src/common/services/code-generator.service.ts` |
| 5 | Criar/actualizar `src/common/common.module.ts` como `@Global()` |
| 6 | Injectar `CodeGeneratorService` em todos os services que fazem `create()` |
| 7 | Adicionar `cd = await this.codeGen.generate('X')` antes de cada `prisma.X.create()` |
| 8 | `npx tsc --noEmit` — verificar zero erros |
| 9 | Correr testes E2E |

### Frontend

| Passo | Acção |
|-------|-------|
| 1 | Alterar `cd: number` → `cd: string` em todas as interfaces |
| 2 | Remover pipe `formatCd` e helper — já não são necessários |
| 3 | Substituir `{{ x.cd \| formatCd:'...' }}` por `{{ x.cd }}` em todos os templates |
| 4 | Verificar listas, títulos, detalhes e dialogs |

---

## 12. Vantagens desta Abordagem

| Aspecto | Benefício |
|---------|----------|
| **Consistência** | O código é o mesmo na DB, API, UI, logs, relatórios |
| **Pesquisabilidade** | `WHERE cd = 'ORD-0001'` funciona directamente na DB |
| **Auditabilidade** | Logs contêm `ORD-0001` — legível sem lookup |
| **Integrações** | Sistemas externos recebem o código já formatado |
| **Suporte** | Operador diz "ORD-0001" — verificável directamente na DB |
| **Documentos** | Facturas, guias, certificados mostram o mesmo código |
| **Simplicidade frontend** | `{{ order.cd }}` — sem formatação, sem pipes |
| **Atomicidade** | `next_cd()` é transaccional — seguro em concorrência |

---

*Corredor do Lobito — Campo cd Enterprise v2.0*  
*PostgreSQL sequences · CodeGeneratorService · String cd armazenado na DB*
