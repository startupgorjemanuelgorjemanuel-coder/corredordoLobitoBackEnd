# Corredor do Lobito — Guia Frontend: Campo `cd` Enterprise

> **Para:** Equipa Frontend Angular  
> **Versão:** Enterprise — código armazenado na base de dados com prefixo  
> **Princípio:** O que a API devolve é exactamente o que se mostra. Sem formatação.

---

## 1. O que é o campo `cd`

Cada entidade do sistema tem dois identificadores:

```json
{
  "id": "a522e4d3-38bf-4306-bca8-db03da0d6aa4",
  "cd": "ORD-0001",
  ...
}
```

| Campo | Tipo | Uso |
|-------|------|-----|
| `id` | `string` (UUID) | Interno — usado nas chamadas à API (`/orders/:id`) |
| `cd` | `string` (código) | **Exibido ao utilizador** — tabelas, títulos, documentos |

**Regra absoluta: nunca mostrar o UUID ao utilizador. Sempre usar `cd`.**

---

## 2. Códigos por Entidade — Já formatados na API

O código vem completo da API. O Frontend não precisa de formatar nada.

| Entidade | Código | Exemplo |
|---------|--------|---------|
| Utilizadores | `USR-XXXX` | `USR-0001` |
| Empresas | `EMP-XXXX` | `EMP-0001` |
| Produtos | `PRD-XXXX` | `PRD-0001` |
| Price Proposals | `PP-XXXX` | `PP-0001` |
| Impostos | `TAX-XXXX` | `TAX-0001` |
| Pedidos | `ORD-XXXX` | `ORD-0001` |
| Linhas de Pedido | `OL-XXXX` | `OL-0001` |
| Embarques | `SHP-XXXX` | `SHP-0001` |
| Despachos Alfândega | `DSP-XXXX` | `DSP-0001` |
| Audit Logs | `LOG-XXXX` | `LOG-0001` |

---

## 3. Tipos TypeScript — `cd` é `string`

Adicionar `cd: string` a todas as interfaces:

```typescript
// src/app/shared/types/index.ts

export interface User {
  id:       string;
  cd:       string;   // "USR-0001"
  email:    string;
  fullName: string;
  role:     Role;
  status:   UserStatus;
  companyId: string | null;
}

export interface Company {
  id:            string;
  cd:            string;   // "EMP-0001"
  name:          string;
  country:       CompanyCountry;
  contactEmail:  string;
  contactPhone:  string | null;
  address:       string | null;
  licenseStatus: LicenseStatus;
  licenseNumber: string | null;
  licenseExpiresAt: string | null;
  rejectionReason:  string | null;
  suspensionReason: string | null;
  validationNotes:  string | null;
  createdAt:     string;
  updatedAt:     string;
}

export interface Product {
  id:             string;
  cd:             string;   // "PRD-0001"
  name:           string;
  description:    string | null;
  category:       string;
  producerId:     string;
  companyId:      string;
  status:         ProductStatus;
  rejectionReason: string | null;
  publishedAt:    string | null;
  createdAt:      string;
  updatedAt:      string;
  producer?: { id: string; fullName: string };
  company?:  { id: string; name: string };
}

export interface PriceProposal {
  id:             string;
  cd:             string;   // "PP-0001"
  productId:      string;
  createdById:    string;
  approvedById:   string | null;
  status:         PriceProposalStatus;
  proposedPrice:  string;
  currency:       string;
  justification:  string | null;
  rejectionReason: string | null;
  snapshot:       PriceProposalSnapshot | null;
  submittedAt:    string | null;
  approvedAt:     string | null;
  validFrom:      string | null;
  validTo:        string | null;
  createdAt:      string;
  updatedAt:      string;
  product?: { id: string; name: string; category: string };
}

export interface Tax {
  id:            string;
  cd:            string;   // "TAX-0001"
  name:          string;
  category:      string;
  country:       string;
  rate:          string;
  effectiveFrom: string;
  effectiveTo:   string | null;
  isActive:      boolean;
  createdAt:     string;
}

export interface Order {
  id:           string;
  cd:           string;   // "ORD-0001"
  buyerId:      string;
  companyId:    string;
  status:       OrderStatus;
  totalAmount:  string | null;
  taxAmount:    string | null;
  netAmount:    string | null;
  currency:     string;
  blockedReason: string | null;
  paidAt:       string | null;
  createdAt:    string;
  updatedAt:    string;
  lines?:       OrderLine[];
  buyer?:       { id: string; fullName: string };
  company?:     { id: string; name: string; country: string };
}

export interface OrderLine {
  id:              string;
  cd:              string;   // "OL-0001"
  orderId:         string;
  productId:       string;
  priceProposalId: string;
  qty:             number;
  unitPrice:       string;
  taxRate:         string | null;
  taxAmount:       string | null;
  lineTotal:       string | null;
  snapshotRef:     PriceProposalSnapshot | null;
}

export interface Shipment {
  id:             string;
  cd:             string;   // "SHP-0001"
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
  id:             string;
  cd:             string;   // "DSP-0001"
  shipmentId:     string;
  dispatcherId:   string;
  status:         CustomsDispatchStatus;
  notes:          string | null;
  rejectionReason: string | null;
  validatedAt:    string | null;
}

export interface AuditLog {
  id:         string;
  cd:         string;   // "LOG-0001"
  userId:     string;
  role:       string;
  action:     string;
  entity:     string;
  entityId:   string;
  beforeJson: string | null;
  afterJson:  string | null;
  createdAt:  string;
}
```

---

## 4. Usar `cd` no HTML — Directo, sem pipe

```html
<!-- ERRADO — nunca mostrar UUID -->
{{ order.id }}

<!-- CORRECTO — mostrar cd directamente -->
{{ order.cd }}
```

Exemplos reais:

```html
<!-- Título de detalhe de pedido -->
<h2>Pedido {{ order.cd }}</h2>
<!-- → "Pedido ORD-0001" -->

<!-- Título de detalhe de empresa -->
<h2>{{ company.name }}</h2>
<span class="subtitle">{{ company.cd }}</span>
<!-- → "Lobito Trade Lda" + "EMP-0001" -->

<!-- Título de embarque -->
<h2>Embarque {{ shipment.cd }}</h2>
<!-- → "Embarque SHP-0001" -->

<!-- Linha de audit log -->
<td>{{ log.cd }}</td>
<!-- → "LOG-0040" -->
```

---

## 5. Coluna `cd` nas mat-table

### Padrão para todas as listas

```typescript
// Definir displayedColumns com 'cd' na primeira posição
displayedColumns: string[] = ['cd', 'status', 'name', 'actions'];
```

```html
<!-- Coluna cd — igual para todas as tabelas -->
<ng-container matColumnDef="cd">
  <th mat-header-cell *matHeaderCellDef>Nº</th>
  <td mat-cell *matCellDef="let row">
    <strong>{{ row.cd }}</strong>
  </td>
</ng-container>
```

---

## 6. Exemplos Completos por Módulo

### 6.1 Tabela de Empresas

```html
<!-- companies-list.component.html -->
<mat-table [dataSource]="companies">

  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Nº</th>
    <td mat-cell *matCellDef="let c"><strong>{{ c.cd }}</strong></td>
  </ng-container>

  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef>Empresa</th>
    <td mat-cell *matCellDef="let c">{{ c.name }}</td>
  </ng-container>

  <ng-container matColumnDef="country">
    <th mat-header-cell *matHeaderCellDef>País</th>
    <td mat-cell *matCellDef="let c">{{ c.country | titlecase }}</td>
  </ng-container>

  <ng-container matColumnDef="licenseStatus">
    <th mat-header-cell *matHeaderCellDef>Estado</th>
    <td mat-cell *matCellDef="let c">
      <mat-chip [ngClass]="chipClass(c.licenseStatus)">
        {{ statusLabel(c.licenseStatus) }}
      </mat-chip>
    </td>
  </ng-container>

  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef></th>
    <td mat-cell *matCellDef="let c">
      <button mat-stroked-button [routerLink]="['/companies', c.id]">Ver</button>
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="['cd','name','country','licenseStatus','actions']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','name','country','licenseStatus','actions']"></tr>
</mat-table>
```

**Resultado:**
```
┌─────────┬──────────────────┬─────────┬────────────┬──────┐
│  Nº     │  Empresa         │  País   │  Estado    │      │
├─────────┼──────────────────┼─────────┼────────────┼──────┤
│ EMP-0001│ Lobito Trade Lda │ Angola  │ [Activa]   │ [Ver]│
│ EMP-0002│ Zamco Intl.      │ Zâmbia  │ [Activa]   │ [Ver]│
│ EMP-0003│ Congo Minerals   │ RDC     │ [Activa]   │ [Ver]│
└─────────┴──────────────────┴─────────┴────────────┴──────┘
```

---

### 6.2 Tabela de Pedidos

```html
<!-- orders-list.component.html -->
<mat-table [dataSource]="orders">

  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Nº Pedido</th>
    <td mat-cell *matCellDef="let o"><strong>{{ o.cd }}</strong></td>
  </ng-container>

  <ng-container matColumnDef="company">
    <th mat-header-cell *matHeaderCellDef>Empresa</th>
    <td mat-cell *matCellDef="let o">{{ o.company?.name }}</td>
  </ng-container>

  <ng-container matColumnDef="status">
    <th mat-header-cell *matHeaderCellDef>Estado</th>
    <td mat-cell *matCellDef="let o">
      <mat-chip [ngClass]="chipClass(o.status)">{{ statusLabel(o.status) }}</mat-chip>
    </td>
  </ng-container>

  <ng-container matColumnDef="total">
    <th mat-header-cell *matHeaderCellDef>Total</th>
    <td mat-cell *matCellDef="let o">
      {{ o.totalAmount ? (o.totalAmount | number:'1.2-2') + ' USD' : '—' }}
    </td>
  </ng-container>

  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef></th>
    <td mat-cell *matCellDef="let o">
      <button mat-stroked-button [routerLink]="['/orders', o.id]">Ver</button>
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="['cd','company','status','total','actions']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','company','status','total','actions']"></tr>
</mat-table>
```

**Resultado:**
```
┌──────────┬──────────────────┬───────────┬────────────┬──────┐
│ Nº Pedido│  Empresa         │  Estado   │  Total     │      │
├──────────┼──────────────────┼───────────┼────────────┼──────┤
│ ORD-0001 │ Lobito Trade Lda │ [Pago]    │ 513.00 USD │ [Ver]│
│ ORD-0002 │ Lobito Trade Lda │ [Rascunho]│     —      │ [Ver]│
└──────────┴──────────────────┴───────────┴────────────┴──────┘
```

---

### 6.3 Tabela de Produtos

```html
<mat-table [dataSource]="products">
  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Nº</th>
    <td mat-cell *matCellDef="let p"><strong>{{ p.cd }}</strong></td>
  </ng-container>
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef>Produto</th>
    <td mat-cell *matCellDef="let p">{{ p.name }}</td>
  </ng-container>
  <ng-container matColumnDef="category">
    <th mat-header-cell *matHeaderCellDef>Categoria</th>
    <td mat-cell *matCellDef="let p">{{ p.category }}</td>
  </ng-container>
  <ng-container matColumnDef="status">
    <th mat-header-cell *matHeaderCellDef>Estado</th>
    <td mat-cell *matCellDef="let p">
      <mat-chip [ngClass]="chipClass(p.status)">{{ statusLabel(p.status) }}</mat-chip>
    </td>
  </ng-container>
  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef></th>
    <td mat-cell *matCellDef="let p">
      <button mat-stroked-button [routerLink]="['/products', p.id]">Ver</button>
    </td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="['cd','name','category','status','actions']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','name','category','status','actions']"></tr>
</mat-table>
```

---

### 6.4 Tabela de Price Proposals

```html
<mat-table [dataSource]="proposals">
  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Nº</th>
    <td mat-cell *matCellDef="let pp"><strong>{{ pp.cd }}</strong></td>
  </ng-container>
  <ng-container matColumnDef="product">
    <th mat-header-cell *matHeaderCellDef>Produto</th>
    <td mat-cell *matCellDef="let pp">{{ pp.product?.name }}</td>
  </ng-container>
  <ng-container matColumnDef="price">
    <th mat-header-cell *matHeaderCellDef>Preço Proposto</th>
    <td mat-cell *matCellDef="let pp">
      {{ pp.proposedPrice | number:'1.2-2' }} {{ pp.currency }}
    </td>
  </ng-container>
  <ng-container matColumnDef="status">
    <th mat-header-cell *matHeaderCellDef>Estado</th>
    <td mat-cell *matCellDef="let pp">
      <mat-chip [ngClass]="chipClass(pp.status)">{{ statusLabel(pp.status) }}</mat-chip>
    </td>
  </ng-container>
  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef></th>
    <td mat-cell *matCellDef="let pp">
      <button mat-stroked-button [routerLink]="['/price-proposals', pp.id]">Ver</button>
    </td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="['cd','product','price','status','actions']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','product','price','status','actions']"></tr>
</mat-table>
```

---

### 6.5 Tabela de Embarques

```html
<mat-table [dataSource]="shipments">
  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Nº</th>
    <td mat-cell *matCellDef="let s"><strong>{{ s.cd }}</strong></td>
  </ng-container>
  <ng-container matColumnDef="route">
    <th mat-header-cell *matHeaderCellDef>Rota</th>
    <td mat-cell *matCellDef="let s">{{ s.origin }} → {{ s.destination }}</td>
  </ng-container>
  <ng-container matColumnDef="lastLocation">
    <th mat-header-cell *matHeaderCellDef>Última Localização</th>
    <td mat-cell *matCellDef="let s">{{ s.lastLocation || '—' }}</td>
  </ng-container>
  <ng-container matColumnDef="status">
    <th mat-header-cell *matHeaderCellDef>Estado</th>
    <td mat-cell *matCellDef="let s">
      <mat-chip [ngClass]="chipClass(s.status)">{{ statusLabel(s.status) }}</mat-chip>
    </td>
  </ng-container>
  <ng-container matColumnDef="actions">
    <th mat-header-cell *matHeaderCellDef></th>
    <td mat-cell *matCellDef="let s">
      <button mat-stroked-button [routerLink]="['/shipments', s.id]">Ver</button>
    </td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="['cd','route','lastLocation','status','actions']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','route','lastLocation','status','actions']"></tr>
</mat-table>
```

---

### 6.6 Tabela de Impostos

```html
<mat-table [dataSource]="taxes">
  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Nº</th>
    <td mat-cell *matCellDef="let t"><strong>{{ t.cd }}</strong></td>
  </ng-container>
  <ng-container matColumnDef="name">
    <th mat-header-cell *matHeaderCellDef>Nome</th>
    <td mat-cell *matCellDef="let t">{{ t.name }}</td>
  </ng-container>
  <ng-container matColumnDef="country">
    <th mat-header-cell *matHeaderCellDef>País</th>
    <td mat-cell *matCellDef="let t">{{ t.country | titlecase }}</td>
  </ng-container>
  <ng-container matColumnDef="rate">
    <th mat-header-cell *matHeaderCellDef>Taxa</th>
    <td mat-cell *matCellDef="let t">{{ (+t.rate * 100).toFixed(0) }}%</td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="['cd','name','country','rate']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','name','country','rate']"></tr>
</mat-table>
```

---

### 6.7 Audit Log

```html
<mat-table [dataSource]="logs">
  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Registo</th>
    <td mat-cell *matCellDef="let l"><strong>{{ l.cd }}</strong></td>
  </ng-container>
  <ng-container matColumnDef="action">
    <th mat-header-cell *matHeaderCellDef>Acção</th>
    <td mat-cell *matCellDef="let l">{{ l.action }}</td>
  </ng-container>
  <ng-container matColumnDef="entity">
    <th mat-header-cell *matHeaderCellDef>Entidade</th>
    <td mat-cell *matCellDef="let l">{{ l.entity }}</td>
  </ng-container>
  <ng-container matColumnDef="role">
    <th mat-header-cell *matHeaderCellDef>Role</th>
    <td mat-cell *matCellDef="let l">{{ l.role }}</td>
  </ng-container>
  <ng-container matColumnDef="date">
    <th mat-header-cell *matHeaderCellDef>Data</th>
    <td mat-cell *matCellDef="let l">{{ l.createdAt | date:'dd/MM/yyyy HH:mm' }}</td>
  </ng-container>
  <tr mat-header-row *matHeaderRowDef="['cd','action','entity','role','date']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','action','entity','role','date']"></tr>
</mat-table>
```

---

## 7. Ecrãs de Detalhe — Usar `cd` no Título e Breadcrumb

```html
<!-- Detalhe de Pedido -->
<div class="page-header">
  <h1>Pedido {{ order.cd }}</h1>
  <p class="breadcrumb">Dashboard > Pedidos > {{ order.cd }}</p>
</div>

<!-- Detalhe de Empresa -->
<div class="page-header">
  <h1>{{ company.name }}</h1>
  <p class="breadcrumb">Dashboard > Empresas > {{ company.cd }}</p>
  <span class="code-badge">{{ company.cd }}</span>
</div>

<!-- Detalhe de Embarque -->
<div class="page-header">
  <h1>Embarque {{ shipment.cd }}</h1>
  <p class="breadcrumb">Dashboard > Embarques > {{ shipment.cd }}</p>
</div>

<!-- Detalhe de Price Proposal -->
<div class="page-header">
  <h1>Price Proposal {{ proposal.cd }}</h1>
  <p class="breadcrumb">Dashboard > Price Proposals > {{ proposal.cd }}</p>
</div>
```

---

## 8. Navegar por `id`, Exibir `cd`

As chamadas à API usam sempre `id` (UUID). O `cd` é só para exibição.

```typescript
// service — usar id nas chamadas
getOrder(id: string) {
  return this.http.get<Order>(`/orders/${id}`);
}

// component — navegar com id, mostrar cd
goToOrder(order: Order) {
  this.router.navigate(['/orders', order.id]);
}
```

```html
<!-- Botão de acção — usa id para navegar, mas mostra cd na UI -->
<button mat-stroked-button (click)="goToOrder(order)">
  Ver {{ order.cd }}
</button>
<!-- → "Ver ORD-0001" -->

<!-- Link na tabela -->
<td>
  <a [routerLink]="['/orders', row.id]">{{ row.cd }}</a>
</td>
```

---

## 9. Linhas de Pedido — Exibir `cd` da linha e do produto

```html
<!-- order-detail.component.html — tabela de linhas -->
<mat-table [dataSource]="order.lines">

  <ng-container matColumnDef="cd">
    <th mat-header-cell *matHeaderCellDef>Linha</th>
    <td mat-cell *matCellDef="let l">{{ l.cd }}</td>
  </ng-container>

  <ng-container matColumnDef="product">
    <th mat-header-cell *matHeaderCellDef>Produto</th>
    <td mat-cell *matCellDef="let l">{{ l.product?.name }}</td>
  </ng-container>

  <ng-container matColumnDef="qty">
    <th mat-header-cell *matHeaderCellDef>Qtd</th>
    <td mat-cell *matCellDef="let l">{{ l.qty }}</td>
  </ng-container>

  <ng-container matColumnDef="unitPrice">
    <th mat-header-cell *matHeaderCellDef>Preço Unit.</th>
    <td mat-cell *matCellDef="let l">
      {{ l.snapshotRef ? (l.snapshotRef.approvedPriceUsd | number:'1.2-2') + ' USD' : '—' }}
    </td>
  </ng-container>

  <ng-container matColumnDef="taxRate">
    <th mat-header-cell *matHeaderCellDef>Imposto</th>
    <td mat-cell *matCellDef="let l">
      {{ l.taxRate ? (+l.taxRate * 100).toFixed(0) + '%' : '—' }}
    </td>
  </ng-container>

  <ng-container matColumnDef="lineTotal">
    <th mat-header-cell *matHeaderCellDef>Total Linha</th>
    <td mat-cell *matCellDef="let l">
      {{ l.lineTotal ? (l.lineTotal | number:'1.2-2') + ' USD' : '—' }}
    </td>
  </ng-container>

  <tr mat-header-row *matHeaderRowDef="['cd','product','qty','unitPrice','taxRate','lineTotal']"></tr>
  <tr mat-row *matRowDef="let row; columns: ['cd','product','qty','unitPrice','taxRate','lineTotal']"></tr>
</mat-table>

<!-- Resumo financeiro -->
<div class="order-summary" *ngIf="order.status === 'paid'">
  <div class="summary-row">
    <span>Subtotal (net):</span>
    <span>{{ order.netAmount | number:'1.2-2' }} USD</span>
  </div>
  <div class="summary-row">
    <span>Imposto:</span>
    <span>{{ order.taxAmount | number:'1.2-2' }} USD</span>
  </div>
  <mat-divider></mat-divider>
  <div class="summary-row total">
    <span>TOTAL:</span>
    <span>{{ order.totalAmount | number:'1.2-2' }} USD</span>
  </div>
</div>
```

---

## 10. Não enviar `cd` nas chamadas POST/PUT

O `cd` é gerado automaticamente pelo backend. Nunca incluir nos DTOs de criação ou edição.

```typescript
// ERRADO — nunca enviar cd
createCompany(dto: CreateCompanyDto) {
  return this.http.post<Company>('/companies', {
    cd:           'EMP-0001',  // ← NUNCA
    name:         dto.name,
    country:      dto.country,
    contactEmail: dto.contactEmail,
  });
}

// CORRECTO — cd não vai no body
createCompany(dto: CreateCompanyDto) {
  return this.http.post<Company>('/companies', {
    name:         dto.name,
    country:      dto.country,
    contactEmail: dto.contactEmail,
  });
}
```

---

## 11. Regras Obrigatórias

| Regra | Detalhe |
|-------|---------|
| **Nunca mostrar UUID** | O `id` é interno — nunca aparece na UI |
| **`cd` é sempre string** | Tipo `string`, não `number` |
| **Sem formatação** | `{{ order.cd }}` — o código vem pronto da API |
| **`id` nas chamadas** | `/orders/:id` usa UUID — não usar `cd` nas rotas |
| **`cd` no título** | Todo o ecrã de detalhe mostra `cd` no heading |
| **`cd` na primeira coluna** | Em todas as tabelas, coluna `cd` vem sempre primeiro |
| **Não enviar `cd`** | Nunca incluir `cd` em POST ou PUT |
| **`cd` no breadcrumb** | Usar `cd` no breadcrumb (não UUID, não nome) |

---

## 12. Estado actual dos dados no banco

Após aplicar a migration e o seed, os códigos disponíveis são:

| Tabela | Registos | Exemplos de cd |
|--------|---------|----------------|
| users | 7 | `USR-0001` → `USR-0007` |
| companies | 3+ | `EMP-0001` → `EMP-0003` |
| products | 3+ | `PRD-0001` → `PRD-0003` |
| price_proposals | 3+ | `PP-0001` → `PP-0003` |
| taxes | 7 | `TAX-0001` → `TAX-0007` |
| orders | 2+ | `ORD-0001` → `ORD-0002` |
| order_lines | 3+ | `OL-0001` → `OL-0003` |
| shipments | 1+ | `SHP-0001` |
| customs_dispatches | 1+ | `DSP-0001` |
| audit_logs | variável | `LOG-0001` → `LOG-XXXX` |

Novos registos continuam a sequência automaticamente — o backend gera o próximo código sem intervenção do frontend.

---

*Corredor do Lobito — CD Frontend Guide v2.0 Enterprise*  
*Código armazenado na DB · API devolve string completa · Frontend exibe directamente*
