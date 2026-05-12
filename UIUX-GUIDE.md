# Corredor do Lobito — Especificação UI/UX Frontend MVP
> **Framework:** Angular Material  
> **Identidade:** Plataforma Governamental Transfronteiriça  
> **Base:** Backend MVP v1.0 — 7 roles · 37 endpoints · 6 domínios  
> **Este documento define cada ecrã, fluxo e elemento visual do Frontend MVP.**

---

## Índice

1. [Sistema de Design — Identidade Visual Governamental](#1-sistema-de-design)
2. [Estrutura Base da Aplicação](#2-estrutura-base-da-aplicação)
3. [Ecrã de Login](#3-ecrã-de-login)
4. [Dashboards por Role](#4-dashboards-por-role)
5. [Módulo Empresas](#5-módulo-empresas)
6. [Módulo Produtos](#6-módulo-produtos)
7. [Módulo Price Proposals](#7-módulo-price-proposals)
8. [Módulo Pedidos](#8-módulo-pedidos)
9. [Módulo Impostos](#9-módulo-impostos)
10. [Módulo Embarques](#10-módulo-embarques)
11. [Módulo Audit Log](#11-módulo-audit-log)
12. [Componentes Partilhados](#12-componentes-partilhados)
13. [Fluxos de Navegação Completos](#13-fluxos-de-navegação-completos)

---

## 1. Sistema de Design

> **REGRA DE CORES — SEM EXCEPÇÕES**  
> O projecto usa **apenas PRETO e BRANCO**.  
> Não usar azul, verde, vermelho, laranja, dourado ou qualquer outra cor.  
> Toda a hierarquia visual é feita com peso tipográfico, bordas e escalas de cinzento.

---

### 1.1 Paleta de Cores — Preto e Branco

```scss
// theme.scss — Paleta Governamental Minimalista

$black       : #1A1A1A;   // Preto principal — topbar, botões, item activo
$white       : #FFFFFF;   // Branco — sidebar, cards, fundo de inputs
$gray-light  : #F5F5F5;   // Cinza muito claro — fundo da content area
$gray-mid    : #9E9E9E;   // Cinza médio — texto secundário, placeholders
$gray-border : #E0E0E0;   // Cinza claro — bordas, separadores, dividers
$gray-hover  : #F0F0F0;   // Cinza hover — fundo de itens em hover
$gray-dark   : #424242;   // Cinza escuro — texto de subtítulos

// NÃO USAR: azul, verde, vermelho, laranja, amarelo, dourado
```

**Mapa de aplicação:**

| Elemento | Cor |
|---------|-----|
| Topbar (fundo) | `$black` #1A1A1A |
| Topbar (ícones/texto) | `$white` #FFFFFF |
| Sidebar (fundo) | `$white` #FFFFFF |
| Item activo sidebar | fundo `$black` + texto `$white` |
| Item hover sidebar | fundo `$gray-hover` |
| Content area (fundo) | `$gray-light` #F5F5F5 |
| Cards (fundo) | `$white` #FFFFFF |
| Bordas e separadores | `$gray-border` #E0E0E0 |
| Texto principal | `$black` #1A1A1A |
| Texto secundário | `$gray-mid` #9E9E9E |
| Botões (todos) | fundo `$black` + texto `$white` |
| Botão outline | borda `$black` + texto `$black` + fundo transparente |

---

### 1.2 Tipografia

```scss
font-family: 'Roboto', sans-serif;   // Angular Material default — manter

// Hierarquia — diferenciação só por peso e tamanho, sem cor
h1  : 32px · weight 300 · #1A1A1A   — Título de módulo
h2  : 24px · weight 400 · #1A1A1A   — Subtítulo de secção
h3  : 18px · weight 500 · #1A1A1A   — Título de card
p   : 14px · weight 400 · #1A1A1A   — Texto corrente
small: 12px · weight 400 · #9E9E9E  — Labels, breadcrumb, metadata
```

---

### 1.3 Componentes Angular Material

| Componente | Quando usar |
|-----------|------------|
| `mat-toolbar` | Topbar — sempre presente após login |
| `mat-sidenav` | Sidebar — sempre presente após login |
| `mat-card` | Container de conteúdo principal |
| `mat-table` | Listagens de entidades |
| `mat-chip` | Status badges — preto/branco/cinza apenas |
| `mat-dialog` | Confirmações e formulários modais |
| `mat-stepper` | Fluxos multi-etapa (criar pedido) |
| `mat-expansion-panel` | Secções colapsáveis (tracking, audit) |
| `mat-progress-bar` | Loading — cor preta |
| `mat-snackbar` | Feedback — fundo preto, texto branco |
| `mat-divider` | Separadores — cinza claro |
| `mat-tooltip` | Info em hover |

---

### 1.4 Status Chips — Preto e Branco

Todos os chips usam **apenas preto, branco e cinza**.  
A diferenciação é feita pelo **estilo** (sólido vs outline) e **texto**, não pela cor.

```scss
// Chip sólido — estado final positivo (active, paid, approved, delivered)
.chip-solid {
  background: #1A1A1A;
  color:      #FFFFFF;
  border:     none;
}

// Chip outline — estado intermédio (pending, draft, submitted, in_transit)
.chip-outline {
  background: transparent;
  color:      #1A1A1A;
  border:     1.5px solid #1A1A1A;
}

// Chip cinza — estado inactivo ou final negativo (rejected, cancelled, suspended)
.chip-gray {
  background: #E0E0E0;
  color:      #424242;
  border:     none;
}
```

**Aplicação por estado:**

```
licenseStatus:
  pending       → chip-outline  "Pendente"
  under_review  → chip-outline  "Em Revisão"
  active        → chip-solid    "Activa"
  rejected      → chip-gray     "Rejeitada"
  suspended     → chip-gray     "Suspensa"

productStatus:
  draft               → chip-outline  "Rascunho"
  pending_review      → chip-outline  "Em Revisão"
  published_official  → chip-solid    "Publicado"
  rejected            → chip-gray     "Rejeitado"
  suspended           → chip-gray     "Suspenso"

priceProposalStatus:
  draft      → chip-outline  "Rascunho"
  submitted  → chip-outline  "Submetido"
  approved   → chip-solid    "Aprovado"
  rejected   → chip-gray     "Rejeitado"

orderStatus:
  draft      → chip-outline  "Rascunho"
  paid       → chip-solid    "Pago"
  blocked    → chip-gray     "Bloqueado"
  cancelled  → chip-gray     "Cancelado"

shipmentStatus:
  created           → chip-outline  "Criado"
  in_transit        → chip-outline  "Em Trânsito"
  at_border         → chip-outline  "Na Fronteira"
  customs_approved  → chip-solid    "Aprovado Alfândega"
  customs_rejected  → chip-gray     "Rejeitado Alfândega"
  held              → chip-gray     "Retido"
  delivered         → chip-solid    "Entregue"
```

---

### 1.5 Botões — Todos Pretos

Todos os botões têm **fundo preto e texto branco**.  
A distinção entre acções é feita pelo **estilo** (sólido vs outline), não pela cor.

```scss
// Botão primário — acção principal, criar, confirmar, aprovar
.btn-primary {
  background-color: #1A1A1A;
  color:            #FFFFFF;
  border:           none;
  // mat-raised-button — usar em todas as acções principais
}

// Botão outline — acção secundária, editar, ver detalhes
.btn-outline {
  background-color: transparent;
  color:            #1A1A1A;
  border:           1.5px solid #1A1A1A;
  // mat-stroked-button
}

// Botão ghost — cancelar, voltar, fechar
.btn-ghost {
  background-color: transparent;
  color:            #1A1A1A;
  border:           none;
  // mat-button
}
```

**Aplicação:**

| Acção | Estilo | Exemplo |
|-------|--------|---------|
| Criar, submeter, pagar | `btn-primary` (preto sólido) | "Criar Empresa", "Pagar Pedido" |
| Aprovar, publicar | `btn-primary` (preto sólido) | "Aprovar Licença", "Publicar" |
| Rejeitar, suspender, bloquear | `btn-primary` (preto sólido) | "Rejeitar", "Suspender" |
| Editar, ver detalhes | `btn-outline` (outline preto) | "Editar", "Ver" |
| Cancelar, voltar | `btn-ghost` (ghost) | "Cancelar", "Voltar" |

> ⚠️ **Rejeitar e Suspender também são botões pretos** — a diferença é que sempre abrem um `mat-dialog` de confirmação antes de executar a acção.

---

## 2. Estrutura Base da Aplicação

> ⚠️ **REGRA OBRIGATÓRIA — SEM EXCEPÇÕES**  
> **Todos os ecrãs após o login DEVEM ter Topbar + Sidebar.**  
> Apenas o ecrã de Login não tem nenhuma das duas.  
> Qualquer ecrã sem estas estruturas está errado.

---

### 2.1 Layout Geral — Padrão Visual

```
┌─────────────────────────────────────────────────────────────┐
│  TOPBAR — SIMPLES — fundo PRETO (#1A1A1A) — altura 64px     │
│  [☰]                                    [⋮⋮⋮]   [👤]       │
└──────────────┬──────────────────────────────────────────────┘
│              │                                               │
│   SIDEBAR    │   CONTENT AREA                               │
│   BRANCA     │   fundo #F5F6FA                              │
│   280px      │                                               │
│              │   Ícone  Título da Página                    │
│              │   Você está em: X > Y > Z                    │
│              │                                               │
│              │   ┌─────────────────────────────────────┐    │
│              │   │  mat-card — conteúdo principal      │    │
│              │   └─────────────────────────────────────┘    │
│              │                                               │
```

---

### 2.2 Topbar — Simples

A topbar é **igual para todos os utilizadores e todos os ecrãs**.  
Não tem nome do projecto, não tem breadcrumb, não tem título — é apenas navegação.

```
┌─────────────────────────────────────────────────────────────┐
│  #1A1A1A                                                    │
│                                                             │
│  [☰]                                    [⋮⋮⋮]    [👤]     │
│   │                                       │         │       │
│   toggle sidebar                    apps icon   avatar      │
│   (mat-icon-button)              (opcional)   (mat-menu)    │
└─────────────────────────────────────────────────────────────┘
```

**Avatar `[👤]` — clique abre mat-menu com:**
```
┌──────────────────────┐
│  State Authority     │  ← fullName do utilizador
│  state               │  ← role
│  ──────────────────  │
│  Terminar Sessão     │  ← logout
└──────────────────────┘
```

```scss
mat-toolbar {
  background-color: #1A1A1A;
  color:            #FFFFFF;
  height:           64px;
  position:         fixed;
  z-index:          1000;
}
```

---

### 2.3 Sidebar — Estrutura Fixa por Perfil

A sidebar é **branca, fixa à esquerda, 280px**, com três zonas:

```
┌──────────────────────────────┐
│                              │
│   ZONA 1 — PERFIL            │
│   Avatar + ícones de acção   │
│                              │
├──────────────────────────────┤
│   mat-divider                │
│                              │
│   ZONA 2 — MENU PRINCIPAL    │
│   Items e grupos colapsáveis │
│   específicos do role        │
│                              │
└──────────────────────────────┘
```

**ZONA 1 — Perfil (igual para todos os roles):**
```
┌──────────────────────────────┐
│                              │
│        [👤 Avatar 72px]      │  ← inicial do nome ou ícone
│                              │
│   [🏠 home] [👤 perfil] [⏻] │  ← ícones centrados
│                              │
│   ⓘ home   → Dashboard       │
│   ⓘ perfil → (não no MVP)    │
│   ⓘ ⏻      → Logout          │
└──────────────────────────────┘
```

**Estilo dos itens de menu:**
```scss
// Grupo colapsável (título)
.nav-group-title {
  padding:     12px 16px;
  font-size:   12px;
  font-weight: 600;
  color:       #757575;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  display:     flex;
  justify-content: space-between;
  cursor:      pointer;
}

// Item de navegação
.nav-item {
  padding:    10px 16px 10px 24px;
  font-size:  14px;
  color:      #1A1A1A;
  display:    flex;
  align-items: center;
  gap:        10px;
  cursor:     pointer;
}

// Item activo — fundo PRETO + texto BRANCO
.nav-item.active {
  background: #1A1A1A;
  color:      #FFFFFF;
  font-weight: 500;
}

// Hover
.nav-item:hover:not(.active) {
  background: #F0F0F0;
}
```

---

### 2.4 Sidebar por Perfil de Utilizador

A **ZONA 2 (menu)** muda conforme o role do utilizador logado.  
Definição completa do que cada perfil vê na sidebar:

---

#### ZONA 2 — STATE `state@lobito.gov`
*Autoridade máxima — acesso total ao sistema*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │  ← item directo
│                              │
│  GESTÃO ▾                    │  ← grupo colapsável
│    📁 Empresas               │
│    📦 Produtos               │
│    💰 Price Proposals        │
│                              │
│  OPERAÇÕES ▾                 │  ← grupo colapsável
│    🛒 Pedidos                │
│    🚢 Embarques              │
│    🧾 Impostos               │
│                              │
│  > Audit Log                 │  ← item directo
│                              │
└──────────────────────────────┘
```

---

#### ZONA 2 — STAFF `staff@lobito.gov`
*Validação técnica de documentação de empresas*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │
│                              │
│  GESTÃO ▾                    │
│    📁 Empresas               │
│                              │
│  OPERAÇÕES ▾                 │
│    🛒 Pedidos                │
│      (só visualização)       │
│                              │
└──────────────────────────────┘
```

---

#### ZONA 2 — SPECIALIST `specialist@lobito.gov`
*Criação e submissão de price proposals*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │
│                              │
│  PREÇOS ▾                    │
│    💰 Price Proposals        │
│                              │
└──────────────────────────────┘
```

---

#### ZONA 2 — PRODUCER `producer@lobito.biz`
*Criação e publicação de produtos*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │
│                              │
│  CATÁLOGO ▾                  │
│    📦 Produtos               │
│                              │
└──────────────────────────────┘
```

---

#### ZONA 2 — BUYER `buyer@lobito.biz`
*Criação de pedidos e pagamento*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │
│                              │
│  COMPRAS ▾                   │
│    🛒 Os Meus Pedidos        │
│                              │
└──────────────────────────────┘
```

---

#### ZONA 2 — OPERATOR `operator@lobito.biz`
*Criação de embarques e actualização de tracking*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │
│                              │
│  LOGÍSTICA ▾                 │
│    🚢 Embarques              │
│                              │
└──────────────────────────────┘
```

---

#### ZONA 2 — CUSTOMS `customs@lobito.gov`
*Validação e aprovação de embarques na fronteira*

```
┌──────────────────────────────┐
│  [👤 Avatar]                 │
│  [🏠]  [👤]  [⏻]            │
├──────────────────────────────┤
│                              │
│  > Dashboard                 │
│                              │
│  ALFÂNDEGA ▾                 │
│    🚢 Embarques              │
│                              │
└──────────────────────────────┘
```

---

### 2.5 Comportamento do Item Activo na Sidebar

O item da página actual fica com **fundo preto e texto branco** — igual ao topbar.  
Este padrão aplica-se a itens directos e a sub-itens dentro de grupos.

```
Exemplo: utilizador STATE na página Empresas

  > Dashboard                ← normal (fundo branco)
  GESTÃO ▾                   ← grupo expandido
  ■ Empresas                 ← ACTIVO (fundo preto, texto branco)
    📦 Produtos              ← normal
    💰 Price Proposals       ← normal
  OPERAÇÕES ▾
    ...
```

---

### 2.6 Breadcrumb — Dentro do Content Area

Aparece no topo de cada ecrã, abaixo do título:

```
🏢 Empresas
Você está em: Dashboard > Empresas
```

```
📁 Lobito Trade Lda
Você está em: Dashboard > Empresas > Lobito Trade Lda
```

---

### 2.5 Breadcrumb — Obrigatório em todos os ecrãs

Abaixo do título de cada ecrã, mostrar sempre a navegação actual:

```
Você está em: Dashboard > Empresas > Lobito Trade Lda
              (link)      (link)      (texto — página actual)
```

```scss
.breadcrumb {
  font-size:  12px;
  color:      #757575;
  margin-top: 4px;
}
.breadcrumb a {
  color:           #1565C0;
  text-decoration: none;
}
.breadcrumb a:hover {
  text-decoration: underline;
}
```

---

### 2.6 Content Area — Área de Conteúdo

```scss
.content-area {
  margin-left:  280px;         // largura da sidebar
  margin-top:   64px;          // altura da topbar
  padding:      24px;
  background:   #F5F6FA;       // cinza muito claro
  min-height:   calc(100vh - 64px);
}
```

Dentro da content area, o conteúdo vai sempre dentro de `mat-card`:

```scss
mat-card {
  background:    #FFFFFF;
  border-radius: 8px;
  box-shadow:    0 1px 4px rgba(0,0,0,0.08);
  padding:       24px;
  margin-bottom: 16px;
}
```

---

## 3. Ecrã de Login

### 3.1 Layout

```
┌─────────────────────────────────────────────────────────────┐
│                    FUNDO $bg-light                          │
│                                                             │
│         ┌─────────────────────────────────────┐            │
│         │                                     │            │
│         │    [Logótipo — escudo/emblema]      │            │
│         │    CORREDOR DO LOBITO               │            │
│         │    Plataforma Governamental         │            │
│         │    de Comércio Transfronteiriço     │            │
│         │                                     │            │
│         │    ─────────────────────────────    │            │
│         │                                     │            │
│         │    Email                            │            │
│         │    [mat-form-field]                 │            │
│         │                                     │            │
│         │    Password                         │            │
│         │    [mat-form-field + eye toggle]    │            │
│         │                                     │            │
│         │    [ENTRAR]  mat-raised-button      │            │
│         │              color="primary"        │            │
│         │              full-width             │            │
│         │                                     │            │
│         │    ─────────────────────────────    │            │
│         │    Ecossistema Digital · Angola     │            │
│         └─────────────────────────────────────┘            │
│                   mat-card · shadow elevado                 │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Comportamento

- Card centrado horizontal e verticalmente (flex)
- Largura do card: 420px
- Ao submeter: mostrar `mat-progress-bar` no topo do card
- Erro 401: `mat-error` inline abaixo do campo password ("Credenciais inválidas")
- Erro 403: `mat-error` inline ("Utilizador bloqueado")
- Sucesso: redirecionar para `/dashboard` do role correspondente
- Não há "Esqueci a password" no MVP

### 3.3 Após Login — Redirect por Role

```
state      → /dashboard/state
staff      → /dashboard/staff
specialist → /dashboard/specialist
producer   → /dashboard/producer
buyer      → /dashboard/buyer
operator   → /dashboard/operator
customs    → /dashboard/customs
```

---

## 4. Dashboards por Role

### 4.1 Dashboard STATE

**URL:** `/dashboard/state`

```
┌─────────────────────────────────────────────────────────────┐
│  Bom dia, [Nome]. Autoridade Máxima — STATE                 │
│  [Data actual]                                              │
├──────────────┬──────────────┬──────────────┬───────────────┤
│ mat-card     │ mat-card     │ mat-card     │ mat-card      │
│              │              │              │               │
│  Empresas    │  Produtos    │  Propostas   │  Pedidos      │
│  Pendentes   │  Em Revisão  │  Submetidas  │  Bloqueados   │
│              │              │              │               │
│    [N]       │    [N]       │    [N]       │    [N]        │
│  [Ver todas] │  [Ver todas] │  [Ver todas] │  [Ver todos]  │
└──────────────┴──────────────┴──────────────┴───────────────┘

┌─────────────────────────────────────────────────────────────┐
│  Últimas acções no sistema (Audit Log — últimas 5)          │
│  mat-table                                                  │
│  Data | Acção | Entidade | Utilizador | [Ver Log Completo] │
└─────────────────────────────────────────────────────────────┘
```

**Cards de estatística:**
- Fundo `$surface`, borda esquerda 4px `$accent`
- Número em destaque: 48px, `$primary`
- Clicável — navega para a lista filtrada

---

### 4.2 Dashboard STAFF

**URL:** `/dashboard/staff`

```
┌──────────────┬──────────────┐
│ mat-card     │ mat-card     │
│              │              │
│  Empresas    │  Empresas    │
│  Pendentes   │  Em Revisão  │
│  (para val.) │ (aguardam    │
│              │  STATE)      │
│    [N]       │    [N]       │
│  [Validar]   │  [Ver]       │
└──────────────┴──────────────┘

┌─────────────────────────────┐
│  Acções recentes do STAFF   │
│  (últimas validações)       │
└─────────────────────────────┘
```

---

### 4.3 Dashboard SPECIALIST

**URL:** `/dashboard/specialist`

```
┌──────────────┬──────────────┬──────────────┐
│  As minhas   │  Submetidas  │  Aprovadas   │
│  Propostas   │  (aguardam   │  este mês    │
│  em Draft    │  STATE)      │              │
│    [N]       │    [N]       │    [N]       │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────┐
│  [+ Nova Price Proposal]    │
│  mat-raised-button primary  │
└─────────────────────────────┘
```

---

### 4.4 Dashboard PRODUCER

**URL:** `/dashboard/producer`

```
┌──────────────┬──────────────┬──────────────┐
│  Os meus     │  Em Revisão  │  Publicados  │
│  Produtos    │  (aguardam   │  (oficiais)  │
│  em Draft    │  STATE)      │              │
│    [N]       │    [N]       │    [N]       │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────┐
│  [+ Criar Produto]          │
└─────────────────────────────┘
```

---

### 4.5 Dashboard BUYER

**URL:** `/dashboard/buyer`

```
┌──────────────┬──────────────┬──────────────┐
│  Os meus     │  Pedidos     │  Pedidos     │
│  Pedidos     │  Pagos       │  Bloqueados  │
│  em Rascunho │              │              │
│    [N]       │    [N]       │    [N]       │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────┐
│  [+ Criar Pedido]           │
└─────────────────────────────┘
```

---

### 4.6 Dashboard OPERATOR

**URL:** `/dashboard/operator`

```
┌──────────────┬──────────────┬──────────────┐
│  Embarques   │  Em Trânsito │  Na Fronteira│
│  Criados     │              │  (at_border) │
│    [N]       │    [N]       │    [N]       │
└──────────────┴──────────────┴──────────────┘

┌─────────────────────────────┐
│  [+ Criar Embarque]         │
└─────────────────────────────┘
```

---

### 4.7 Dashboard CUSTOMS

**URL:** `/dashboard/customs`

```
┌──────────────┬──────────────┬──────────────┐
│  Embarques   │  Aprovados   │  Retidos     │
│  Pendentes   │  hoje        │              │
│  (na front.) │              │              │
│    [N]       │    [N]       │    [N]       │
└──────────────┴──────────────┴──────────────┘
```

---

## 5. Módulo Empresas

### 5.1 Lista de Empresas

**URL:** `/companies`  
**Acesso:** STATE, STAFF

```
┌─────────────────────────────────────────────────────────────┐
│  Empresas                                    [+ Registar]   │
│  Breadcrumb: Dashboard > Empresas                           │
├─────────────────────────────────────────────────────────────┤
│  Filtrar por estado: [Todos ▼] [Pendente] [Activa] [Rejeit] │
├──────┬──────────────┬──────────┬─────────────┬─────────────┤
│  ID  │  Nome        │  País    │  Estado      │  Acções     │
├──────┼──────────────┼──────────┼─────────────┼─────────────┤
│  ... │  Lobito Tr.  │  Angola  │ [Pendente]  │  [Ver]      │
│  ... │  Zamco Lda   │  Zâmbia  │ [Activa]    │  [Ver]      │
│  ... │  DRC Trade   │  RDC     │ [Em Revisão]│  [Ver]      │
└──────┴──────────────┴──────────┴─────────────┴─────────────┘
mat-table com mat-paginator desactivado no MVP
```

**Elementos:**
- Botão `[+ Registar]` — visível para todos os utilizadores autenticados (o registo é público mas a UI usa o token)
- Filtros: `mat-button-toggle-group` com os estados
- Coluna Estado: `mat-chip` com cor por estado
- Coluna Acções: apenas `[Ver]` que navega para detalhe

---

### 5.2 Formulário de Registo de Empresa

**URL:** `/companies/new`  
**Acesso:** Todos (autenticado)

```
┌─────────────────────────────────────────────────────────────┐
│  Registar Empresa                                           │
│  Breadcrumb: Empresas > Nova Empresa                        │
├─────────────────────────────────────────────────────────────┤
│  mat-card                                                   │
│                                                             │
│  Nome da Empresa *                                          │
│  [mat-form-field]                                           │
│                                                             │
│  País *                                                     │
│  [mat-select]                                               │
│  Angola / Zâmbia / RDC / Tanzânia / Zimbabwe / Moçambique  │
│                                                             │
│  Email de Contacto *                                        │
│  [mat-form-field type="email"]                              │
│                                                             │
│  Telefone                                                   │
│  [mat-form-field]                                           │
│                                                             │
│  Morada                                                     │
│  [mat-form-field]                                           │
│                                                             │
│  [Cancelar]           [Registar Empresa]                   │
│  mat-button           mat-raised-button primary             │
└─────────────────────────────────────────────────────────────┘
```

**Comportamento:**
- Validação inline com `mat-error`
- Após sucesso: `mat-snackbar` "Empresa registada com sucesso. Aguarda validação." + redirect para detalhe da empresa

---

### 5.3 Detalhe de Empresa

**URL:** `/companies/:id`  
**Acesso:** Todos (autenticado)

```
┌─────────────────────────────────────────────────────────────┐
│  [Lobito Trade Lda]                    [Activa]             │
│  Breadcrumb: Empresas > Lobito Trade Lda                    │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Informação Geral                                │
│  ┌──────────────────┬──────────────────────────────────┐   │
│  │  País            │  Angola                          │   │
│  │  Email           │  geral@lobitotrade.ao            │   │
│  │  Telefone        │  +244 923 000 001                │   │
│  │  Morada          │  Rua da Indústria, 42, Lobito    │   │
│  │  Licença Nº      │  LIC-2026-001                    │   │
│  │  Licença Válida  │  31 Dez 2028                     │   │
│  └──────────────────┴──────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Histórico de Licenciamento                      │
│  Timeline visual do fluxo de estados                        │
│  ● Registada → ● Documentação Validada → ● Licença Aprovada │
├─────────────────────────────────────────────────────────────┤
│  ACÇÕES — visíveis apenas para o role correcto              │
│                                                             │
│  Se licenseStatus === "pending" e role === "staff":         │
│  [Validar Documentação ✓]  [Devolver para Correcção ✗]     │
│                                                             │
│  Se licenseStatus === "under_review" e role === "state":    │
│  [Aprovar Licença ✓]  [Rejeitar Licença ✗]                 │
│                                                             │
│  Se licenseStatus === "active" e role === "state":          │
│  [Suspender Empresa]                                        │
└─────────────────────────────────────────────────────────────┘
```

**Acção "Validar Documentação":**
- Abre `mat-dialog`
- Dialog contém: toggle "Documentação válida / inválida" + campo de notas
- Botão "Confirmar" chama `POST /companies/:id/validate-documentation`

**Acção "Aprovar Licença":**
- Abre `mat-dialog`
- Dialog contém: campo "Número de Licença" + campo "Data de Validade" (mat-datepicker)
- Botão "Aprovar" chama `POST /companies/:id/approve-license`

**Acção "Rejeitar" ou "Suspender":**
- Abre `mat-dialog` de confirmação
- Dialog contém: campo de texto obrigatório "Motivo" (mínimo 10 caracteres)
- Botão vermelho "Confirmar Rejeição" / "Confirmar Suspensão"

---

## 6. Módulo Produtos

### 6.1 Lista de Produtos

**URL:** `/products`  
**Acesso:** Todos (autenticado)

```
┌─────────────────────────────────────────────────────────────┐
│  Produtos                           [+ Criar Produto]*      │
│  Breadcrumb: Dashboard > Produtos                           │
│  * botão visível apenas para PRODUCER                       │
├──────┬──────────────────┬──────────┬─────────────┬─────────┤
│  ID  │  Nome            │ Categoria│  Estado      │ Acções  │
├──────┼──────────────────┼──────────┼─────────────┼─────────┤
│  ... │  Cimento Port.   │ general  │ [Rascunho]  │  [Ver]  │
│  ... │  Ferro Corrugado │ general  │ [Publicado] │  [Ver]  │
└──────┴──────────────────┴──────────┴─────────────┴─────────┘
```

---

### 6.2 Formulário de Criação de Produto

**URL:** `/products/new`  
**Acesso:** PRODUCER

```
┌─────────────────────────────────────────────────────────────┐
│  Novo Produto                                               │
│  Breadcrumb: Produtos > Novo Produto                        │
├─────────────────────────────────────────────────────────────┤
│  mat-card                                                   │
│                                                             │
│  Nome do Produto *                                          │
│  [mat-form-field]                                           │
│                                                             │
│  Descrição                                                  │
│  [mat-form-field textarea]                                  │
│                                                             │
│  Categoria *                                                │
│  [mat-form-field]                                           │
│  ⚠ A categoria determina o imposto aplicado no pedido       │
│                                                             │
│  Empresa *                                                  │
│  [mat-select — lista de empresas activas do produtor]       │
│                                                             │
│  [Cancelar]           [Criar Produto]                       │
└─────────────────────────────────────────────────────────────┘
```

---

### 6.3 Detalhe de Produto

**URL:** `/products/:id`  
**Acesso:** Todos

```
┌─────────────────────────────────────────────────────────────┐
│  [Cimento Portland 50kg]              [Em Revisão]          │
│  Breadcrumb: Produtos > Cimento Portland 50kg               │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Informação                                      │
│  Descrição | Categoria | Empresa | Produtor | Criado em     │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Fluxo de Publicação                             │
│  ● Draft → ● Em Revisão → ● Publicado                       │
│  (timeline visual com estado actual destacado)              │
├─────────────────────────────────────────────────────────────┤
│  ACÇÕES                                                     │
│                                                             │
│  Se status === "draft" e role === "producer":               │
│  [Editar Produto]  [Solicitar Publicação]                   │
│                                                             │
│  Se status === "pending_review" e role === "state":         │
│  [Aprovar Publicação ✓]  [Rejeitar ✗]                      │
│                                                             │
│  Se status === "published_official" e role === "state":     │
│  [Suspender Produto]                                        │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Módulo Price Proposals

### 7.1 Lista de Price Proposals

**URL:** `/price-proposals`  
**Acesso:** STATE, SPECIALIST

```
┌─────────────────────────────────────────────────────────────┐
│  Price Proposals                [+ Nova Proposta]*          │
│  * visível apenas para SPECIALIST                           │
├──────┬──────────────┬───────────┬────────────┬─────────────┤
│  ID  │  Produto     │  Preço    │  Estado    │  Acções     │
├──────┼──────────────┼───────────┼────────────┼─────────────┤
│  ... │  Cimento...  │  $45.00   │ [Submetido]│  [Ver]      │
│  ... │  Ferro...    │  $120.00  │ [Aprovado] │  [Ver]      │
└──────┴──────────────┴───────────┴────────────┴─────────────┘
```

---

### 7.2 Formulário de Nova Price Proposal

**URL:** `/price-proposals/new`  
**Acesso:** SPECIALIST

```
┌─────────────────────────────────────────────────────────────┐
│  Nova Price Proposal                                        │
├─────────────────────────────────────────────────────────────┤
│  Produto *                                                  │
│  [mat-select — lista de produtos published_official]        │
│                                                             │
│  Preço Proposto (USD) *                                     │
│  [mat-form-field type="number"]                             │
│                                                             │
│  Moeda                                                      │
│  [mat-select: USD (apenas)]                                 │
│                                                             │
│  Justificação                                               │
│  [mat-form-field textarea]                                  │
│                                                             │
│  Válida de                  Válida até                      │
│  [mat-datepicker]           [mat-datepicker]               │
│                                                             │
│  [Cancelar]           [Guardar como Rascunho]               │
└─────────────────────────────────────────────────────────────┘
```

---

### 7.3 Detalhe de Price Proposal

**URL:** `/price-proposals/:id`  
**Acesso:** Todos

```
┌─────────────────────────────────────────────────────────────┐
│  Price Proposal — [Produto X]         [Aprovado]            │
│  Breadcrumb: Price Proposals > Proposta #id                 │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Detalhes                                        │
│  Produto | Preço Proposto | Moeda | Criado por | Período    │
│  Justificação: "..."                                        │
├─────────────────────────────────────────────────────────────┤
│  mat-card — SNAPSHOT OFICIAL (visível se status=approved)   │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  🔒 SNAPSHOT OFICIAL — IMUTÁVEL                        │ │
│  │  Preço Aprovado: $45.00 USD                            │ │
│  │  Produto: Cimento Portland 50kg                        │ │
│  │  Categoria: general                                    │ │
│  │  Aprovado em: 07 Mai 2026 21:30                       │ │
│  │  Válido: 01 Jan 2026 → 31 Dez 2026                    │ │
│  └────────────────────────────────────────────────────────┘ │
│  (card com fundo $accent/10% e ícone de cadeado)           │
├─────────────────────────────────────────────────────────────┤
│  ACÇÕES                                                     │
│  Se status === "draft" e criador === user.id:               │
│  [Editar]  [Submeter ao STATE]                              │
│                                                             │
│  Se status === "submitted" e role === "state":              │
│  [Aprovar Proposta ✓]  [Rejeitar ✗]                        │
│                                                             │
│  Se status === "approved":                                  │
│  (sem botões — proposta imutável)                          │
│  Nota visual: "Esta proposta está aprovada e é imutável."  │
└─────────────────────────────────────────────────────────────┘
```

---

## 8. Módulo Pedidos

### 8.1 Lista de Pedidos

**URL:** `/orders` (STATE, STAFF) ou `/orders/my-orders` (BUYER)

```
┌─────────────────────────────────────────────────────────────┐
│  Pedidos                              [+ Criar Pedido]*     │
│  * visível apenas para BUYER                                │
├──────┬──────────────┬────────────┬────────────┬────────────┤
│  ID  │  Comprador   │  Total     │  Estado    │  Acções    │
├──────┼──────────────┼────────────┼────────────┼────────────┤
│  ... │  Buyer Corp  │  $513.00   │ [Pago]     │  [Ver]     │
│  ... │  Buyer Corp  │  —         │ [Rascunho] │  [Ver]     │
└──────┴──────────────┴────────────┴────────────┴────────────┘
```

---

### 8.2 Criar Pedido

**URL:** `/orders/new`  
**Acesso:** BUYER

```
┌─────────────────────────────────────────────────────────────┐
│  Novo Pedido                                                │
├─────────────────────────────────────────────────────────────┤
│  PASSO 1 — Informação Geral (mat-step)                      │
│  ─────────────────────────────────────                      │
│  Empresa *                                                  │
│  [mat-select — empresas activas]                            │
│                                                             │
│  PASSO 2 — Linhas do Pedido (mat-step)                      │
│  ─────────────────────────────────────                      │
│  ┌─────────────────────────────────────┐                    │
│  │  [+ Adicionar Produto]              │                    │
│  │                                     │                    │
│  │  Produto 1: Cimento Portland 50kg   │                    │
│  │  Price Proposal: $45.00 (aprovada)  │                    │
│  │  Qtd: [input number]  [Remover]     │                    │
│  └─────────────────────────────────────┘                    │
│                                                             │
│  PASSO 3 — Revisão (mat-step)                               │
│  ─────────────────────────────────────                      │
│  Resumo: Empresa | Nº Linhas                                │
│  ⚠ O valor total é calculado pelo sistema no pagamento     │
│                                                             │
│  [Voltar]                 [Criar Pedido]                    │
└─────────────────────────────────────────────────────────────┘
```

**Nota:** Usar `mat-stepper` linear. Validar cada passo antes de avançar.

---

### 8.3 Detalhe de Pedido

**URL:** `/orders/:id`  
**Acesso:** Todos

```
┌─────────────────────────────────────────────────────────────┐
│  Pedido #[id]                          [Pago]               │
│  Empresa: Lobito Trade | Comprador: Buyer Corp              │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Linhas do Pedido                                │
│  ┌────────────────┬──────┬──────────┬─────────┬───────────┐ │
│  │  Produto       │ Qtd  │ Preço Un │ Imposto │  Total    │ │
│  ├────────────────┼──────┼──────────┼─────────┼───────────┤ │
│  │  Cimento 50kg  │  10  │ $45.00   │ 14%     │ $513.00   │ │
│  └────────────────┴──────┴──────────┴─────────┴───────────┘ │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Subtotal (net):        $450.00 USD                 │   │
│  │  Imposto (Angola 14%):  $ 63.00 USD                 │   │
│  │  ─────────────────────────────────                  │   │
│  │  TOTAL:                 $513.00 USD                 │   │
│  └─────────────────────────────────────────────────────┘   │
│  (apenas visível após pagamento)                            │
├─────────────────────────────────────────────────────────────┤
│  ACÇÕES                                                     │
│  Se status === "draft" e buyerId === user.id:               │
│  [Pagar Pedido]  ← abre dialog de confirmação              │
│                                                             │
│  Se status === "paid" e role === "state":                   │
│  [Bloquear Pedido]  ← abre dialog com campo de motivo      │
└─────────────────────────────────────────────────────────────┘
```

**Dialog de Pagamento:**
- Título: "Confirmar Pagamento"
- Texto: "O imposto será calculado automaticamente pelo sistema com base no país da empresa e categoria dos produtos."
- Botão: "Confirmar Pagamento" (verde)

---

## 9. Módulo Impostos

### 9.1 Lista de Impostos

**URL:** `/taxes`  
**Acesso:** Todos (autenticado)

```
┌─────────────────────────────────────────────────────────────┐
│  Regras Fiscais                   [+ Nova Regra Fiscal]*    │
│  * visível apenas para STATE                                │
├──────────┬────────────┬──────────┬──────────┬─────────────┤
│  Nome    │  País      │ Categoria│   Taxa   │  Vigência   │
├──────────┼────────────┼──────────┼──────────┼─────────────┤
│  IVA AO  │  Angola    │ general  │   14%    │  2024 →     │
│  IVA ZM  │  Zâmbia    │ general  │   16%    │  2024 →     │
│  IVA RDC │  RDC       │ general  │   16%    │  2024 →     │
│  IVA TZ  │  Tanzânia  │ general  │   18%    │  2024 →     │
│  IVA ZW  │  Zimbabwe  │ general  │   15%    │  2024 →     │
│  IVA MZ  │  Moçambique│ general  │   17%    │  2024 →     │
│  Global  │  Todos     │ general  │   15%    │  2024 →     │
└──────────┴────────────┴──────────┴──────────┴─────────────┘
```

**Nota informativa no topo:**
> "As taxas são aplicadas automaticamente no pagamento de pedidos. O sistema usa a taxa do país da empresa compradora. Se não houver taxa específica, aplica-se a taxa global (15%)."

---

### 9.2 Formulário de Nova Regra Fiscal

**URL:** `/taxes/new`  
**Acesso:** STATE

```
┌─────────────────────────────────────────────────────────────┐
│  Nova Regra Fiscal                                          │
│  mat-card                                                   │
│                                                             │
│  Nome *               [mat-form-field]                      │
│  País *               [mat-select]                          │
│  Categoria *          [mat-form-field]                      │
│  Taxa (%) *           [mat-form-field — ex: 14 para 14%]    │
│  Vigência a partir de [mat-datepicker]                      │
│  Vigência até         [mat-datepicker — opcional]           │
│                                                             │
│  [Cancelar]           [Criar Regra Fiscal]                  │
└─────────────────────────────────────────────────────────────┘
```

---

## 10. Módulo Embarques

### 10.1 Lista de Embarques

**URL:** `/shipments`  
**Acesso:** STATE, STAFF, OPERATOR, CUSTOMS

```
┌─────────────────────────────────────────────────────────────┐
│  Embarques                         [+ Criar Embarque]*      │
│  * visível apenas para OPERATOR                             │
├──────┬────────────┬──────────────┬────────────┬────────────┤
│  ID  │  Origem    │  Destino     │  Estado    │  Acções    │
├──────┼────────────┼──────────────┼────────────┼────────────┤
│  ... │  Lobito    │  Lusaka      │ [Trânsito] │  [Ver]     │
│  ... │  Lobito    │  Dar es Sal. │ [Criado]   │  [Ver]     │
└──────┴────────────┴──────────────┴────────────┴────────────┘
```

---

### 10.2 Criar Embarque

**URL:** `/shipments/new`  
**Acesso:** OPERATOR

```
┌─────────────────────────────────────────────────────────────┐
│  Novo Embarque                                              │
│  mat-card                                                   │
│                                                             │
│  Pedido (pago) *                                            │
│  [mat-select — lista de pedidos pagos]                      │
│                                                             │
│  Origem *                                                   │
│  [mat-form-field]  ex: Porto do Lobito, Angola              │
│                                                             │
│  Destino *                                                  │
│  [mat-form-field]  ex: Lusaka, Zâmbia                       │
│                                                             │
│  Data prevista de chegada (ETA)                             │
│  [mat-datepicker]                                           │
│                                                             │
│  [Cancelar]           [Criar Embarque]                      │
└─────────────────────────────────────────────────────────────┘
```

---

### 10.3 Detalhe de Embarque

**URL:** `/shipments/:id`  
**Acesso:** Todos

```
┌─────────────────────────────────────────────────────────────┐
│  Embarque #[id]                   [Em Trânsito]             │
│  Porto do Lobito → Lusaka · ETA: 15 Jun 2026               │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Tracking de Localização                         │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Último local: Fronteira Malanje km 142             │   │
│  │  Actualizado: 07 Mai 2026 21:50                     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  mat-expansion-panel — Histórico de Eventos                 │
│  ▼ Ver todos os eventos (N)                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  07 Mai 21:50 · Fronteira Malanje · Em Trânsito     │   │
│  │  07 Mai 21:30 · Porto do Lobito  · Criado           │   │
│  └─────────────────────────────────────────────────────┘   │
│  (lista cronológica inversa — append-only, não editável)    │
├─────────────────────────────────────────────────────────────┤
│  mat-card — Alfândega                                       │
│  Estado: Pendente                                           │
├─────────────────────────────────────────────────────────────┤
│  ACÇÕES                                                     │
│                                                             │
│  Se role === "operator" e operatorId === user.id:           │
│  [Actualizar Localização]  ← abre dialog com form          │
│                                                             │
│  Se role === "customs":                                     │
│  [Aprovar Embarque ✓]  [Rejeitar ✗]  [Reter ⏸]           │
│                                                             │
│  Se role === "state":                                       │
│  [Reter Embarque ⏸]                                       │
└─────────────────────────────────────────────────────────────┘
```

**Dialog "Actualizar Localização":**
- Campo: Localização actual (obrigatório)
- Campo: Estado (mat-select com ShipmentStatus)
- Campo: Notas (opcional)

**Dialog "Aprovar Embarque":**
- Campo: Notas (opcional)
- Botão verde: "Confirmar Aprovação"

**Dialog "Rejeitar / Reter":**
- Campo: Motivo (obrigatório, mínimo 5 caracteres)
- Botão vermelho: "Confirmar Rejeição" / "Confirmar Retenção"

---

## 11. Módulo Audit Log

### 11.1 Lista de Logs

**URL:** `/logs`  
**Acesso:** STATE (exclusivo)

```
┌─────────────────────────────────────────────────────────────┐
│  Audit Log — Registo de Actividade                          │
│  ⚠ Apenas leitura — registo imutável de todas as acções    │
├─────────────────────────────────────────────────────────────┤
│  Filtrar por entidade: [Todas ▼] [company] [order] [...]   │
│  Filtrar por ID de entidade: [____________________________] │
├──────────────┬──────────────┬──────────┬──────────┬────────┤
│  Data/Hora   │  Acção       │ Entidade │  Por     │ Ver    │
├──────────────┼──────────────┼──────────┼──────────┼────────┤
│  07 Mai 21:50│ PAY_ORDER    │ order    │ buyer    │  [+]   │
│  07 Mai 21:30│ CREATE_ORDER │ order    │ buyer    │  [+]   │
│  07 Mai 21:10│ APPROVE_LIC. │ company  │ state    │  [+]   │
└──────────────┴──────────────┴──────────┴──────────┴────────┘

mat-expansion-panel em cada linha para ver before/after JSON
```

**Expansão de linha:**
```
▼ PAY_ORDER — 07 Mai 2026 21:50

  Antes:   { "status": "draft" }
  Depois:  { "status": "paid", "totalAmount": "513.00", "taxAmount": "63.00" }
```

**Sem botões de acção** — só leitura.

---

## 12. Componentes Partilhados

### 12.1 Dialog de Confirmação (reutilizável)

Para todas as acções críticas (aprovar, rejeitar, suspender, bloquear):

```
┌─────────────────────────────────────┐
│  Confirmar Acção                    │
│  mat-dialog                         │
│                                     │
│  Tem a certeza que pretende         │
│  [APROVAR A LICENÇA] desta empresa? │
│                                     │
│  [Campo de motivo — se aplicável]   │
│                                     │
│  [Cancelar]     [Confirmar]         │
│  mat-button     mat-raised-button   │
│                 (warn ou primary)   │
└─────────────────────────────────────┘
```

### 12.2 Loading State

- `mat-progress-bar` no topo do `mat-card` durante chamadas à API
- Desactivar botões durante o loading (`[disabled]="loading"`)

### 12.3 Feedback de Sucesso/Erro

- **Sucesso:** `mat-snackbar` verde em baixo à direita, 3 segundos
- **Erro:** `mat-snackbar` vermelho com texto da mensagem da API, 5 segundos

### 12.4 Estado Vazio

Quando uma lista não tem resultados:
```
┌─────────────────────────────────────┐
│                                     │
│      (ícone)                        │
│   Sem registos                      │
│   Ainda não existem [entidades]     │
│                                     │
│   [+ Criar primeiro]  — se aplicável│
└─────────────────────────────────────┘
```

---

## 13. Fluxos de Navegação Completos

### 13.1 Fluxo STATE — Aprovar uma Empresa

```
Login (state@lobito.gov)
        ↓
Dashboard STATE
  → Card "Empresas Pendentes" → clicar
        ↓
/companies (filtrado: pending + under_review)
  → clicar [Ver] numa empresa
        ↓
/companies/:id (detalhe)
  → ver estado "Pendente" ou "Em Revisão"
  → clicar [Aprovar Licença] (visível se under_review)
        ↓
Dialog: Número de Licença + Data de Validade
  → preencher → [Aprovar]
        ↓
snackbar "Licença aprovada com sucesso"
  → página actualiza → chip muda para [Activa]
```

---

### 13.2 Fluxo STAFF — Validar Documentação

```
Login (staff@lobito.gov)
        ↓
Dashboard STAFF
  → Card "Empresas Pendentes" → clicar
        ↓
/companies (filtrado: pending)
  → clicar [Ver]
        ↓
/companies/:id
  → clicar [Validar Documentação] (visível se pending)
        ↓
Dialog: Toggle "válido/inválido" + notas
  → toggle ON + notas → [Confirmar]
        ↓
snackbar "Documentação validada — enviada ao STATE"
  → chip muda para [Em Revisão]
```

---

### 13.3 Fluxo PRODUCER — Criar e Publicar Produto

```
Login (producer@lobito.biz)
        ↓
Dashboard PRODUCER
  → [+ Criar Produto]
        ↓
/products/new
  → preencher formulário → [Criar Produto]
        ↓
/products/:id (detalhe do novo produto)
  → estado: [Rascunho]
  → clicar [Solicitar Publicação]
        ↓
Dialog: "Confirmar submissão ao STATE?"
  → [Confirmar]
        ↓
snackbar "Produto enviado para revisão"
  → chip muda para [Em Revisão]
  → botão Solicitar desaparece
  → aguardar decisão do STATE
```

---

### 13.4 Fluxo SPECIALIST — Criar e Submeter Price Proposal

```
Login (specialist@lobito.gov)
        ↓
Dashboard SPECIALIST
  → [+ Nova Price Proposal]
        ↓
/price-proposals/new
  → seleccionar produto published_official
  → preencher preço, justificação, datas
  → [Guardar como Rascunho]
        ↓
/price-proposals/:id
  → estado: [Rascunho]
  → clicar [Submeter ao STATE]
        ↓
Dialog de confirmação
  → [Confirmar]
        ↓
snackbar "Proposta submetida ao STATE"
  → chip muda para [Submetido]
  → botão Editar e Submeter desaparecem
```

---

### 13.5 Fluxo STATE — Aprovar Price Proposal

```
Login (state@lobito.gov)
        ↓
Dashboard STATE
  → Card "Propostas Submetidas"
        ↓
/price-proposals (filtrado: submitted)
  → clicar [Ver]
        ↓
/price-proposals/:id
  → ver dados da proposta
  → clicar [Aprovar Proposta]
        ↓
Dialog: "Confirmar aprovação? Um snapshot imutável será gerado."
  → [Aprovar]
        ↓
snackbar "Proposta aprovada — snapshot gerado"
  → chip muda para [Aprovado]
  → Card SNAPSHOT OFICIAL aparece com os dados
  → todos os botões de acção desaparecem (imutável)
```

---

### 13.6 Fluxo BUYER — Criar e Pagar Pedido

```
Login (buyer@lobito.biz)
        ↓
Dashboard BUYER
  → [+ Criar Pedido]
        ↓
/orders/new (mat-stepper 3 passos)
  Passo 1: seleccionar empresa
  Passo 2: adicionar linhas (produto + price proposal + quantidade)
  Passo 3: rever e confirmar → [Criar Pedido]
        ↓
/orders/:id
  → estado: [Rascunho]
  → sem valores (ainda não pagou)
  → clicar [Pagar Pedido]
        ↓
Dialog: "O imposto será calculado automaticamente pelo sistema."
  → [Confirmar Pagamento]
        ↓
snackbar "Pedido pago com sucesso"
  → chip muda para [Pago]
  → tabela de linhas mostra preço, imposto, total
  → Subtotal | Imposto (14%) | TOTAL
  → botão Pagar desaparece
```

---

### 13.7 Fluxo OPERATOR — Criar Embarque e Tracking

```
Login (operator@lobito.biz)
        ↓
Dashboard OPERATOR
  → [+ Criar Embarque]
        ↓
/shipments/new
  → seleccionar pedido pago
  → preencher origem, destino, ETA
  → [Criar Embarque]
        ↓
/shipments/:id
  → estado: [Criado]
  → clicar [Actualizar Localização]
        ↓
Dialog: localização + estado + notas
  → [Actualizar]
        ↓
snackbar "Tracking actualizado"
  → página actualiza
  → "Último local" actualizado
  → novo evento aparece no histórico (append-only)
```

---

### 13.8 Fluxo CUSTOMS — Aprovar Embarque

```
Login (customs@lobito.gov)
        ↓
Dashboard CUSTOMS
  → Card "Embarques Pendentes"
        ↓
/shipments (filtrado: at_border ou pendentes)
  → clicar [Ver]
        ↓
/shipments/:id
  → ver origem, destino, tracking events
  → clicar [Aprovar Embarque]
        ↓
Dialog: campo de notas opcional
  → [Confirmar Aprovação]
        ↓
snackbar "Embarque aprovado pela alfândega"
  → chip muda para [Aprovado Alfândega]
  → botões de acção desaparecem
```

---

*Corredor do Lobito — UI/UX Specification v1.0*  
*Angular Material · Identidade Governamental · Baseado no Backend MVP*
