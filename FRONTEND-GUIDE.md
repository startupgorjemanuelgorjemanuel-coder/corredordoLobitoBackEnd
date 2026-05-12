# Corredor do Lobito — Guia de Desenvolvimento Frontend MVP

> **Versão Backend:** 1.0 MVP  
> **API Base URL (dev):** `http://localhost:3000`  
> **Swagger UI:** `http://localhost:3000/docs`  
> **Autenticação:** Bearer JWT  
> **Este guia é a fonte de verdade para a implementação do Frontend MVP.**

---

## Índice

0. [Conceito do Projecto](#0-conceito-do-projecto)
1. [Configuração Inicial](#1-configuração-inicial)
2. [Autenticação](#2-autenticação)
3. [Roles e Permissões](#3-roles-e-permissões)
4. [Tipos TypeScript](#4-tipos-typescript)
5. [Tratamento de Erros](#5-tratamento-de-erros)
6. [Ecrãs por Role](#6-ecrãs-por-role)
7. [Todos os Endpoints](#7-todos-os-endpoints)
8. [Fluxos de Negócio Completos](#8-fluxos-de-negócio-completos)
9. [Regras de UI Críticas](#9-regras-de-ui-críticas)
10. [Credenciais de Desenvolvimento](#10-credenciais-de-desenvolvimento)

---

## 0. Conceito do Projecto

> **Ler esta secção antes de qualquer linha de código.**  
> O Frontend MVP deve reflectir rigorosamente este conceito — não adicionar, não remover, não interpretar.

---

### 0.1 O que é o Corredor do Lobito

O **Corredor do Lobito** é um ecossistema digital governamental para regulação de operações comerciais transfronteiriças entre países da África Austral:

**Angola · Zâmbia · RDC · Tanzânia · Zimbabwe · Moçambique**

O sistema digitaliza e regula o ciclo completo de uma operação de comércio internacional:

```
Empresa licenciada → Produto aprovado → Preço oficial definido
        ↓
Comprador faz pedido → Paga (com imposto automático)
        ↓
Operador cria embarque → Alfândega valida → Mercadoria entregue
        ↓
Auditoria de tudo — imutável e rastreável
```

Não é uma loja. Não é um marketplace. É uma **plataforma de governança regulatória** onde o Estado controla e aprova cada etapa antes de avançar para a seguinte.

---

### 0.2 O Problema que Resolve

Antes do sistema, as operações transfronteiriças neste corredor eram:
- **Manuais** — documentação em papel, processos lentos
- **Opacas** — sem rastreabilidade de produtos, preços ou embarques
- **Inconsistentes** — regras fiscais aplicadas de forma diferente por país
- **Sem auditoria** — impossível rastrear quem decidiu o quê e quando

O sistema resolve isto com:
- **Digitalização completa** dos fluxos de negócio
- **Controlo estatal** em cada ponto crítico do processo
- **Preços oficiais** via snapshots imutáveis — o preço aprovado nunca muda
- **Impostos automáticos** calculados por país e categoria do produto
- **Audit log permanente** de cada acção realizada no sistema

---

### 0.3 Governança — Quem Manda em Quê

O sistema tem uma hierarquia clara. **O Estado tem a palavra final em tudo.**

```
STATE (Autoridade Máxima)
  ├── Aprova/rejeita licenças de empresas
  ├── Aprova/rejeita publicação de produtos
  ├── Aprova/rejeita price proposals (e gera o snapshot oficial)
  ├── Bloqueia/cancela pedidos
  ├── Intervém em embarques
  ├── Define regras fiscais por país
  └── Lê o audit log completo

STAFF (Operação Governamental)
  ├── Valida documentação de empresas
  └── Encaminha ao STATE para decisão
      ← STAFF valida, não decide

SPECIALIST (Técnico de Preços)
  └── Cria e submete price proposals ao STATE
      ← SPECIALIST propõe, não aprova

PRODUCER (Empresa — Criador)
  └── Cria produtos e solicita publicação
      ← Só opera após empresa ter licença activa

BUYER (Empresa — Comprador)
  └── Cria pedidos e paga
      ← Só pode comprar produtos com price proposal aprovada

OPERATOR (Logística)
  └── Cria embarques e actualiza tracking
      ← Só opera em pedidos pagos

CUSTOMS (Alfândega)
  └── Aprova ou rejeita embarques na fronteira
```

---

### 0.4 Os 7 Actores do MVP — Quem São na Vida Real

| Role | Quem é | O que faz no sistema |
|------|--------|---------------------|
| `state` | Funcionário do governo / autoridade regulatória | Aprova tudo, decide tudo, lê o audit log |
| `staff` | Técnico governamental de validação | Valida documentação de empresas antes de ir ao STATE |
| `specialist` | Analista governamental de preços | Define preços oficiais submetendo price proposals |
| `producer` | Empresário / fornecedor de produtos | Cria e regista produtos no catálogo oficial |
| `buyer` | Importador / comprador | Cria pedidos e paga (imposto calculado automaticamente) |
| `operator` | Operador logístico / transportadora | Gere o transporte físico e actualiza o tracking |
| `customs` | Oficial da alfândega | Valida e aprova ou rejeita mercadoria na fronteira |

**Cada utilizador tem exactamente um role. O role não muda em runtime.**

---

### 0.5 O Fluxo de Negócio Completo — De Ponta a Ponta

Este é o único fluxo do MVP. O Frontend deve suportar todas as etapas.

```
ETAPA 1 — EMPRESA
─────────────────
Qualquer utilizador regista empresa
        ↓ licenseStatus: "pending"
STAFF valida documentação
        ↓ licenseStatus: "under_review"
STATE aprova licença
        ↓ licenseStatus: "active"
              ← Sem licença activa, a empresa não pode operar

ETAPA 2 — PRODUTO
─────────────────
PRODUCER (de empresa activa) cria produto
        ↓ status: "draft"
PRODUCER solicita publicação
        ↓ status: "pending_review"
STATE aprova publicação
        ↓ status: "published_official"
              ← Sem produto publicado, não pode ter price proposal

ETAPA 3 — PREÇO OFICIAL
───────────────────────
SPECIALIST cria price proposal para o produto
        ↓ status: "draft"
SPECIALIST submete ao STATE
        ↓ status: "submitted"
STATE aprova — snapshot gerado neste momento (IMUTÁVEL)
        ↓ status: "approved" + snapshot permanente
              ← Sem price proposal aprovada, BUYER não pode comprar

ETAPA 4 — PEDIDO E PAGAMENTO
─────────────────────────────
BUYER cria pedido com linhas de produtos
        ↓ status: "draft"
BUYER paga — sistema calcula imposto automaticamente do snapshot
        ↓ status: "paid"
          netAmount + taxAmount (% por país) = totalAmount
              ← O preço vem sempre do snapshot — nunca do produto

ETAPA 5 — EMBARQUE E ALFÂNDEGA
───────────────────────────────
OPERATOR cria embarque para o pedido pago
        ↓ status: "created"
OPERATOR actualiza tracking (cada actualização acrescenta ao histórico)
        ↓ status: "in_transit" → "at_border"
CUSTOMS aprova o embarque
        ↓ status: "customs_approved"

ETAPA 6 — AUDITORIA
────────────────────
STATE consulta o audit log de qualquer entidade
        → Cada acção relevante foi gravada automaticamente
        → Imutável — não se pode editar nem apagar
```

---

### 0.6 Regras Fundamentais do Sistema

Estas regras **nunca mudam** no MVP. O Frontend deve respeitá-las na construção de cada ecrã.

**Regra 1 — O Estado aprova tudo**
Nenhuma entidade passa de um estado para o seguinte sem aprovação explícita do STATE. O Frontend não deve criar atalhos ou fluxos alternativos.

**Regra 2 — O snapshot é imutável**
Quando o STATE aprova uma price proposal, é gerado um snapshot com o preço oficial. Este snapshot nunca muda — mesmo que a proposta seja alterada depois. O Frontend não deve mostrar botões de edição em propostas aprovadas.

**Regra 3 — O preço vem sempre do snapshot**
Quando um BUYER paga um pedido, o preço calculado vem do `snapshot.approvedPriceUsd` — nunca do produto directamente. O Frontend deve exibir este valor como o preço oficial.

**Regra 4 — O imposto é automático**
O sistema calcula o imposto automaticamente no momento do pagamento, baseado no país da empresa e na categoria do produto. O Frontend não calcula impostos — recebe os valores já calculados na resposta do `POST /orders/:id/pay`.

**Regra 5 — O tracking é append-only**
Cada actualização de tracking acrescenta um evento ao histórico. O Frontend deve mostrar a lista completa de eventos e nunca permitir edição de eventos passados.

**Regra 6 — O audit log é só leitura**
O audit log regista automaticamente cada acção crítica. O Frontend só mostra — nunca permite criar, editar ou apagar entradas de log.

**Regra 7 — Empresa sem licença activa não opera**
Produtos só podem ser criados por produtores de empresas com `licenseStatus: "active"`. Pedidos só podem referenciar produtos de empresas activas.

---

### 0.7 O que é o MVP — Âmbito Exacto

O Frontend MVP cobre **exactamente** o que o Backend MVP implementou. Nada mais.

**Incluído no MVP:**

| Domínio | O que está implementado |
|---------|------------------------|
| Autenticação | Login com JWT · 7 roles · Token expira em 8h |
| Empresas | Registo · Validação · Licenciamento |
| Produtos | Criação · Publicação |
| Price Proposals | Criação · Submissão · Aprovação com snapshot |
| Pedidos | Criação · Pagamento com imposto automático · Bloqueio |
| Impostos | Regras por país · Cálculo automático |
| Embarques | Criação · Tracking · Aprovação aduaneira |
| Audit Log | Leitura imutável de todas as acções |

**Fora do MVP — não construir no Frontend agora:**

| Funcionalidade | Motivo |
|---------------|--------|
| Upload de documentos | Endpoint não existe no backend |
| Paginação nas listas | Não implementada no backend |
| Filtros e pesquisa | Não implementados no backend |
| Refresh token | Não existe — relogin após 8h |
| Notificações em tempo real | Sem WebSockets no backend |
| Dashboard com gráficos/KPIs | Pós-MVP |
| 2FA / SSO governamental | Pós-MVP |
| Relatórios exportáveis | Pós-MVP |

---

### 0.8 Impostos por País — Valores Actuais no Sistema

O sistema tem estas regras fiscais activas (criadas no seed):

| País | Categoria | Taxa |
|------|-----------|------|
| Angola | general | **14%** |
| Zâmbia | general | **16%** |
| RDC | general | **16%** |
| Tanzânia | general | **18%** |
| Zimbabwe | general | **15%** |
| Moçambique | general | **17%** |
| Global (fallback) | general | **15%** |

O imposto é determinado pelo **país da empresa compradora** e pela **categoria do produto**. Se não houver regra específica para o país, o sistema usa a regra global (15%).

---

### 0.9 Princípios que o Frontend deve respeitar

1. **Não antecipar estados** — um botão de acção só aparece quando o estado actual o permite
2. **Não inventar endpoints** — só chamar endpoints que existem na lista do guia
3. **Não calcular preços nem impostos** — estes vêm sempre do backend
4. **Não permitir edição de entidades aprovadas** — snapshot, audit log e proposals aprovadas são imutáveis
5. **Respeitar os roles** — verificar sempre `user.role` antes de mostrar qualquer acção
6. **Não paginar artificialmente** — as listas devolvem todos os registos; no MVP isso é suficiente

---

## 1. Configuração Inicial

### Variável de ambiente

```env
VITE_API_URL=http://localhost:3000
```

### Cliente HTTP base (axios)

```typescript
// src/lib/api.ts
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  headers: { 'Content-Type': 'application/json' },
});

// Injector automático do token em todos os pedidos
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor de resposta — logout automático em 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export default api;
```

---

## 2. Autenticação

### Login

```
POST /auth/login
```

**Request:**
```json
{
  "email": "state@lobito.gov",
  "password": "Lobito@Dev2024!"
}
```

**Response 201:**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id":       "41bafc86-f90b-4fad-a8c3-3bc6cda15ded",
    "cd":       "USR-0001",
    "email":    "state@lobito.gov",
    "role":     "state",
    "fullName": "State Authority"
  }
}
```

**Response 401:** Credenciais inválidas  
**Response 403:** Utilizador bloqueado

### Implementação do serviço de auth

```typescript
// src/services/auth.service.ts
import api from '../lib/api';

export interface AuthUser {
  id:       string;
  email:    string;
  role:     Role;
  fullName: string;
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const { data } = await api.post('/auth/login', { email, password });
  localStorage.setItem('access_token', data.access_token);
  localStorage.setItem('user', JSON.stringify(data.user));
  return data.user;
}

export function logout() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('user');
}

export function getCurrentUser(): AuthUser | null {
  const raw = localStorage.getItem('user');
  return raw ? JSON.parse(raw) : null;
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem('access_token');
}
```

### Notas importantes sobre o token

- O token expira em **8 horas**
- Quando expira, a API devolve `401` — o interceptor faz logout automático e redireciona para `/login`
- **Não há refresh token no MVP** — o utilizador tem de fazer login novamente
- Guardar o token em `localStorage` (MVP) — considerar `httpOnly cookie` em produção

---

## 3. Roles e Permissões

O sistema tem **7 roles**. Cada utilizador tem exactamente um role. O Frontend deve usar o role para:
- Decidir que ecrãs mostrar no menu
- Esconder/mostrar botões de acção
- Fazer routing após login

### Tabela de roles

| Role | Acesso principal |
|------|-----------------|
| `state` | Aprovar/rejeitar tudo · Ver tudo · Ler audit logs |
| `staff` | Validar documentação de empresas |
| `specialist` | Criar e submeter price proposals |
| `producer` | Criar produtos e solicitar publicação |
| `buyer` | Criar pedidos e pagar |
| `operator` | Criar embarques e actualizar tracking |
| `customs` | Aprovar/rejeitar embarques |

### Routing por role após login

```typescript
// src/router/index.ts
export function getHomeRoute(role: Role): string {
  const routes: Record<Role, string> = {
    state:      '/dashboard/state',
    staff:      '/dashboard/staff',
    specialist: '/dashboard/specialist',
    producer:   '/dashboard/producer',
    buyer:      '/dashboard/buyer',
    operator:   '/dashboard/operator',
    customs:    '/dashboard/customs',
  };
  return routes[role];
}
```

### Guard de rota

```typescript
// src/router/guards.ts
export function requireRole(allowedRoles: Role[]): boolean {
  const user = getCurrentUser();
  if (!user) return false;
  return allowedRoles.includes(user.role);
}
```

---

## 4. Tipos TypeScript

```typescript
// src/types/index.ts

export type Role =
  | 'state' | 'staff' | 'specialist'
  | 'producer' | 'buyer' | 'operator' | 'customs';

export type LicenseStatus =
  | 'pending' | 'under_review' | 'active' | 'rejected' | 'suspended';

export type ProductStatus =
  | 'draft' | 'pending_review' | 'published_official' | 'suspended' | 'rejected';

export type PriceProposalStatus =
  | 'draft' | 'submitted' | 'approved' | 'rejected';

export type OrderStatus =
  | 'draft' | 'confirmed' | 'paid' | 'blocked' | 'cancelled';

export type ShipmentStatus =
  | 'created' | 'in_transit' | 'at_border'
  | 'customs_approved' | 'customs_rejected' | 'held' | 'delivered';

export type CompanyCountry =
  | 'angola' | 'zambia' | 'drc' | 'tanzania' | 'zimbabwe' | 'mozambique';

// ── Entidades ──────────────────────────────────────────────────────────
// cd: string — código completo armazenado na DB (ex: "EMP-0001")
// id: string — UUID interno usado nas chamadas à API
// NUNCA mostrar id ao utilizador — usar sempre cd

export interface Company {
  id:                 string;
  cd:                 string;   // "EMP-0001" — exibir ao utilizador
  name:               string;
  country:            CompanyCountry;
  contactEmail:       string;
  contactPhone:       string | null;
  address:            string | null;
  licenseStatus:      LicenseStatus;
  licenseNumber:      string | null;
  licenseExpiresAt:   string | null;
  rejectionReason:    string | null;
  suspensionReason:   string | null;
  validationNotes:    string | null;
  approvedByStateId:  string | null;
  validatedByStaffId: string | null;
  createdAt:          string;
  updatedAt:          string;
}

export interface Product {
  id:              string;
  cd:              string;   // "PRD-0001" — exibir ao utilizador
  name:            string;
  description:     string | null;
  category:        string;
  producerId:      string;
  companyId:       string;
  status:          ProductStatus;
  rejectionReason: string | null;
  publishedAt:     string | null;
  createdAt:       string;
  updatedAt:       string;
  producer?:       { id: string; fullName: string };
  company?:        { id: string; name: string };
}

export interface PriceProposalSnapshot {
  snapshotVersion:  string;
  generatedAt:      string;
  proposalId:       string;
  productId:        string;
  productName:      string;
  productCategory:  string;
  approvedPriceUsd: number;
  currency:         string;
  validFrom:        string | null;
  validTo:          string | null;
  immutable:        true;
}

export interface PriceProposal {
  id:              string;
  cd:              string;   // "PP-0001" — exibir ao utilizador
  productId:       string;
  createdById:     string;
  approvedById:    string | null;
  status:          PriceProposalStatus;
  proposedPrice:   string;   // Decimal como string — usar parseFloat()
  currency:        string;
  justification:   string | null;
  rejectionReason: string | null;
  snapshot:        PriceProposalSnapshot | null;  // null até aprovação
  submittedAt:     string | null;
  approvedAt:      string | null;
  validFrom:       string | null;
  validTo:         string | null;
  createdAt:       string;
  updatedAt:       string;
  product?:        { id: string; name: string; category: string };
}

export interface OrderLine {
  id:              string;
  cd:              string;   // "OL-0001" — exibir ao utilizador
  orderId:         string;
  productId:       string;
  priceProposalId: string;
  qty:             number;
  unitPrice:       string;   // Decimal como string
  taxRate:         string | null;
  taxAmount:       string | null;
  lineTotal:       string | null;
  snapshotRef:     PriceProposalSnapshot | null;
  product?:        { id: string; name: string };
  priceProposal?:  PriceProposal;
}

export interface Order {
  id:            string;
  cd:            string;   // "ORD-0001" — exibir ao utilizador
  buyerId:       string;
  companyId:     string;
  status:        OrderStatus;
  totalAmount:   string | null;   // Decimal como string
  taxAmount:     string | null;
  netAmount:     string | null;
  currency:      string;
  blockedReason: string | null;
  blockedById:   string | null;
  blockedAt:     string | null;
  paidAt:        string | null;
  createdAt:     string;
  updatedAt:     string;
  buyer?:        { id: string; fullName: string };
  company?:      { id: string; name: string; country: CompanyCountry };
  lines?:        OrderLine[];
}

export interface TrackingEvent {
  timestamp: string;
  location:  string;
  status:    ShipmentStatus;
  updatedBy: string;
  notes:     string | null;
}

export interface Shipment {
  id:             string;
  cd:             string;   // "SHP-0001" — exibir ao utilizador
  orderId:        string;
  operatorId:     string;
  status:         ShipmentStatus;
  origin:         string;
  destination:    string;
  eta:            string | null;
  lastLocation:   string | null;
  trackingEvents: TrackingEvent[];
  holdReason:     string | null;
  createdAt:      string;
  updatedAt:      string;
  operator?:      { id: string; fullName: string };
  customsDispatch?: CustomsDispatch | null;
}

export interface CustomsDispatch {
  id:              string;
  cd:              string;   // "DSP-0001" — exibir ao utilizador
  shipmentId:      string;
  dispatcherId:    string;
  status:          'pending' | 'approved' | 'rejected' | 'held';
  notes:           string | null;
  rejectionReason: string | null;
  validatedAt:     string | null;
}

export interface Tax {
  id:            string;
  cd:            string;   // "TAX-0001" — exibir ao utilizador
  name:          string;
  category:      string;
  country:       string;
  rate:          string;   // Decimal como string — ex: "0.1400"
  effectiveFrom: string;
  effectiveTo:   string | null;
  isActive:      boolean;
  createdAt:     string;
}

export interface AuditLog {
  id:         string;
  cd:         string;   // "LOG-0001" — exibir ao utilizador
  userId:     string;
  role:       string;
  action:     string;
  entity:     string;
  entityId:   string;
  beforeJson: string | null;   // JSON stringificado
  afterJson:  string | null;
  meta:       string | null;
  createdAt:  string;
}

// ── Helpers ────────────────────────────────────────────────────────────

// Decimais chegam como string — usar sempre este helper
export function toNumber(value: string | null): number {
  return value ? parseFloat(value) : 0;
}

// Formatar taxa fiscal
export function formatRate(rate: string): string {
  return `${(parseFloat(rate) * 100).toFixed(0)}%`;
}
```

---

## 5. Tratamento de Erros

### Formato de erro da API

```json
{
  "statusCode": 400,
  "message": "Apenas produtos em draft podem ser editados",
  "error": "Bad Request"
}
```

Nalguns casos `message` é um array de strings (erros de validação):
```json
{
  "statusCode": 400,
  "message": ["email must be an email", "password must be longer than or equal to 6 characters"],
  "error": "Bad Request"
}
```

### Handler centralizado

```typescript
// src/lib/error-handler.ts
export interface ApiError {
  statusCode: number;
  message:    string | string[];
  error:      string;
}

export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiError;
    if (!data) return 'Erro de ligação ao servidor';
    if (Array.isArray(data.message)) return data.message.join('. ');
    return data.message ?? 'Erro desconhecido';
  }
  return 'Erro inesperado';
}
```

### Tabela de status HTTP

| Status | Significado | Acção no UI |
|--------|-------------|-------------|
| `200` | Sucesso (acção realizada) | Mostrar feedback de sucesso |
| `201` | Criado com sucesso | Mostrar feedback + redirecionar/actualizar |
| `400` | Dados inválidos ou estado incorrecto | Mostrar `message` ao utilizador |
| `401` | Token expirado ou inválido | Redirecionar para login (automático) |
| `403` | Sem permissão (role errado) | Mostrar "Sem permissão" |
| `404` | Recurso não encontrado | Mostrar página de erro |
| `500` | Erro interno do servidor | Mostrar mensagem genérica |

---

## 6. Ecrãs por Role

### Role: `state` — Estado / Autoridade

Tem acesso a **tudo**. É o role mais poderoso.

```
Menu:
├── Empresas          → /companies (listar + aprovar/rejeitar)
├── Produtos          → /products (listar + aprovar publicação)
├── Price Proposals   → /price-proposals (listar + aprovar)
├── Pedidos           → /orders (listar + bloquear/cancelar)
├── Embarques         → /shipments (listar + reter)
├── Impostos          → /taxes (listar + criar regras)
└── Audit Log         → /logs (só leitura)
```

**Acções disponíveis:**
- Aprovar/rejeitar licença de empresa
- Aprovar/rejeitar publicação de produto
- Aprovar/rejeitar price proposal (gera snapshot imutável)
- Bloquear/cancelar pedidos
- Reter embarques
- Criar regras fiscais
- Ler audit log completo

---

### Role: `staff` — Técnico de Validação

```
Menu:
├── Empresas     → /companies (listar + validar documentação)
└── Pedidos      → /orders (só visualização)
```

**Acções disponíveis:**
- Validar documentação de empresa (aprovação ou devolução)
- Encaminhar empresa ao STATE

---

### Role: `specialist` — Especialista de Preços

```
Menu:
└── Price Proposals  → /price-proposals (criar + gerir as suas)
```

**Acções disponíveis:**
- Criar price proposal (draft)
- Editar proposal em draft ou rejected
- Submeter proposal ao STATE
- **Não pode editar proposals aprovadas** (bloqueado no UI)

---

### Role: `producer` — Produtor

```
Menu:
└── Produtos  → /products (criar + gerir os seus)
```

**Acções disponíveis:**
- Criar produto (fica em draft)
- Editar produto em draft
- Solicitar publicação (draft → pending_review)
- **Não pode editar após solicitar publicação**

---

### Role: `buyer` — Comprador

```
Menu:
└── Pedidos  → /orders/my-orders (os seus pedidos)
```

**Acções disponíveis:**
- Criar pedido com linhas de produtos
- Pagar pedido (calcula imposto automaticamente do snapshot)
- Ver histórico dos seus pedidos

---

### Role: `operator` — Operador Logístico

```
Menu:
└── Embarques  → /shipments (criar + actualizar tracking)
```

**Acções disponíveis:**
- Criar embarque para um pedido pago
- Actualizar localização e status (tracking)
- Ver histórico de eventos do embarque

---

### Role: `customs` — Alfândega

```
Menu:
└── Embarques  → /shipments (validar)
```

**Acções disponíveis:**
- Aprovar embarque
- Rejeitar embarque com motivo
- Reter embarque com motivo

---

## 7. Todos os Endpoints

> **Campo `cd` em todas as respostas**  
> Todas as entidades devolvidas pela API incluem `cd: string` com o código completo.  
> Usar `entity.cd` para exibição — nunca `entity.id`.  
> Usar `entity.id` (UUID) nas chamadas à API (`/orders/:id`).

### Auth

```typescript
// POST /auth/login
const login = (email: string, password: string) =>
  api.post<{ access_token: string; user: AuthUser }>('/auth/login', { email, password });

// Resposta: user.cd = "USR-0001"
```

---

### Companies

```typescript
// Criar empresa (público — não precisa de token)
const createCompany = (data: {
  name:         string;
  country:      CompanyCountry;
  contactEmail: string;
  contactPhone?: string;
  address?:     string;
}) => api.post<Company>('/companies', data);

// Listar todas [state, staff]
const getCompanies = () =>
  api.get<Company[]>('/companies');

// Ver empresa (autenticado)
const getCompany = (id: string) =>
  api.get<Company>(`/companies/${id}`);

// STAFF: validar documentação → 200
const validateDocs = (id: string, valid: boolean, notes?: string) =>
  api.post<Company>(`/companies/${id}/validate-documentation`, { valid, notes });

// STAFF: encaminhar ao STATE → 200
const forwardToState = (id: string) =>
  api.post<Company>(`/companies/${id}/forward-to-state`);

// STATE: aprovar licença → 200
const approveLicense = (id: string, licenseNumber: string, licenseExpiresAt: string) =>
  api.post<Company>(`/companies/${id}/approve-license`, { licenseNumber, licenseExpiresAt });

// STATE: rejeitar licença → 200
const rejectLicense = (id: string, reason: string) =>
  api.post<Company>(`/companies/${id}/reject-license`, { reason });

// STATE: suspender empresa → 200
const suspendCompany = (id: string, reason: string) =>
  api.post<Company>(`/companies/${id}/suspend`, { reason });
```

---

### Products

```typescript
// Listar (autenticado)
const getProducts = () =>
  api.get<Product[]>('/products');

// Ver produto (autenticado)
const getProduct = (id: string) =>
  api.get<Product>(`/products/${id}`);

// PRODUCER: criar produto → 201
const createProduct = (data: {
  name:        string;
  description?: string;
  category:    string;
  companyId:   string;
}) => api.post<Product>('/products', data);

// PRODUCER: editar produto (só draft) → 200
const updateProduct = (id: string, data: {
  name?:        string;
  description?: string;
  category?:    string;
}) => api.put<Product>(`/products/${id}`, data);

// PRODUCER: solicitar publicação → 200
const requestPublication = (id: string) =>
  api.post<Product>(`/products/${id}/request-publication`);

// STATE: aprovar publicação → 200
const approvePublication = (id: string) =>
  api.post<Product>(`/products/${id}/approve-publication`);

// STATE: rejeitar publicação → 200
const rejectPublication = (id: string, reason: string) =>
  api.post<Product>(`/products/${id}/reject-publication`, { reason });

// STATE: suspender produto → 200
const suspendProduct = (id: string) =>
  api.post<Product>(`/products/${id}/suspend`);
```

---

### Price Proposals

```typescript
// Listar [state, specialist]
const getPriceProposals = () =>
  api.get<PriceProposal[]>('/price-proposals');

// Ver proposta (autenticado)
const getPriceProposal = (id: string) =>
  api.get<PriceProposal>(`/price-proposals/${id}`);

// SPECIALIST: criar proposta → 201
const createPriceProposal = (data: {
  productId:     string;
  proposedPrice: number;
  currency?:     string;
  justification?: string;
  validFrom?:    string;  // ISO 8601
  validTo?:      string;
}) => api.post<PriceProposal>('/price-proposals', data);

// SPECIALIST: editar (só draft/rejected) → 200
const updatePriceProposal = (id: string, data: {
  proposedPrice?: number;
  justification?: string;
  validFrom?:     string;
  validTo?:       string;
}) => api.put<PriceProposal>(`/price-proposals/${id}`, data);

// SPECIALIST: submeter ao STATE → 200
const submitPriceProposal = (id: string) =>
  api.post<PriceProposal>(`/price-proposals/${id}/submit`);

// STATE: aprovar (gera snapshot imutável) → 200
const approvePriceProposal = (id: string) =>
  api.post<PriceProposal>(`/price-proposals/${id}/approve`);

// STATE: rejeitar → 200
const rejectPriceProposal = (id: string, reason: string) =>
  api.post<PriceProposal>(`/price-proposals/${id}/reject`, { reason });
```

---

### Taxes

```typescript
// Listar todas (autenticado)
const getTaxes = () =>
  api.get<Tax[]>('/taxes');

// Listar por país (autenticado)
const getTaxesByCountry = (country: CompanyCountry | 'all') =>
  api.get<Tax[]>(`/taxes/country/${country}`);

// STATE: criar regra fiscal → 201
const createTax = (data: {
  name:          string;
  category:      string;
  country:       string;
  rate:          number;   // 0.14 = 14%
  effectiveFrom: string;
  effectiveTo?:  string;
  isActive?:     boolean;
}) => api.post<Tax>('/taxes', data);
```

---

### Orders

```typescript
// Listar todos [state, staff]
const getOrders = () =>
  api.get<Order[]>('/orders');

// BUYER: os seus pedidos
const getMyOrders = () =>
  api.get<Order[]>('/orders/my-orders');

// Ver pedido (autenticado)
const getOrder = (id: string) =>
  api.get<Order>(`/orders/${id}`);

// BUYER: criar pedido → 201
const createOrder = (data: {
  companyId: string;
  lines: Array<{
    productId:       string;
    priceProposalId: string;
    qty:             number;
  }>;
}) => api.post<Order>('/orders', data);

// BUYER: pagar pedido (calcula imposto automaticamente) → 200
const payOrder = (id: string) =>
  api.post<Order>(`/orders/${id}/pay`);

// STATE: bloquear pedido → 200
const blockOrder = (id: string, reason: string) =>
  api.post<Order>(`/orders/${id}/block`, { reason });

// STATE: cancelar pedido → 200
const cancelOrder = (id: string) =>
  api.post<Order>(`/orders/${id}/cancel`);
```

---

### Shipments

```typescript
// Listar todos [state, staff]
const getShipments = () =>
  api.get<Shipment[]>('/shipments');

// Ver embarque (autenticado)
const getShipment = (id: string) =>
  api.get<Shipment>(`/shipments/${id}`);

// OPERATOR: criar embarque → 201
const createShipment = (data: {
  orderId:     string;
  origin:      string;
  destination: string;
  eta?:        string;
}) => api.post<Shipment>('/shipments', data);

// OPERATOR: actualizar tracking (append-only) → 200
const updateTracking = (id: string, data: {
  location: string;
  status:   ShipmentStatus;
  notes?:   string;
}) => api.put<Shipment>(`/shipments/${id}/tracking`, data);

// CUSTOMS: aprovar embarque → 200
const approveShipment = (id: string, notes?: string) =>
  api.post<CustomsDispatch>(`/shipments/${id}/approve`, { notes });

// CUSTOMS: rejeitar embarque → 200
const rejectShipment = (id: string, reason: string) =>
  api.post<CustomsDispatch>(`/shipments/${id}/reject`, { reason });

// CUSTOMS / STATE: reter embarque → 200
const holdShipment = (id: string, reason: string) =>
  api.post<Shipment>(`/shipments/${id}/hold`, { reason });
```

---

### Audit Logs

```typescript
// STATE: listar logs (com filtros opcionais)
const getAuditLogs = (filters?: { entity?: string; entityId?: string }) =>
  api.get<AuditLog[]>('/logs', { params: filters });

// STATE: ver log específico
const getAuditLog = (id: string) =>
  api.get<AuditLog>(`/logs/${id}`);

// Parsear beforeJson / afterJson
const parseLog = (log: AuditLog) => ({
  ...log,
  before: log.beforeJson ? JSON.parse(log.beforeJson) : null,
  after:  log.afterJson  ? JSON.parse(log.afterJson)  : null,
});
```

---

## 8. Fluxos de Negócio Completos

### Fluxo 1 — Empresa: Registo → Licença Activa

```
Qualquer utilizador       POST /companies
                               ↓ licenseStatus: "pending"

STAFF                     POST /companies/:id/validate-documentation { valid: true }
                               ↓ licenseStatus: "under_review"

STATE                     POST /companies/:id/approve-license { licenseNumber, licenseExpiresAt }
                               ↓ licenseStatus: "active"
```

**O que o UI deve mostrar:**

| Estado | Badge | Botões disponíveis |
|--------|-------|--------------------|
| `pending` | 🟡 Pendente | STAFF: "Validar Documentação" |
| `under_review` | 🔵 Em Revisão | STATE: "Aprovar Licença" / "Rejeitar" |
| `active` | 🟢 Activa | STATE: "Suspender" |
| `rejected` | 🔴 Rejeitada | — |
| `suspended` | ⛔ Suspensa | — |

---

### Fluxo 2 — Produto: Draft → Publicado

```
PRODUCER     POST /products                          → status: "draft"
PRODUCER     POST /products/:id/request-publication  → status: "pending_review"
STATE        POST /products/:id/approve-publication  → status: "published_official"
```

**Regra de edição:**
- `draft` → PRODUCER pode editar (`PUT /products/:id`)
- `pending_review` ou superior → **botão de editar desaparece**

---

### Fluxo 3 — Price Proposal: Draft → Aprovada com Snapshot

```
SPECIALIST   POST /price-proposals                  → status: "draft"
SPECIALIST   POST /price-proposals/:id/submit       → status: "submitted"
STATE        POST /price-proposals/:id/approve      → status: "approved" + snapshot gerado
```

**Regra crítica para o UI:**
```typescript
// Desactivar botão de editar quando aprovada
const canEdit = proposal.status === 'draft' || proposal.status === 'rejected';
// <Button disabled={!canEdit}>Editar</Button>
```

**Quando aprovada, o snapshot contém:**
```typescript
proposal.snapshot?.approvedPriceUsd  // preço aprovado em USD
proposal.snapshot?.immutable         // true — nunca muda
```

---

### Fluxo 4 — Pedido: Criar → Pagar

```
BUYER        POST /orders { companyId, lines: [...] }   → status: "draft"
BUYER        POST /orders/:id/pay                        → status: "paid"
                                                           totalAmount calculado
                                                           taxAmount calculado (imposto do país)
                                                           netAmount calculado
```

**Exibir valores após pagamento:**
```typescript
// Decimais chegam como string — usar toNumber()
const net   = toNumber(order.netAmount);   // ex: 450.00
const tax   = toNumber(order.taxAmount);   // ex: 63.00 (14% Angola)
const total = toNumber(order.totalAmount); // ex: 513.00
```

**Estados do pedido:**

| Estado | Badge | Botões BUYER | Botões STATE |
|--------|-------|-------------|-------------|
| `draft` | 🟡 Rascunho | "Pagar" | — |
| `paid` | 🟢 Pago | — | "Bloquear" |
| `blocked` | 🔴 Bloqueado | — | "Cancelar" |
| `cancelled` | ⛔ Cancelado | — | — |

---

### Fluxo 5 — Embarque: Criado → Aprovado pela Alfândega

```
OPERATOR     POST /shipments { orderId, origin, destination }  → status: "created"
OPERATOR     PUT  /shipments/:id/tracking { location, status } → tracking actualizado
CUSTOMS      POST /shipments/:id/approve { notes }             → status: "customs_approved"
```

**Tracking — array append-only:**
```typescript
// Cada PUT /tracking ACRESCENTA um evento — nunca apaga
shipment.trackingEvents.forEach(event => {
  // { timestamp, location, status, notes }
});
```

**Estados do embarque:**

| Estado | Badge |
|--------|-------|
| `created` | 📦 Criado |
| `in_transit` | 🚛 Em Trânsito |
| `at_border` | 🛂 Na Fronteira |
| `customs_approved` | ✅ Aprovado pela Alfândega |
| `customs_rejected` | ❌ Rejeitado pela Alfândega |
| `held` | ⏸ Retido |
| `delivered` | 🎯 Entregue |

---

## 9. Regras de UI Críticas

### 0. Campo `cd` — Regra absoluta

Todas as entidades têm `cd: string` com o código completo (`"ORD-0001"`, `"EMP-0001"`, etc.).

```typescript
// ERRADO — nunca mostrar UUID
<td>{{ order.id }}</td>           // → "a522e4d3-38bf..."
<h2>Pedido #{{ order.id }}</h2>   // → "Pedido #a522e4d3..."

// CORRECTO — usar cd directamente
<td>{{ order.cd }}</td>           // → "ORD-0001"
<h2>Pedido {{ order.cd }}</h2>    // → "Pedido ORD-0001"
```

- `cd` — exibir ao utilizador (tabelas, títulos, breadcrumbs)
- `id` — usar nas chamadas à API (`/orders/:id`)
- Nunca enviar `cd` em POST ou PUT — é gerado pelo backend

---

### 1. Price Proposal aprovada é IMUTÁVEL

```typescript
// Nunca mostrar botão de editar quando approved
{proposal.status !== 'approved' && proposal.status !== 'submitted' && (
  <Button onClick={() => editProposal(proposal.id)}>Editar</Button>
)}
```

### 2. Produto só editável em draft

```typescript
{product.status === 'draft' && (
  <Button onClick={() => editProduct(product.id)}>Editar</Button>
)}
```

### 3. Preço do pedido vem SEMPRE do snapshot

O preço exibido numa order line vem de `line.snapshotRef.approvedPriceUsd` — **nunca do produto directamente**. Se `snapshotRef` for null, o pedido ainda não foi pago.

```typescript
const displayPrice = line.snapshotRef
  ? line.snapshotRef.approvedPriceUsd
  : parseFloat(line.unitPrice);
```

### 4. Tracking só acrescenta — nunca edita

O array `trackingEvents` é append-only. O UI só deve permitir adicionar novos eventos, nunca editar os existentes.

### 5. Audit log só leitura

Não existe `POST /logs`, `PUT /logs`, `DELETE /logs`. O UI deve mostrar apenas uma tabela de leitura.

### 6. Verificar role antes de mostrar botões de acção

```typescript
const user = getCurrentUser();

// Exemplo: botão de aprovar licença só para STATE
{user?.role === 'state' && company.licenseStatus === 'under_review' && (
  <Button onClick={() => approve(company.id)}>Aprovar Licença</Button>
)}
```

### 7. Decimais chegam como string

Todos os campos monetários (`totalAmount`, `taxAmount`, `netAmount`, `proposedPrice`, `rate`) chegam como **string** no JSON. Usar sempre `parseFloat()` antes de cálculos ou formatação.

```typescript
// ERRADO
<span>{order.totalAmount}</span>

// CORRECTO
<span>{parseFloat(order.totalAmount ?? '0').toFixed(2)} USD</span>
```

---

## 10. Credenciais de Desenvolvimento

**Password de todos os utilizadores:** `Lobito@Dev2024!`

| Role | Email | O que testar |
|------|-------|-------------|
| `state` | state@lobito.gov | Tudo |
| `staff` | staff@lobito.gov | Validar documentação de empresas |
| `specialist` | specialist@lobito.gov | Criar e submeter price proposals |
| `producer` | producer@lobito.biz | Criar produtos |
| `buyer` | buyer@lobito.biz | Criar e pagar pedidos |
| `operator` | operator@lobito.biz | Criar embarques e tracking |
| `customs` | customs@lobito.gov | Aprovar/rejeitar embarques |

### Testar o fluxo completo (24 passos)

Para ver dados reais em todos os ecrãs, executar o script:
```bash
./test/e2e-flow.sh
```
Isto cria uma empresa, produto, price proposal, pedido pago e embarque aprovado — tudo com dados reais na base de dados.

### Swagger UI

Disponível em `http://localhost:3000/docs` para testar qualquer endpoint manualmente.

1. Fazer `POST /auth/login` no Swagger
2. Copiar o `access_token` da resposta
3. Clicar **Authorize** (cadeado) e colar o token
4. Todos os endpoints ficam autenticados

---

## Limitações do MVP a comunicar ao Backend

Antes de construir estas funcionalidades no Frontend, confirmar com o Backend quando estarão prontas:

| Funcionalidade | Estado |
|---------------|--------|
| Paginação nas listagens | ⚠️ Pós-MVP |
| Filtros e pesquisa | ⚠️ Pós-MVP |
| Upload de documentos | ⚠️ Pós-MVP |
| Refresh token | ⚠️ Pós-MVP |
| Notificações em tempo real | ⚠️ Pós-MVP |

**Para o MVP:** construir as listas sem paginação. Com os dados de seed actuais (poucos registos), funciona sem problemas.

---

*Corredor do Lobito — Frontend MVP Guide v1.0*  
*Baseado no Backend MVP: NestJS 11 · Prisma 6 · PostgreSQL · JWT*
