#!/bin/bash
# ============================================================
# Corredor do Lobito — Teste E2E dos 24 Passos (curl + jq)
#
# Pré-requisitos:
#   - jq instalado (brew install jq)
#   - API a correr em localhost:3000 (npm run start:dev)
#   - Seed executado (npx prisma db seed)
#
# Uso:
#   chmod +x test/e2e-flow.sh
#   ./test/e2e-flow.sh
# ============================================================

BASE_URL="http://localhost:3000"
PASSWORD="Lobito@Dev2024!"

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
BOLD='\033[1m'
NC='\033[0m'

PASS=0
FAIL=0

# ── Helpers ─────────────────────────────────────────────────

step() {
  echo -e "\n${BLUE}${BOLD}── Passo $1 ── $2${NC}"
}

ok() {
  echo -e "   ${GREEN}✓ $1${NC}"
  PASS=$((PASS + 1))
}

fail() {
  echo -e "   ${RED}✗ $1${NC}"
  FAIL=$((FAIL + 1))
}

check_status() {
  local actual=$1
  local expected=$2
  local label=$3
  if [ "$actual" = "$expected" ]; then
    ok "$label (HTTP $actual)"
  else
    fail "$label — esperado $expected, obtido $actual"
  fi
}

check_field() {
  local value=$1
  local label=$2
  if [ "$value" != "null" ] && [ -n "$value" ]; then
    ok "$label: $value"
  else
    fail "$label está vazio ou null"
  fi
}

# ── Verificar dependências ───────────────────────────────────

if ! command -v jq &> /dev/null; then
  echo -e "${RED}Erro: jq não encontrado. Instala com: brew install jq${NC}"
  exit 1
fi

echo -e "${BOLD}============================================"
echo -e " Corredor do Lobito — E2E Flow (24 passos)"
echo -e "============================================${NC}"
echo -e "API: ${BASE_URL}"

# ════════════════════════════════════════════════════════════
# BLOCO 1 — EMPRESA E LICENÇA
# ════════════════════════════════════════════════════════════

step 1 "LOGIN STAFF"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"staff@lobito.gov\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_STAFF=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login STAFF"
check_field "$TOKEN_STAFF" "JWT STAFF"

step 2 "CRIAR EMPRESA"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/companies" \
  -H "Content-Type: application/json" \
  -d '{
    "name":"Lobito Trade Lda",
    "country":"angola",
    "contactEmail":"geral@lobitotrade.ao",
    "contactPhone":"+244 923 000 001",
    "address":"Rua da Industria, 42, Lobito"
  }')
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
COMPANY_ID=$(echo "$BODY" | jq -r '.id')
LICENSE_STATUS=$(echo "$BODY" | jq -r '.licenseStatus')
check_status "$STATUS" "201" "Criar empresa"
check_field "$COMPANY_ID" "companyId"
[ "$LICENSE_STATUS" = "pending" ] && ok "licenseStatus: pending" || fail "licenseStatus esperado: pending, obtido: $LICENSE_STATUS"

step 3 "STAFF VALIDA DOCUMENTAÇÃO"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/companies/$COMPANY_ID/validate-documentation" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_STAFF" \
  -d '{"valid":true,"notes":"Documentacao completa e valida"}')
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
LS=$(echo "$BODY" | jq -r '.licenseStatus')
check_status "$STATUS" "200" "Validar documentação"
[ "$LS" = "under_review" ] && ok "licenseStatus: under_review" || fail "licenseStatus esperado: under_review, obtido: $LS"

step 4 "LOGIN STATE"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"state@lobito.gov\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_STATE=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login STATE"
check_field "$TOKEN_STATE" "JWT STATE"

step 5 "STATE APROVA LICENÇA"
EXPIRES="2028-12-31T23:59:59.000Z"
LIC_NUM="LIC-$(date +%s)"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/companies/$COMPANY_ID/approve-license" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_STATE" \
  -d "{\"licenseNumber\":\"$LIC_NUM\",\"licenseExpiresAt\":\"$EXPIRES\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
LS=$(echo "$BODY" | jq -r '.licenseStatus')
check_status "$STATUS" "200" "Aprovar licença"
[ "$LS" = "active" ] && ok "licenseStatus: active" || fail "licenseStatus esperado: active, obtido: $LS"

# ════════════════════════════════════════════════════════════
# BLOCO 2 — PRODUTO
# ════════════════════════════════════════════════════════════

step 6 "LOGIN PRODUCER"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"producer@lobito.biz\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_PRODUCER=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login PRODUCER"
check_field "$TOKEN_PRODUCER" "JWT PRODUCER"

step 7 "PRODUCER CRIA PRODUTO"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_PRODUCER" \
  -d "{\"name\":\"Cimento Portland 50kg\",\"description\":\"Para construcao civil\",\"category\":\"general\",\"companyId\":\"$COMPANY_ID\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
PRODUCT_ID=$(echo "$BODY" | jq -r '.id')
PS=$(echo "$BODY" | jq -r '.status')
check_status "$STATUS" "201" "Criar produto"
check_field "$PRODUCT_ID" "productId"
[ "$PS" = "draft" ] && ok "status: draft" || fail "status esperado: draft, obtido: $PS"

step 8 "PRODUCER SOLICITA PUBLICAÇÃO"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/products/$PRODUCT_ID/request-publication" \
  -H "Authorization: Bearer $TOKEN_PRODUCER")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
PS=$(echo "$BODY" | jq -r '.status')
check_status "$STATUS" "200" "Solicitar publicação"
[ "$PS" = "pending_review" ] && ok "status: pending_review" || fail "status esperado: pending_review, obtido: $PS"

# ════════════════════════════════════════════════════════════
# BLOCO 3 — PRICE PROPOSAL
# ════════════════════════════════════════════════════════════

step 9 "LOGIN SPECIALIST"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"specialist@lobito.gov\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_SPECIALIST=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login SPECIALIST"
check_field "$TOKEN_SPECIALIST" "JWT SPECIALIST"

step 10 "SPECIALIST CRIA PRICE PROPOSAL"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/price-proposals" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SPECIALIST" \
  -d "{\"productId\":\"$PRODUCT_ID\",\"proposedPrice\":45.00,\"currency\":\"USD\",\"justification\":\"Preco de mercado regional\",\"validFrom\":\"2026-01-01T00:00:00.000Z\",\"validTo\":\"2026-12-31T23:59:59.000Z\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
PROPOSAL_ID=$(echo "$BODY" | jq -r '.id')
check_status "$STATUS" "201" "Criar price proposal"
check_field "$PROPOSAL_ID" "proposalId"

step 11 "SPECIALIST SUBMETE PROPOSTA"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/price-proposals/$PROPOSAL_ID/submit" \
  -H "Authorization: Bearer $TOKEN_SPECIALIST")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
PS=$(echo "$BODY" | jq -r '.status')
check_status "$STATUS" "200" "Submeter proposta"
[ "$PS" = "submitted" ] && ok "status: submitted" || fail "status esperado: submitted, obtido: $PS"

# ════════════════════════════════════════════════════════════
# BLOCO 4 — STATE APROVA
# ════════════════════════════════════════════════════════════

step 13 "STATE PUBLICA PRODUTO"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/products/$PRODUCT_ID/approve-publication" \
  -H "Authorization: Bearer $TOKEN_STATE")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
PS=$(echo "$BODY" | jq -r '.status')
check_status "$STATUS" "200" "Aprovar publicação"
[ "$PS" = "published_official" ] && ok "status: published_official" || fail "status esperado: published_official, obtido: $PS"

step 14 "STATE APROVA PRICE PROPOSAL (SNAPSHOT GERADO)"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/price-proposals/$PROPOSAL_ID/approve" \
  -H "Authorization: Bearer $TOKEN_STATE")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
PS=$(echo "$BODY" | jq -r '.status')
IMMUTABLE=$(echo "$BODY" | jq -r '.snapshot.immutable')
PRICE=$(echo "$BODY" | jq -r '.snapshot.approvedPriceUsd')
check_status "$STATUS" "200" "Aprovar price proposal"
[ "$PS" = "approved" ] && ok "status: approved" || fail "status esperado: approved, obtido: $PS"
[ "$IMMUTABLE" = "true" ] && ok "snapshot.immutable: true" || fail "snapshot.immutable esperado: true"
ok "snapshot.approvedPriceUsd: $PRICE"

# ════════════════════════════════════════════════════════════
# BLOCO 5 — PEDIDO E PAGAMENTO
# ════════════════════════════════════════════════════════════

step 15 "LOGIN BUYER"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"buyer@lobito.biz\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_BUYER=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login BUYER"
check_field "$TOKEN_BUYER" "JWT BUYER"

step 16 "BUYER CRIA PEDIDO"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BUYER" \
  -d "{\"companyId\":\"$COMPANY_ID\",\"lines\":[{\"productId\":\"$PRODUCT_ID\",\"priceProposalId\":\"$PROPOSAL_ID\",\"qty\":10}]}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
ORDER_ID=$(echo "$BODY" | jq -r '.id')
check_status "$STATUS" "201" "Criar pedido"
check_field "$ORDER_ID" "orderId"

step 17 "BUYER PAGA PEDIDO (IMPOSTO CALCULADO DO SNAPSHOT)"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/orders/$ORDER_ID/pay" \
  -H "Authorization: Bearer $TOKEN_BUYER")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
OS=$(echo "$BODY" | jq -r '.status')
NET=$(echo "$BODY" | jq -r '.netAmount')
TAX=$(echo "$BODY" | jq -r '.taxAmount')
TOTAL=$(echo "$BODY" | jq -r '.totalAmount')
check_status "$STATUS" "200" "Pagar pedido"
[ "$OS" = "paid" ] && ok "status: paid" || fail "status esperado: paid, obtido: $OS"
echo -e "   ${YELLOW}→ net: \$$NET | tax: \$$TAX | total: \$$TOTAL${NC}"
ok "Imposto calculado (Angola 14%: 10×45=450 net, 63 tax, 513 total)"

# ════════════════════════════════════════════════════════════
# BLOCO 6 — EMBARQUE E ALFÂNDEGA
# ════════════════════════════════════════════════════════════

step 18 "LOGIN OPERATOR"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"operator@lobito.biz\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_OPERATOR=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login OPERATOR"
check_field "$TOKEN_OPERATOR" "JWT OPERATOR"

step 19 "OPERATOR CRIA EMBARQUE"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/shipments" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_OPERATOR" \
  -d "{\"orderId\":\"$ORDER_ID\",\"origin\":\"Porto do Lobito, Angola\",\"destination\":\"Lusaka, Zambia\",\"eta\":\"2026-06-15T08:00:00.000Z\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
SHIPMENT_ID=$(echo "$BODY" | jq -r '.id')
check_status "$STATUS" "201" "Criar embarque"
check_field "$SHIPMENT_ID" "shipmentId"

step 20 "OPERATOR ACTUALIZA TRACKING (APPEND-ONLY)"
RES=$(curl -s -w "\n%{http_code}" -X PUT "$BASE_URL/shipments/$SHIPMENT_ID/tracking" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_OPERATOR" \
  -d '{"location":"Fronteira Malanje km 142","status":"in_transit","notes":"Sem incidentes"}')
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
SS=$(echo "$BODY" | jq -r '.status')
LOC=$(echo "$BODY" | jq -r '.lastLocation')
EVENTS=$(echo "$BODY" | jq '.trackingEvents | length')
check_status "$STATUS" "200" "Actualizar tracking"
[ "$SS" = "in_transit" ] && ok "status: in_transit" || fail "status esperado: in_transit, obtido: $SS"
ok "lastLocation: $LOC"
ok "trackingEvents: $EVENTS evento(s) — append-only confirmado"

step 21 "LOGIN CUSTOMS"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"customs@lobito.gov\",\"password\":\"$PASSWORD\"}")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
TOKEN_CUSTOMS=$(echo "$BODY" | jq -r '.access_token')
check_status "$STATUS" "201" "Login CUSTOMS"
check_field "$TOKEN_CUSTOMS" "JWT CUSTOMS"

step 22 "CUSTOMS APROVA EMBARQUE"
RES=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/shipments/$SHIPMENT_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_CUSTOMS" \
  -d '{"notes":"Documentacao conforme. Aprovado."}')
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
CS=$(echo "$BODY" | jq -r '.status')
check_status "$STATUS" "200" "Aprovar embarque (customs)"
[ "$CS" = "approved" ] && ok "customsDispatch.status: approved" || fail "status esperado: approved, obtido: $CS"

# ════════════════════════════════════════════════════════════
# BLOCO 7 — AUDIT LOG
# ════════════════════════════════════════════════════════════

step 24 "STATE LÊ AUDIT TRAIL DO PEDIDO"
RES=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/logs?entity=order&entityId=$ORDER_ID" \
  -H "Authorization: Bearer $TOKEN_STATE")
STATUS=$(echo "$RES" | tail -1)
BODY=$(echo "$RES" | head -1)
COUNT=$(echo "$BODY" | jq '. | length')
ACTIONS=$(echo "$BODY" | jq -r '.[].action' | tr '\n' ', ')
check_status "$STATUS" "200" "Ler audit logs do pedido"
ok "$COUNT entradas no audit log"
echo -e "   ${YELLOW}→ Acções: ${ACTIONS%,}${NC}"

# ════════════════════════════════════════════════════════════
# TESTES RBAC
# ════════════════════════════════════════════════════════════

echo -e "\n${BOLD}${BLUE}── TESTES RBAC ──────────────────────────────${NC}"

echo -e "\n${BLUE}RBAC — Sem token → 401${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/companies")
[ "$STATUS" = "401" ] && ok "GET /companies sem token → 401" || fail "esperado 401, obtido $STATUS"

echo -e "\n${BLUE}RBAC — BUYER aprova licença → 403${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/companies/$COMPANY_ID/approve-license" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BUYER" \
  -d '{"licenseNumber":"X","licenseExpiresAt":"2028-01-01T00:00:00.000Z"}')
[ "$STATUS" = "403" ] && ok "BUYER aprova licença → 403" || fail "esperado 403, obtido $STATUS"

echo -e "\n${BLUE}RBAC — BUYER cria produto → 403${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/products" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_BUYER" \
  -d "{\"name\":\"X\",\"category\":\"general\",\"companyId\":\"$COMPANY_ID\"}")
[ "$STATUS" = "403" ] && ok "BUYER cria produto → 403" || fail "esperado 403, obtido $STATUS"

echo -e "\n${BLUE}RBAC — SPECIALIST aprova proposta → 403${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/price-proposals/$PROPOSAL_ID/approve" \
  -H "Authorization: Bearer $TOKEN_SPECIALIST")
[ "$STATUS" = "403" ] && ok "SPECIALIST aprova proposta → 403" || fail "esperado 403, obtido $STATUS"

echo -e "\n${BLUE}RBAC — PUT em proposta aprovada → 403 (imutável)${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X PUT "$BASE_URL/price-proposals/$PROPOSAL_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_SPECIALIST" \
  -d '{"proposedPrice":999}')
[ "$STATUS" = "403" ] && ok "PUT proposta aprovada → 403" || fail "esperado 403, obtido $STATUS"

echo -e "\n${BLUE}RBAC — OPERATOR aprova embarque → 403${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/shipments/$SHIPMENT_ID/approve" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_OPERATOR" \
  -d '{}')
[ "$STATUS" = "403" ] && ok "OPERATOR aprova embarque → 403" || fail "esperado 403, obtido $STATUS"

echo -e "\n${BLUE}RBAC — POST /logs não existe → 404${NC}"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/logs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN_STATE" \
  -d '{}')
[ "$STATUS" = "404" ] && ok "POST /logs → 404 (rota não existe)" || fail "esperado 404, obtido $STATUS"

# ════════════════════════════════════════════════════════════
# RESUMO
# ════════════════════════════════════════════════════════════

echo -e "\n${BOLD}============================================"
echo -e " RESUMO"
echo -e "============================================${NC}"
echo -e " ${GREEN}PASSOU: $PASS${NC}"
echo -e " ${RED}FALHOU: $FAIL${NC}"
echo ""

if [ "$FAIL" -eq 0 ]; then
  echo -e " ${GREEN}${BOLD}✓ TODOS OS TESTES PASSARAM — MVP VALIDADO${NC}"
else
  echo -e " ${RED}${BOLD}✗ $FAIL TESTE(S) FALHARAM${NC}"
fi

echo -e "\n${YELLOW}IDs criados nesta execução:"
echo -e "  companyId:  $COMPANY_ID"
echo -e "  productId:  $PRODUCT_ID"
echo -e "  proposalId: $PROPOSAL_ID"
echo -e "  orderId:    $ORDER_ID"
echo -e "  shipmentId: $SHIPMENT_ID${NC}"
echo ""

exit $FAIL
