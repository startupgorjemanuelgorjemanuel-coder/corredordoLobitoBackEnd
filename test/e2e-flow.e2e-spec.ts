/**
 * Corredor do Lobito — Teste E2E de Ponta a Ponta (24 passos)
 *
 * Pré-requisitos:
 *   - Base de dados Supabase acessível via DATABASE_URL no .env
 *   - Seed executado: npx prisma db seed
 *   - Cada execução cria novos registos na DB (não limpa automaticamente)
 *
 * Correr: npm run test:e2e
 */

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';

const PASSWORD = 'Lobito@Dev2024!';

describe('Fluxo E2E — 24 Passos', () => {
  let app: INestApplication;

  // ── Tokens JWT ──────────────────────────────────────────────────────────
  let tokenStaff:      string;
  let tokenState:      string;
  let tokenProducer:   string;
  let tokenSpecialist: string;
  let tokenBuyer:      string;
  let tokenOperator:   string;
  let tokenCustoms:    string;

  // ── IDs das entidades criadas ────────────────────────────────────────────
  let companyId:  string;
  let productId:  string;
  let proposalId: string;
  let orderId:    string;
  let shipmentId: string;

  // ── Setup ────────────────────────────────────────────────────────────────
  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({
      whitelist:            true,
      forbidNonWhitelisted: true,
      transform:            true,
    }));
    await app.init();
  }, 30_000);

  afterAll(async () => {
    await app.close();
  });

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 1 — EMPRESA E LICENÇA
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 1 — LOGIN STAFF → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'staff@lobito.gov', password: PASSWORD })
      .expect(201);

    expect(res.body.access_token).toBeDefined();
    expect(res.body.user.role).toBe('staff');
    tokenStaff = res.body.access_token;
  });

  it('Passo 2 — POST /companies → empresa criada (pending)', async () => {
    const res = await request(app.getHttpServer())
      .post('/companies')
      .send({
        name:         'Lobito Trade Lda',
        country:      'angola',
        contactEmail: 'geral@lobitotrade.ao',
        contactPhone: '+244 923 000 001',
        address:      'Rua da Indústria, 42, Lobito',
      })
      .expect(201);

    expect(res.body.licenseStatus).toBe('pending');
    companyId = res.body.id;
  });

  it('Passo 3 — STAFF valida documentação → under_review', async () => {
    const res = await request(app.getHttpServer())
      .post(`/companies/${companyId}/validate-documentation`)
      .set('Authorization', `Bearer ${tokenStaff}`)
      .send({ valid: true, notes: 'Documentação completa e válida' })
      .expect(200);

    expect(res.body.licenseStatus).toBe('under_review');
  });

  it('Passo 4 — LOGIN STATE → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'state@lobito.gov', password: PASSWORD })
      .expect(201);

    expect(res.body.user.role).toBe('state');
    tokenState = res.body.access_token;
  });

  it('Passo 5 — STATE aprova licença → active', async () => {
    const res = await request(app.getHttpServer())
      .post(`/companies/${companyId}/approve-license`)
      .set('Authorization', `Bearer ${tokenState}`)
      .send({
        licenseNumber:    `LIC-${Date.now()}`,
        licenseExpiresAt: '2028-12-31T23:59:59.000Z',
      })
      .expect(200);

    expect(res.body.licenseStatus).toBe('active');
    expect(res.body.licenseNumber).toBeDefined();
  });

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 2 — PRODUTO
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 6 — LOGIN PRODUCER → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'producer@lobito.biz', password: PASSWORD })
      .expect(201);

    expect(res.body.user.role).toBe('producer');
    tokenProducer = res.body.access_token;
  });

  it('Passo 7 — PRODUCER cria produto → draft', async () => {
    const res = await request(app.getHttpServer())
      .post('/products')
      .set('Authorization', `Bearer ${tokenProducer}`)
      .send({
        name:        'Cimento Portland 50kg',
        description: 'Cimento para construção civil',
        category:    'general',
        companyId,
      })
      .expect(201);

    expect(res.body.status).toBe('draft');
    productId = res.body.id;
  });

  it('Passo 8 — PRODUCER solicita publicação → pending_review', async () => {
    const res = await request(app.getHttpServer())
      .post(`/products/${productId}/request-publication`)
      .set('Authorization', `Bearer ${tokenProducer}`)
      .expect(200);

    expect(res.body.status).toBe('pending_review');
  });

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 3 — PRICE PROPOSAL
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 9 — LOGIN SPECIALIST → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'specialist@lobito.gov', password: PASSWORD })
      .expect(201);

    expect(res.body.user.role).toBe('specialist');
    tokenSpecialist = res.body.access_token;
  });

  it('Passo 10 — SPECIALIST cria price proposal → draft', async () => {
    const res = await request(app.getHttpServer())
      .post('/price-proposals')
      .set('Authorization', `Bearer ${tokenSpecialist}`)
      .send({
        productId,
        proposedPrice: 45.00,
        currency:      'USD',
        justification: 'Preço baseado no mercado regional de cimento',
        validFrom:     '2026-01-01T00:00:00.000Z',
        validTo:       '2026-12-31T23:59:59.000Z',
      })
      .expect(201);

    expect(res.body.status).toBe('draft');
    proposalId = res.body.id;
  });

  it('Passo 11 — SPECIALIST submete proposta → submitted', async () => {
    const res = await request(app.getHttpServer())
      .post(`/price-proposals/${proposalId}/submit`)
      .set('Authorization', `Bearer ${tokenSpecialist}`)
      .expect(200);

    expect(res.body.status).toBe('submitted');
    expect(res.body.submittedAt).toBeDefined();
  });

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 4 — STATE APROVA PRODUTO E PROPOSTA
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 12/13 — STATE publica produto → published_official', async () => {
    const res = await request(app.getHttpServer())
      .post(`/products/${productId}/approve-publication`)
      .set('Authorization', `Bearer ${tokenState}`)
      .expect(200);

    expect(res.body.status).toBe('published_official');
    expect(res.body.publishedAt).toBeDefined();
  });

  it('Passo 14 — STATE aprova proposta → approved + snapshot gerado', async () => {
    const res = await request(app.getHttpServer())
      .post(`/price-proposals/${proposalId}/approve`)
      .set('Authorization', `Bearer ${tokenState}`)
      .expect(200);

    expect(res.body.status).toBe('approved');
    expect(res.body.snapshot).toBeDefined();
    expect(res.body.snapshot.immutable).toBe(true);
    expect(res.body.snapshot.approvedPriceUsd).toBe(45);
    expect(res.body.snapshot.productId).toBe(productId);
  });

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 5 — PEDIDO E PAGAMENTO
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 15 — LOGIN BUYER → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'buyer@lobito.biz', password: PASSWORD })
      .expect(201);

    expect(res.body.user.role).toBe('buyer');
    tokenBuyer = res.body.access_token;
  });

  it('Passo 16 — BUYER cria pedido → draft', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .set('Authorization', `Bearer ${tokenBuyer}`)
      .send({
        companyId,
        lines: [{ productId, priceProposalId: proposalId, qty: 10 }],
      })
      .expect(201);

    expect(res.body.status).toBe('draft');
    expect(res.body.lines).toHaveLength(1);
    orderId = res.body.id;
  });

  it('Passo 17 — BUYER paga pedido → total = net + tax (snapshot)', async () => {
    const res = await request(app.getHttpServer())
      .post(`/orders/${orderId}/pay`)
      .set('Authorization', `Bearer ${tokenBuyer}`)
      .expect(200);

    expect(res.body.status).toBe('paid');
    expect(res.body.paidAt).toBeDefined();

    // Angola: 14% IVA | 10 unidades × $45 = $450 net | $63 tax | $513 total
    const net   = Number(res.body.netAmount);
    const tax   = Number(res.body.taxAmount);
    const total = Number(res.body.totalAmount);

    expect(net).toBeCloseTo(450, 1);
    expect(tax).toBeCloseTo(63, 1);   // 450 × 14%
    expect(total).toBeCloseTo(513, 1);
  });

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 6 — EMBARQUE E ALFÂNDEGA
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 18 — LOGIN OPERATOR → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'operator@lobito.biz', password: PASSWORD })
      .expect(201);

    expect(res.body.user.role).toBe('operator');
    tokenOperator = res.body.access_token;
  });

  it('Passo 19 — OPERATOR cria embarque → created', async () => {
    const res = await request(app.getHttpServer())
      .post('/shipments')
      .set('Authorization', `Bearer ${tokenOperator}`)
      .send({
        orderId,
        origin:      'Porto do Lobito, Angola',
        destination: 'Lusaka, Zâmbia',
        eta:         '2026-06-15T08:00:00.000Z',
      })
      .expect(201);

    expect(res.body.status).toBe('created');
    shipmentId = res.body.id;
  });

  it('Passo 20 — OPERATOR actualiza tracking → evento acrescentado', async () => {
    const res = await request(app.getHttpServer())
      .put(`/shipments/${shipmentId}/tracking`)
      .set('Authorization', `Bearer ${tokenOperator}`)
      .send({
        location: 'Fronteira Malanje km 142',
        status:   'in_transit',
        notes:    'Sem incidentes',
      })
      .expect(200);

    expect(res.body.status).toBe('in_transit');
    expect(res.body.lastLocation).toBe('Fronteira Malanje km 142');
    expect(Array.isArray(res.body.trackingEvents)).toBe(true);
    expect(res.body.trackingEvents.length).toBeGreaterThanOrEqual(1);
  });

  it('Passo 21 — LOGIN CUSTOMS → JWT', async () => {
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'customs@lobito.gov', password: PASSWORD })
      .expect(201);

    expect(res.body.user.role).toBe('customs');
    tokenCustoms = res.body.access_token;
  });

  it('Passo 22 — CUSTOMS aprova embarque → customs_approved', async () => {
    const res = await request(app.getHttpServer())
      .post(`/shipments/${shipmentId}/approve`)
      .set('Authorization', `Bearer ${tokenCustoms}`)
      .send({ notes: 'Documentação conforme. Aprovado.' })
      .expect(201);

    expect(res.body.status).toBe('approved');
  }, 15_000);

  // ════════════════════════════════════════════════════════════════════════
  // BLOCO 7 — AUDIT LOG
  // ════════════════════════════════════════════════════════════════════════

  it('Passo 23/24 — STATE lê audit trail do pedido', async () => {
    const res = await request(app.getHttpServer())
      .get(`/logs?entity=order&entityId=${orderId}`)
      .set('Authorization', `Bearer ${tokenState}`)
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(2); // CREATE_ORDER + PAY_ORDER

    const actions = res.body.map((l: any) => l.action);
    expect(actions).toContain('CREATE_ORDER');
    expect(actions).toContain('PAY_ORDER');
  });

  // ════════════════════════════════════════════════════════════════════════
  // TESTES DE RBAC
  // ════════════════════════════════════════════════════════════════════════

  describe('RBAC — Acessos negados', () => {
    it('Rota protegida sem token → 401', async () => {
      await request(app.getHttpServer())
        .get('/companies')
        .expect(401);
    });

    it('Token válido com role errado → 403 (BUYER aprova licença)', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/approve-license`)
        .set('Authorization', `Bearer ${tokenBuyer}`)
        .send({ licenseNumber: 'X', licenseExpiresAt: '2028-01-01T00:00:00.000Z' })
        .expect(403);
    });

    it('STAFF tenta aprovar licença → 403', async () => {
      await request(app.getHttpServer())
        .post(`/companies/${companyId}/approve-license`)
        .set('Authorization', `Bearer ${tokenStaff}`)
        .send({ licenseNumber: 'X', licenseExpiresAt: '2028-01-01T00:00:00.000Z' })
        .expect(403);
    });

    it('BUYER tenta criar produto → 403', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('Authorization', `Bearer ${tokenBuyer}`)
        .send({ name: 'X', category: 'general', companyId })
        .expect(403);
    });

    it('SPECIALIST tenta aprovar price proposal → 403', async () => {
      await request(app.getHttpServer())
        .post(`/price-proposals/${proposalId}/approve`)
        .set('Authorization', `Bearer ${tokenSpecialist}`)
        .expect(403);
    });

    it('PUT em proposta aprovada → 403 (imutabilidade)', async () => {
      await request(app.getHttpServer())
        .put(`/price-proposals/${proposalId}`)
        .set('Authorization', `Bearer ${tokenSpecialist}`)
        .send({ proposedPrice: 999 })
        .expect(403);
    });

    it('BUYER tenta criar embarque → 403', async () => {
      await request(app.getHttpServer())
        .post('/shipments')
        .set('Authorization', `Bearer ${tokenBuyer}`)
        .send({ orderId, origin: 'X', destination: 'Y' })
        .expect(403);
    });

    it('OPERATOR tenta aprovar embarque → 403', async () => {
      await request(app.getHttpServer())
        .post(`/shipments/${shipmentId}/approve`)
        .set('Authorization', `Bearer ${tokenOperator}`)
        .send({})
        .expect(403);
    });

    it('STAFF tenta bloquear pedido → 403', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/block`)
        .set('Authorization', `Bearer ${tokenStaff}`)
        .send({ reason: 'Tentativa não autorizada' })
        .expect(403);
    });

    it('Qualquer role tenta POST /logs → 404 (rota inexistente)', async () => {
      await request(app.getHttpServer())
        .post('/logs')
        .set('Authorization', `Bearer ${tokenState}`)
        .send({})
        .expect(404);
    });
  });
});
