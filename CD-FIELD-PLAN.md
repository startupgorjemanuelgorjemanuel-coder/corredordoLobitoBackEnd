# Corredor do Lobito — Planeamento do Campo `cd` (Código de Identificação)

> **Autor da ideia:** Equipa de Negócio  
> **Contexto:** MVP Backend v1.0 — 10 tabelas  
> **Objectivo:** Adicionar a cada tabela um identificador sequencial inteiro (`cd`) para uso em negócio, UI e documentos — substituindo o UUID como referência visível.

---

## 1. O Problema com o UUID como Identificador Visível

O campo `id` actual de cada tabela é um UUID:
```
41bafc86-f90b-4fad-a8c3-3bc6cda15ded
```

Este formato:
- É impossível de memorizar ou comunicar oralmente
- Não tem sequência — não dá para saber se um pedido é o primeiro ou o milésimo
- Não é utilizável em documentos oficiais, facturas ou comunicações
- Dificulta o suporte ("qual é o pedido?" → "o 41bafc86-f90b...")

---

## 2. A Solução — Campo `cd`

Cada tabela recebe um campo `cd` (código) que é:
- **Inteiro auto-incremental** — gerado automaticamente pela base de dados
- **Único dentro da tabela** — não se repete
- **Independente por tabela** — cada tabela tem a sua própria sequência começando em 1
- **Nunca editável** — gerado uma vez na criação, nunca alterado
- **O identificador visível** — usado no UI, documentos e comunicações

O `id` (UUID) mantém-se como chave primária técnica para todas as relações entre tabelas. O `cd` é apenas para uso humano.

```
id  = 41bafc86-f90b-4fad-a8c3-3bc6cda15ded  ← usado internamente nas relações
cd  = 47                                      ← usado no UI, documentos, suporte
```

---

## 3. Regras do Campo `cd`

| Regra | Detalhe |
|-------|---------|
| Tipo | `INTEGER` — inteiro positivo |
| Geração | `autoincrement()` — automático na inserção |
| Sequência | Independente por tabela (orders começa em 1, companies começa em 1, etc.) |
| Unicidade | `UNIQUE` dentro da tabela |
| Editável | **Nunca** — gerado uma vez, imutável |
| Obrigatório | Sim — `NOT NULL` |
| Posição no schema | **Segunda coluna** — logo após `id` |
| Exposição na API | Sim — incluído em todas as respostas |
| Usado nas relações | **Não** — relações continuam a usar `id` (UUID) |

---

## 4. Formato de Display no Frontend

A base de dados guarda o número inteiro puro (`47`).  
O Frontend formata para display com prefixo por tabela:

| Tabela | Prefixo | Exemplo display |
|--------|---------|----------------|
| users | `USR-` | `USR-0047` |
| companies | `EMP-` | `EMP-0003` |
| products | `PRD-` | `PRD-0012` |
| price_proposals | `PP-` | `PP-0008` |
| taxes | `TAX-` | `TAX-0002` |
| orders | `ORD-` | `ORD-0001` ← **mais importante** |
| order_lines | `OL-` | `OL-0005` |
| shipments | `SHP-` | `SHP-0002` |
| customs_dispatches | `DSP-` | `DSP-0001` |
| audit_logs | `LOG-` | `LOG-0156` |

**Helper TypeScript no Frontend:**
```typescript
// src/utils/format-cd.ts
export function formatCd(prefix: string, cd: number): string {
  return `${prefix}${String(cd).padStart(4, '0')}`;
}

// Uso:
formatCd('ORD-', 47)   // → "ORD-0047"
formatCd('EMP-', 3)    // → "EMP-0003"
formatCd('SHP-', 128)  // → "SHP-0128"
```

---

## 5. Alterações ao Schema Prisma — Todas as Tabelas

O `cd` é adicionado como **segunda coluna** em cada model, logo após `id`:

```prisma
model User {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("users")
}

model Company {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("companies")
}

model Product {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("products")
}

model PriceProposal {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("price_proposals")
}

model Tax {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("taxes")
}

model Order {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("orders")
}

model OrderLine {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("order_lines")
}

model Shipment {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("shipments")
}

model CustomsDispatch {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos
  @@map("customs_dispatches")
}

model AuditLog {
  id  String @id @default(uuid())
  cd  Int    @default(autoincrement()) @unique  // ← NOVO
  // ... resto dos campos sem updatedAt (append-only)
  @@map("audit_logs")
}
```

---

## 6. SQL da Migration — Aplicar no Supabase

Executar este SQL no **Supabase SQL Editor** na ordem exacta:

```sql
-- ════════════════════════════════════════════════════════════
-- Migration: add_cd_field_all_tables
-- Adiciona campo cd (auto-incremento) a todas as tabelas
-- Executar uma vez — sequências independentes por tabela
-- ════════════════════════════════════════════════════════════

-- 1. USERS
ALTER TABLE "users"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "users_cd_key" ON "users"("cd");

-- 2. COMPANIES
ALTER TABLE "companies"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "companies_cd_key" ON "companies"("cd");

-- 3. PRODUCTS
ALTER TABLE "products"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "products_cd_key" ON "products"("cd");

-- 4. PRICE_PROPOSALS
ALTER TABLE "price_proposals"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "price_proposals_cd_key" ON "price_proposals"("cd");

-- 5. TAXES
ALTER TABLE "taxes"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "taxes_cd_key" ON "taxes"("cd");

-- 6. ORDERS
ALTER TABLE "orders"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "orders_cd_key" ON "orders"("cd");

-- 7. ORDER_LINES
ALTER TABLE "order_lines"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "order_lines_cd_key" ON "order_lines"("cd");

-- 8. SHIPMENTS
ALTER TABLE "shipments"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "shipments_cd_key" ON "shipments"("cd");

-- 9. CUSTOMS_DISPATCHES
ALTER TABLE "customs_dispatches"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "customs_dispatches_cd_key" ON "customs_dispatches"("cd");

-- 10. AUDIT_LOGS
ALTER TABLE "audit_logs"
  ADD COLUMN "cd" SERIAL NOT NULL;
CREATE UNIQUE INDEX "audit_logs_cd_key" ON "audit_logs"("cd");
```

> **Nota sobre `SERIAL`:**  
> `SERIAL` é equivalente a `INTEGER DEFAULT nextval(...)` no PostgreSQL.  
> Cria automaticamente uma sequência própria para cada tabela.  
> Os registos existentes no seed recebem valores 1, 2, 3... na ordem de inserção.

---

## 7. Impacto no Backend — O que muda

### 7.1 Schema Prisma
Adicionar `cd Int @default(autoincrement()) @unique` em todos os 10 models.

### 7.2 Respostas da API
O campo `cd` passa a ser incluído automaticamente em todas as respostas do Prisma — **sem alterar nenhum service ou controller**.

Exemplo de resposta do `GET /orders/:id` após a migration:
```json
{
  "id":  "a522e4d3-38bf-4306-bca8-db03da0d6aa4",
  "cd":  1,
  "buyerId":   "6bbea384-7d77-4863-b6e0-c2015eab5964",
  "companyId": "216ef368-e628-497b-8322-d44d68d1a6ae",
  "status":    "paid",
  "totalAmount": "513.0000",
  ...
}
```

### 7.3 Relações entre tabelas
**Nada muda.** As relações continuam a usar `id` (UUID). O `cd` é apenas para consumo externo.

### 7.4 Pesquisa por `cd`
Se for necessário buscar por `cd` (ex: suporte técnico pesquisa pedido nº 47):

```typescript
// orders.service.ts — exemplo de busca por cd
async findByCd(cd: number) {
  const order = await this.prisma.order.findUnique({ where: { cd } });
  if (!order) throw new NotFoundException(`Pedido ORD-${cd} não encontrado`);
  return order;
}
```

```typescript
// GET /orders/by-cd/:cd  [state, staff]
@Get('by-cd/:cd')
findByCd(@Param('cd', ParseIntPipe) cd: number) {
  return this.ordersService.findByCd(cd);
}
```

---

## 8. Impacto no Frontend — O que muda

### 8.1 Exibição nas tabelas (listas)

Antes:
```
| ID                                   | Estado  |
| 41bafc86-f90b-4fad-a8c3-3bc6cda15ded | Pago    |
```

Depois:
```
| Nº    | Estado  |
| ORD-0001 | Pago |
```

### 8.2 Exibição nos detalhes

Antes:
```
Pedido #41bafc86-f90b-4fad-a8c3-3bc6cda15ded
```

Depois:
```
Pedido ORD-0001
```

### 8.3 Tipo actualizado no TypeScript

```typescript
// src/types/index.ts — adicionar cd a todas as interfaces

export interface Company {
  id:  string;   // UUID — usado internamente
  cd:  number;   // Código — usado no UI
  // ...
}

export interface Order {
  id:  string;
  cd:  number;   // → formatCd('ORD-', order.cd) → "ORD-0001"
  // ...
}

export interface Product {
  id:  string;
  cd:  number;   // → formatCd('PRD-', product.cd) → "PRD-0012"
  // ...
}

export interface Shipment {
  id:  string;
  cd:  number;   // → formatCd('SHP-', shipment.cd) → "SHP-0002"
  // ...
}

// ... mesmo padrão para todas as interfaces
```

### 8.4 Nas colunas da mat-table

```html
<!-- Antes -->
<ng-container matColumnDef="id">
  <th mat-header-cell *matHeaderCellDef>ID</th>
  <td mat-cell *matCellDef="let row">{{ row.id }}</td>
</ng-container>

<!-- Depois -->
<ng-container matColumnDef="cd">
  <th mat-header-cell *matHeaderCellDef>Nº</th>
  <td mat-cell *matCellDef="let row">{{ formatCd('ORD-', row.cd) }}</td>
</ng-container>
```

---

## 9. Exemplo Completo — Antes vs Depois

### Order na UI

**Antes (com UUID):**
```
┌──────────────────────────────────────┬──────────┬─────────┐
│  ID                                  │  Total   │ Estado  │
├──────────────────────────────────────┼──────────┼─────────┤
│  a522e4d3-38bf-4306-bca8...          │ $513.00  │ [Pago]  │
│  d0d25b49-71c0-4505-acfc...          │ —        │ [Rascun]│
└──────────────────────────────────────┴──────────┴─────────┘
```

**Depois (com cd):**
```
┌─────────┬──────────┬─────────┐
│  Nº     │  Total   │ Estado  │
├─────────┼──────────┼─────────┤
│ ORD-0001│ $513.00  │ [Pago]  │
│ ORD-0002│ —        │ [Rascun]│
└─────────┴──────────┴─────────┘
```

### Detalhe de Embarque

**Antes:**
```
Embarque #03a22421-8495-417d-9e3c-9e39e32b11aa
Porto do Lobito → Lusaka
```

**Depois:**
```
Embarque SHP-0001
Porto do Lobito → Lusaka
```

---

## 10. Plano de Implementação

### Passo 1 — SQL no Supabase
Executar o SQL da secção 6 no Supabase SQL Editor.  
Os registos existentes do seed recebem `cd` automaticamente (1, 2, 3...).

### Passo 2 — Schema Prisma
Adicionar `cd Int @default(autoincrement()) @unique` a todos os 10 models.

### Passo 3 — Regenerar cliente Prisma
```bash
npx prisma generate
```

### Passo 4 — Actualizar baseline
```bash
cp prisma/schema.prisma prisma/baseline.prisma
```

### Passo 5 — Backend (sem alterações nos services)
O `cd` aparece automaticamente nas respostas. Apenas adicionar endpoint `by-cd/:cd` se necessário.

### Passo 6 — Frontend
- Adicionar `cd: number` a todas as interfaces TypeScript
- Criar helper `formatCd(prefix, cd)`
- Substituir exibição de `id` por `formatCd(prefix, cd)` em todas as listas e detalhes

---

## 11. Resumo das 10 Tabelas

| Tabela | Campo cd | Sequência | Prefixo UI |
|--------|---------|-----------|-----------|
| `users` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `USR-` |
| `companies` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `EMP-` |
| `products` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `PRD-` |
| `price_proposals` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `PP-` |
| `taxes` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `TAX-` |
| `orders` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `ORD-` |
| `order_lines` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `OL-` |
| `shipments` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `SHP-` |
| `customs_dispatches` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `DSP-` |
| `audit_logs` | `cd INT SERIAL UNIQUE` | 1, 2, 3... | `LOG-` |

**Total: 10 tabelas · 10 migrações SQL · 1 campo por tabela**

---

## 12. Notas Importantes

1. **O `id` UUID não desaparece** — continua a ser a chave primária e a ser usado em todas as relações. Apenas deixa de ser exibido ao utilizador.

2. **O `cd` não é editável** — nenhum endpoint de UPDATE deve incluir `cd` no DTO. O Prisma ignora tentativas de alterar campos `autoincrement()`.

3. **Gaps são normais** — se um registo for apagado, o `cd` não é reutilizado. Ex: EMP-0001, EMP-0002, EMP-0004 (EMP-0003 foi apagado). No MVP não há deleção, por isso não é um problema.

4. **Sequências são por tabela** — a empresa nº 5 (`EMP-0005`) e o pedido nº 5 (`ORD-0005`) são entidades diferentes. O `cd = 5` tem significado apenas dentro da mesma tabela.

5. **Registos existentes do seed** — após executar o SQL, os 7 utilizadores recebem `cd` 1 a 7, as 7 regras fiscais recebem `cd` 1 a 7, etc.

---

*Corredor do Lobito — Planeamento Campo cd v1.0*  
*10 tabelas · campo cd INTEGER SERIAL UNIQUE · autoincrement por tabela*
