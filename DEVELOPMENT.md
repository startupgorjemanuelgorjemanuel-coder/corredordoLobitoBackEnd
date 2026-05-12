# Corredor do Lobito API — Documentação de Desenvolvimento

> **Versão:** 1.0 MVP  
> **Stack:** NestJS 11 · TypeScript · PostgreSQL (Supabase) · Prisma 6 · JWT · Swagger/OpenAPI  
> **Build:** Zero erros TypeScript · 55 ficheiros fonte · 37 endpoints  
> **Swagger:** `http://localhost:3000/docs`  
> **Testes E2E:** 58/58 verificações passadas

---

## Índice

1. [Stack e Decisões Técnicas](#1-stack-e-decisões-técnicas)
2. [Estrutura de Pastas](#2-estrutura-de-pastas)
3. [Base de Dados — Schema Completo](#3-base-de-dados--schema-completo)
4. [Migrations](#4-migrations)
5. [Autenticação e RBAC](#5-autenticação-e-rbac)
6. [Módulos e Endpoints](#6-módulos-e-endpoints)
7. [Regras de Negócio Críticas](#7-regras-de-negócio-críticas)
8. [Dados de Desenvolvimento (Seed)](#8-dados-de-desenvolvimento-seed)
9. [Como Correr o Projecto](#9-como-correr-o-projecto)
10. [Como Gerar Migrations](#10-como-gerar-migrations)

---

## 1. Stack e Decisões Técnicas

### Stack Principal

| Tecnologia | Versão | Motivo |
|-----------|--------|--------|
| NestJS | 11 | Framework estruturado com DI, guards, decorators |
| TypeScript | 5.7 | Type safety em todo o projecto |
| Prisma ORM | **6.19.3** | Geração de tipos, migrations, query builder |
| PostgreSQL | — | Base de dados via Supabase |
| JWT (passport-jwt) | — | Autenticação stateless |
| bcrypt | 6 | Hash de passwords |
| class-validator | 0.15 | Validação de DTOs |
| @nestjs/swagger | 11 | Documentação OpenAPI 3.0 interactiva |

### Decisões Tomadas

#### Prisma 6 em vez de Prisma 7
O `prisma init` instalou Prisma 7.8.0 por omissão. Prisma 7 quebrou retrocompatibilidade:
- Removeu `url = env("DATABASE_URL")` do schema (passou para `prisma.config.ts`)
- O `PrismaClient` deixou de aceitar `datasourceUrl` no construtor
- Requer Driver Adapters para conexão directa (incompatível com o padrão NestJS)

**Decisão:** Downgrade para Prisma 6.19.3, que mantém o padrão clássico compatível com NestJS.

#### Migrations Manuais via SQL
A Supabase usa pgbouncer na porta 6543 (modo transacção). O Prisma `migrate dev` e `db push` requerem uma shadow database que não funciona com pgbouncer. A porta 5432 (conexão directa) estava inacessível do ambiente de desenvolvimento.

**Solução:** Gerar SQL localmente e aplicar manualmente no Supabase SQL Editor:
```bash
npx prisma migrate diff \
  --from-schema-datamodel prisma/baseline.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script
```
Após aplicar, actualizar `prisma/baseline.prisma` para reflectir o estado da DB.

#### pgbouncer — prepared statements (descoberto nos testes E2E)
O pgbouncer em modo transacção (porta 6543) não suporta prepared statements. O Prisma 6 usa-os por omissão, causando erro `42P05: prepared statement already exists` após a primeira conexão.

**Fix:** Adicionar `pgbouncer=true` à `DATABASE_URL`:
```
DATABASE_URL=postgresql://...?sslmode=require&uselibpqcompat=true&pgbouncer=true
```

Isto instrui o Prisma a usar query mode em vez de prepared statements, compatível com pgbouncer.

#### @HttpCode(200) nos endpoints de acção (descoberto nos testes E2E)
O NestJS retorna `201` por omissão em todos os `@Post()`. Os endpoints que fazem acções (não criação de recursos) devem retornar `200`. Foram adicionados `@HttpCode(200)` a 13 métodos em 5 controllers:
- companies: validate-documentation, forward-to-state, approve-license, reject-license, suspend
- products: request-publication, approve-publication, reject-publication, suspend
- price-proposals: submit, approve, reject
- orders: pay, block, cancel
- shipments: approve, reject, hold

#### `import type` para interfaces em decorators
O TypeScript com `emitDecoratorMetadata: true` e `isolatedModules: true` gera erro TS1272 quando uma interface é usada como tipo em parâmetros de métodos decorados. Solução: `import type { AuthUser }` nos controllers.

---

## 2. Estrutura de Pastas

```
corredor-lobito-api/
├── src/
│   ├── main.ts                          # Bootstrap, ValidationPipe, CORS
│   ├── app.module.ts                    # Raiz — importa todos os módulos
│   ├── prisma/
│   │   ├── prisma.service.ts            # PrismaClient com connect/disconnect
│   │   └── prisma.module.ts             # @Global() — disponível em toda a app
│   ├── common/
│   │   ├── enums/
│   │   │   └── role.enum.ts             # Enum Role (TypeScript)
│   │   ├── types/
│   │   │   └── auth-user.type.ts        # Interface AuthUser (payload do JWT)
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts       # @Roles('state', 'staff', ...)
│   │   │   └── current-user.decorator.ts# @CurrentUser() → AuthUser
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts        # Valida Bearer token
│   │   │   └── roles.guard.ts           # Verifica role do utilizador
│   │   └── services/
│   │       └── tax-engine.service.ts    # Cálculo de imposto por país/categoria
│   └── modules/
│       ├── auth/
│       │   ├── auth.module.ts
│       │   ├── auth.controller.ts       # POST /auth/login
│       │   ├── auth.service.ts          # login() com bcrypt + JWT
│       │   ├── strategies/
│       │   │   └── jwt.strategy.ts      # Valida token, carrega user da DB
│       │   └── dto/
│       │       └── login.dto.ts
│       ├── audit/
│       │   ├── audit.module.ts
│       │   ├── audit.controller.ts      # GET /logs, GET /logs/:id [state]
│       │   └── audit.service.ts         # log() — append-only
│       ├── companies/
│       │   ├── companies.module.ts
│       │   ├── companies.controller.ts  # 7 endpoints
│       │   ├── companies.service.ts     # Workflow licenciamento
│       │   └── dto/
│       │       ├── create-company.dto.ts
│       │       ├── validate-docs.dto.ts
│       │       ├── approve-license.dto.ts
│       │       └── reject-or-suspend.dto.ts
│       ├── products/
│       │   ├── products.module.ts
│       │   ├── products.controller.ts   # 7 endpoints
│       │   ├── products.service.ts      # Workflow publicação
│       │   └── dto/
│       │       ├── create-product.dto.ts
│       │       ├── update-product.dto.ts
│       │       └── reject-product.dto.ts
│       ├── price-proposals/
│       │   ├── price-proposals.module.ts
│       │   ├── price-proposals.controller.ts # 7 endpoints
│       │   ├── price-proposals.service.ts    # Snapshot imutável na aprovação
│       │   └── dto/
│       │       ├── create-price-proposal.dto.ts
│       │       ├── update-price-proposal.dto.ts
│       │       └── reject-proposal.dto.ts
│       ├── taxes/
│       │   ├── taxes.module.ts          # Exporta TaxEngineService
│       │   ├── taxes.controller.ts      # 3 endpoints
│       │   ├── taxes.service.ts
│       │   └── dto/
│       │       └── create-tax.dto.ts
│       ├── orders/
│       │   ├── orders.module.ts         # Importa TaxesModule
│       │   ├── orders.controller.ts     # 7 endpoints
│       │   ├── orders.service.ts        # pay() com cálculo automático
│       │   └── dto/
│       │       ├── create-order.dto.ts
│       │       └── block-order.dto.ts
│       └── shipments/
│           ├── shipments.module.ts
│           ├── shipments.controller.ts  # 7 endpoints
│           ├── shipments.service.ts     # tracking append-only, customs
│           └── dto/
│               ├── create-shipment.dto.ts
│               ├── update-tracking.dto.ts
│               └── customs-action.dto.ts
├── prisma/
│   ├── schema.prisma                    # Schema completo (estado actual)
│   ├── baseline.prisma                  # Estado aplicado na DB (para diffs)
│   ├── migrations/
│   │   ├── migration_lock.toml
│   │   ├── 20260507000001_init_user/
│   │   ├── 20260507000002_add_company/
│   │   ├── 20260507000003_add_audit_log/
│   │   ├── 20260507000004_add_product_price_proposal/
│   │   ├── 20260507000005_add_tax_order_orderline/
│   │   └── 20260507000006_add_shipment_customs/
│   └── seed/
│       └── index.ts                     # 7 utilizadores + 7 regras fiscais
├── .env                                 # Variáveis locais (não commitar)
├── .env.example                         # Template sem valores
├── .gitignore
└── package.json
```

---

## 3. Base de Dados — Schema Completo

### Enums

| Enum | Valores |
|------|---------|
| `Role` | `state` `staff` `specialist` `producer` `buyer` `operator` `customs` |
| `UserStatus` | `active` `blocked` |
| `LicenseStatus` | `pending` `under_review` `active` `rejected` `suspended` |
| `CompanyCountry` | `angola` `zambia` `drc` `tanzania` `zimbabwe` `mozambique` |
| `ProductStatus` | `draft` `pending_review` `published_official` `suspended` `rejected` |
| `PriceProposalStatus` | `draft` `submitted` `approved` `rejected` |
| `OrderStatus` | `draft` `confirmed` `paid` `blocked` `cancelled` |
| `ShipmentStatus` | `created` `in_transit` `at_border` `customs_approved` `customs_rejected` `held` `delivered` |
| `CustomsStatus` | `pending` `approved` `rejected` `held` |

### Tabelas

#### `users`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| email | TEXT | UNIQUE |
| passwordHash | TEXT | bcrypt rounds=10 |
| fullName | TEXT | |
| role | Role | enum |
| status | UserStatus | default: active |
| companyId | TEXT? | FK → companies |
| lastLoginAt | TIMESTAMP? | actualizado no login |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

#### `companies`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| name | TEXT | |
| country | CompanyCountry | enum |
| contactEmail | TEXT | |
| contactPhone | TEXT? | |
| address | TEXT? | |
| licenseStatus | LicenseStatus | default: pending |
| licenseNumber | TEXT? | atribuído pelo STATE na aprovação |
| licenseExpiresAt | TIMESTAMP? | |
| rejectionReason | TEXT? | |
| suspensionReason | TEXT? | |
| validationNotes | TEXT? | STAFF preenche na validação |
| approvedByStateId | TEXT? | ID do utilizador STATE |
| validatedByStaffId | TEXT? | ID do utilizador STAFF |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

#### `products`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| name | TEXT | |
| description | TEXT? | |
| category | TEXT | usado pelo TaxEngine |
| producerId | TEXT | FK → users |
| companyId | TEXT | FK → companies |
| status | ProductStatus | default: draft |
| rejectionReason | TEXT? | |
| publishedAt | TIMESTAMP? | preenchido na aprovação STATE |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

#### `price_proposals`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| productId | TEXT | FK → products |
| createdById | TEXT | FK → users (specialist) |
| approvedById | TEXT? | FK → users (state) |
| status | PriceProposalStatus | default: draft |
| proposedPrice | DECIMAL(15,4) | |
| currency | TEXT | default: USD |
| justification | TEXT? | |
| rejectionReason | TEXT? | |
| **snapshot** | JSONB? | **gerado UMA VEZ na aprovação — imutável** |
| submittedAt | TIMESTAMP? | |
| approvedAt | TIMESTAMP? | |
| validFrom | TIMESTAMP? | |
| validTo | TIMESTAMP? | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

#### `taxes`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| name | TEXT | |
| category | TEXT | ex: "general" |
| country | TEXT | ex: "angola" ou "all" (fallback global) |
| rate | DECIMAL(5,4) | ex: 0.1400 = 14% |
| effectiveFrom | TIMESTAMP | |
| effectiveTo | TIMESTAMP? | null = sem expiração |
| isActive | BOOLEAN | default: true |
| createdById | TEXT | FK → users |
| createdAt | TIMESTAMP | |
| INDEX | (country, category, effectiveFrom) | para lookup rápido |

#### `orders`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| buyerId | TEXT | FK → users |
| companyId | TEXT | FK → companies |
| status | OrderStatus | default: draft |
| totalAmount | DECIMAL(15,4)? | net + tax — preenchido no pay() |
| taxAmount | DECIMAL(15,4)? | |
| netAmount | DECIMAL(15,4)? | |
| currency | TEXT | default: USD |
| blockedReason | TEXT? | |
| blockedById | TEXT? | |
| blockedAt | TIMESTAMP? | |
| paidAt | TIMESTAMP? | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

#### `order_lines`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| orderId | TEXT | FK → orders |
| productId | TEXT | FK → products |
| priceProposalId | TEXT | FK → price_proposals |
| qty | INTEGER | |
| unitPrice | DECIMAL(15,4) | copiado do snapshot na aprovação |
| taxRate | DECIMAL(5,4)? | calculado pelo TaxEngine |
| taxAmount | DECIMAL(15,4)? | unitPrice × qty × taxRate |
| lineTotal | DECIMAL(15,4)? | net + tax |
| **snapshotRef** | JSONB? | **cópia do snapshot usado — auditoria** |

#### `shipments`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| orderId | TEXT | FK → orders |
| operatorId | TEXT | FK → users |
| status | ShipmentStatus | default: created |
| origin | TEXT | |
| destination | TEXT | |
| eta | TIMESTAMP? | |
| documents | JSONB? | |
| lastLocation | TEXT? | última localização |
| **trackingEvents** | JSONB? | **array append-only** |
| holdReason | TEXT? | |
| createdAt | TIMESTAMP | |
| updatedAt | TIMESTAMP | |

#### `customs_dispatches`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| shipmentId | TEXT | UNIQUE FK → shipments |
| dispatcherId | TEXT | FK → users (customs) |
| status | CustomsStatus | default: pending |
| notes | TEXT? | |
| rejectionReason | TEXT? | |
| validatedAt | TIMESTAMP? | |

#### `audit_logs`
| Coluna | Tipo | Notas |
|--------|------|-------|
| id | TEXT (UUID) | PK |
| userId | TEXT | quem fez a acção |
| role | TEXT | role no momento da acção |
| action | TEXT | ex: APPROVE_LICENSE |
| entity | TEXT | ex: company |
| entityId | TEXT | UUID da entidade |
| beforeJson | TEXT? | estado anterior (JSON) |
| afterJson | TEXT? | estado posterior (JSON) |
| meta | TEXT? | info extra |
| ipAddress | TEXT? | |
| createdAt | TIMESTAMP | **sem updatedAt — append-only** |
| INDEX | (entity, entityId) | |
| INDEX | (createdAt) | |

---

## 4. Migrations

Todas as migrations foram geradas com `prisma migrate diff` e aplicadas manualmente no Supabase SQL Editor.

| Migration | Conteúdo |
|-----------|---------|
| `20260507000001_init_user` | Enums Role, UserStatus · tabela users |
| `20260507000002_add_company` | Enums LicenseStatus, CompanyCountry · tabela companies · FK users→companies |
| `20260507000003_add_audit_log` | Tabela audit_logs com índices |
| `20260507000004_add_product_price_proposal` | Enums ProductStatus, PriceProposalStatus · tabelas products, price_proposals · FKs |
| `20260507000005_add_tax_order_orderline` | Enum OrderStatus · tabelas taxes, orders, order_lines · FKs e índice |
| `20260507000006_add_shipment_customs` | Enums ShipmentStatus, CustomsStatus · tabelas shipments, customs_dispatches · FKs |

### Comando para próximas migrations

```bash
# 1. Actualizar prisma/schema.prisma com as alterações
# 2. Gerar SQL da diferença:
npx prisma migrate diff \
  --from-schema-datamodel prisma/baseline.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# 3. Guardar o SQL em prisma/migrations/<timestamp>_<nome>/migration.sql
# 4. Aplicar no Supabase SQL Editor
# 5. Actualizar o baseline:
cp prisma/schema.prisma prisma/baseline.prisma

# 6. Regenerar o cliente:
npx prisma generate
```

---

## 5. Autenticação e RBAC

### Fluxo de Login

```
POST /auth/login { email, password }
  → bcrypt.compare(password, user.passwordHash)
  → JWT assinado { sub: user.id, role: user.role }
  → { access_token, user: { id, email, role, fullName } }
```

### Usar o Token

```
Authorization: Bearer <access_token>
```

### Guards

| Guard | Ficheiro | Função |
|-------|---------|--------|
| `JwtAuthGuard` | `common/guards/jwt-auth.guard.ts` | Verifica token JWT — 401 se inválido |
| `RolesGuard` | `common/guards/roles.guard.ts` | Verifica role — 403 se não autorizado |

### Decorators

```typescript
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('state', 'staff')                  // um ou mais roles permitidos
método(@CurrentUser() user: AuthUser) {}  // injector do utilizador autenticado
```

### Interface AuthUser (payload extraído do JWT)

```typescript
interface AuthUser {
  id:        string;   // UUID do utilizador
  email:     string;
  role:      string;   // 'state' | 'staff' | 'specialist' | ...
  companyId: string | null;
}
```

---

## 6. Módulos e Endpoints

### Auth
```
POST  /auth/login                              público
```

### Companies
```
POST  /companies                               público (registo)
GET   /companies                               [state, staff]
GET   /companies/:id                           autenticado
POST  /companies/:id/validate-documentation   [staff]
POST  /companies/:id/forward-to-state         [staff]
POST  /companies/:id/approve-license          [state]
POST  /companies/:id/reject-license           [state]
POST  /companies/:id/suspend                  [state]
```

### Products
```
GET   /products                               autenticado
GET   /products/:id                           autenticado
POST  /products                               [producer]
PUT   /products/:id                           [producer — só draft]
POST  /products/:id/request-publication       [producer]
POST  /products/:id/approve-publication       [state]
POST  /products/:id/reject-publication        [state]
POST  /products/:id/suspend                   [state]
```

### Price Proposals
```
GET   /price-proposals                        [state, specialist]
GET   /price-proposals/:id                    autenticado
POST  /price-proposals                        [specialist]
PUT   /price-proposals/:id                    [specialist — só draft/rejected]
POST  /price-proposals/:id/submit             [specialist]
POST  /price-proposals/:id/approve            [state]
POST  /price-proposals/:id/reject             [state]
```

### Taxes
```
GET   /taxes                                  autenticado
GET   /taxes/country/:code                    autenticado
POST  /taxes                                  [state]
```

### Orders
```
GET   /orders                                 [state, staff]
GET   /orders/my-orders                       [buyer]
GET   /orders/:id                             autenticado
POST  /orders                                 [buyer]
POST  /orders/:id/pay                         [buyer]
POST  /orders/:id/block                       [state]
POST  /orders/:id/cancel                      [state]
```

### Shipments
```
GET   /shipments                              [state, staff]
GET   /shipments/:id                          autenticado
POST  /shipments                              [operator]
PUT   /shipments/:id/tracking                 [operator]
POST  /shipments/:id/approve                  [customs]
POST  /shipments/:id/reject                   [customs]
POST  /shipments/:id/hold                     [customs, state]
```

### Audit Logs
```
GET   /logs                                   [state]
GET   /logs?entity=order&entityId=<uuid>      [state] — filtro por entidade
GET   /logs/:id                               [state]
```

**Total: 37 endpoints**

---

## 7. Regras de Negócio Críticas

### Workflow de Licenciamento

```
STAFF: POST /companies/:id/validate-documentation { valid: true }
  → licenseStatus: pending → under_review

STATE: POST /companies/:id/approve-license { licenseNumber, licenseExpiresAt }
  → licenseStatus: under_review → active

STATE: POST /companies/:id/reject-license { reason }
  → licenseStatus: any → rejected

STATE: POST /companies/:id/suspend { reason }
  → licenseStatus: active → suspended   (só activas)
```

### Workflow de Produtos

```
PRODUCER: POST /products → status: draft
PRODUCER: POST /products/:id/request-publication → draft → pending_review
STATE:    POST /products/:id/approve-publication → pending_review → published_official
STATE:    POST /products/:id/reject-publication  → pending_review → rejected
STATE:    POST /products/:id/suspend             → published_official → suspended
```

### Workflow de Price Proposals + Snapshot Imutável

```
SPECIALIST: POST /price-proposals → status: draft
SPECIALIST: PUT  /price-proposals/:id → só em draft ou rejected
SPECIALIST: POST /price-proposals/:id/submit → draft → submitted
STATE:      POST /price-proposals/:id/approve →
  submitted → approved
  + snapshot JSONB gerado UMA VEZ:
    {
      snapshotVersion: '1.0',
      generatedAt: ISO string,
      proposalId, productId, productName, productCategory,
      approvedPriceUsd: number,
      currency, validFrom, validTo,
      immutable: true
    }
STATE: POST /price-proposals/:id/reject → reason obrigatório

REGRA: PUT numa proposta com status 'approved' → 403 (imutável)
```

### Cálculo de Imposto no Pay

```
BUYER: POST /orders/:id/pay

Para cada linha do pedido:
  1. Ler snapshot da price_proposal (status === 'approved')
  2. unitPrice = snapshot.approvedPriceUsd   ← NUNCA do produto directo
  3. taxRate = TaxEngineService.getRate(empresa.country, produto.category)
     → lookup: country + category → fallback: 'all' + category → 0%
  4. lineNet = unitPrice × qty
  5. lineTax = lineNet × taxRate
  6. lineTotal = lineNet + lineTax
  7. Gravar na order_line: unitPrice, taxRate, taxAmount, lineTotal, snapshotRef

totalAmount = Σ lineTotal
taxAmount   = Σ lineTax
netAmount   = Σ lineNet
→ order.status: draft → paid
```

### Tracking Append-Only

```
OPERATOR: PUT /shipments/:id/tracking { location, status, notes? }
→ trackingEvents: [...eventos_anteriores, { timestamp, location, status, updatedBy, notes }]
→ Nunca sobrescreve — sempre acrescenta ao array JSON
```

### Audit Log Imutável

```
AuditService.log({ userId, role, action, entity, entityId, before?, after? })
→ prisma.auditLog.create(...)  ← só CREATE, nunca UPDATE/DELETE

AuditController expõe APENAS GET /logs e GET /logs/:id
Não existe POST, PUT, PATCH, DELETE para /logs
```

---

## 8. Dados de Desenvolvimento (Seed)

Executar: `npx prisma db seed`

### Utilizadores (password: `Lobito@Dev2024!`)

| Role | Email |
|------|-------|
| state | state@lobito.gov |
| staff | staff@lobito.gov |
| specialist | specialist@lobito.gov |
| producer | producer@lobito.biz |
| buyer | buyer@lobito.biz |
| operator | operator@lobito.biz |
| customs | customs@lobito.gov |

### Regras Fiscais (criadas pelo state)

| País | Categoria | Taxa |
|------|-----------|------|
| angola | general | 14% |
| zambia | general | 16% |
| drc | general | 16% |
| tanzania | general | 18% |
| zimbabwe | general | 15% |
| mozambique | general | 17% |
| all (global) | general | 15% |

---

## 9. Como Correr o Projecto

### Variáveis de Ambiente

Criar `.env` baseado em `.env.example`:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST:6543/DATABASE?sslmode=require&uselibpqcompat=true
NODE_ENV=development
JWT_SECRET=<string longa e aleatória>
JWT_EXPIRES_IN=8h
REFRESH_TOKEN_EXPIRES_IN=7d
PORT=3000
```

### Comandos

```bash
# Instalar dependências
npm install

# Gerar cliente Prisma
npx prisma generate

# Popular base de dados (utilizadores + regras fiscais)
npx prisma db seed

# Desenvolvimento (hot reload)
npm run start:dev

# Build de produção
npm run build

# Produção
npm run start:prod
```

A API fica disponível em `http://localhost:3000`.  
O Swagger UI fica disponível em `http://localhost:3000/docs`.  
O JSON OpenAPI fica disponível em `http://localhost:3000/docs-json`.

### Usar o Swagger UI

1. Abrir `http://localhost:3000/docs` no browser
2. Clicar em **Authorize** (canto superior direito)
3. Fazer login via `POST /auth/login` para obter o JWT
4. Colar o token no campo `Bearer` do Swagger
5. Todos os endpoints ficam autenticados automaticamente (`persistAuthorization: true`)

---

## 10. Como Gerar Migrations

Para cada nova alteração ao schema:

```bash
# 1. Editar prisma/schema.prisma (adicionar models, campos, enums)

# 2. Verificar o diff (SQL que será gerado)
npx prisma migrate diff \
  --from-schema-datamodel prisma/baseline.prisma \
  --to-schema-datamodel prisma/schema.prisma \
  --script

# 3. Guardar o SQL
mkdir prisma/migrations/<timestamp>_<nome>
# Copiar output do comando anterior para migration.sql

# 4. Aplicar no Supabase:
#    Dashboard → SQL Editor → New Query → colar SQL → Run

# 5. Actualizar o baseline (marca o estado como aplicado)
cp prisma/schema.prisma prisma/baseline.prisma

# 6. Regenerar o cliente Prisma
npx prisma generate
```

> **Porquê baseline.prisma?**  
> O `migrate diff` compara dois estados de schema. O `baseline.prisma` representa o que está na base de dados actualmente. O `schema.prisma` representa o que queremos que fique. A diferença entre os dois é o SQL da migration.

---

*Corredor do Lobito — MVP v1.0*  
*NestJS 11 · TypeScript · PostgreSQL · Prisma 6 · JWT*
