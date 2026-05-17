const TYPE_LABELS: Record<string, string> = {
  license:  'Licença Comercial',
  invoice:  'Fatura Comercial',
  receipt:  'Recibo de Pagamento',
  dispatch: 'Despacho Aduaneiro',
};

const TYPE_ICONS: Record<string, string> = {
  license:  '🏛️',
  invoice:  '🧾',
  receipt:  '✅',
  dispatch: '🛃',
};

function fmtDate(d: string | null | undefined): string {
  if (!d) return 'N/A';
  return new Date(d).toLocaleDateString('pt-PT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function fmtMoney(v: string | number | null | undefined, cur = 'USD'): string {
  if (v == null) return 'N/A';
  return `${parseFloat(String(v)).toFixed(2)} ${cur}`;
}

function rows(data: Record<string, any>): string {
  const skip = new Set(['valid','type','message','verifiedAt','hasDocument']);
  const labels: Record<string, string> = {
    documentCode:    'Nº Documento',
    entity:          'Entidade',
    entityCode:      'Código',
    licenseNumber:   'Nº Licença',
    expiresAt:       'Válida até',
    isExpired:       'Expirada',
    verifiedByState: 'Verificado pelo STATE',
    country:         'País',
    status:          'Estado',
    orderCode:       'Pedido',
    transactionCode: 'Referência Transação',
    buyerCompany:    'Empresa Compradora',
    buyerCountry:    'País Comprador',
    orderStatus:     'Estado do Pedido',
    totalAmount:     'Total',
    taxAmount:       'Imposto',
    netAmount:       'Líquido',
    currency:        'Moeda',
    paidAt:          'Pago em',
    amount:          'Valor',
    method:          'Método de Pagamento',
    transactionStatus: 'Estado da Transação',
    documentCode2:   'Código Despacho',
    shipmentCode:    'Embarque',
    origin:          'Origem',
    destination:     'Destino',
    eta:             'ETA',
    shipmentStatus:  'Estado do Embarque',
    dispatchStatus:  'Estado do Despacho',
    approvedAt:      'Aprovado em',
  };

  const methodMap: Record<string, string> = {
    bank_transfer:    'Transferência Bancária',
    cash:             'Numerário',
    credit_card:      'Cartão de Crédito',
    letter_of_credit: 'Carta de Crédito',
    other:            'Outro',
  };

  const countryMap: Record<string, string> = {
    angola: 'Angola', zambia: 'Zâmbia', drc: 'RDC',
    tanzania: 'Tanzânia', zimbabwe: 'Zimbabwe', mozambique: 'Moçambique',
  };

  return Object.entries(data)
    .filter(([k]) => !skip.has(k) && data[k] != null)
    .map(([k, v]) => {
      const label = labels[k] ?? k;
      let val = String(v);

      if (typeof v === 'boolean')   val = v ? 'Sim' : 'Não';
      if (k.endsWith('At') || k === 'expiresAt' || k === 'paidAt' || k === 'eta')
        val = fmtDate(val);
      if (k === 'totalAmount' || k === 'taxAmount' || k === 'netAmount' || k === 'amount')
        val = fmtMoney(v, data.currency ?? 'USD');
      if (k === 'method')    val = methodMap[val] ?? val;
      if (k === 'country' || k === 'buyerCountry') val = countryMap[val] ?? val;
      if (k === 'status' || k.endsWith('Status'))  val = val.toUpperCase().replace(/_/g, ' ');

      return `
        <div class="row">
          <span class="label">${label}</span>
          <span class="value">${val}</span>
        </div>`;
    }).join('');
}

export function buildHtml(data: Record<string, any>): string {
  const valid     = data.valid === true;
  const type      = data.type ?? 'document';
  const typeLabel = TYPE_LABELS[type] ?? 'Documento';
  const typeIcon  = TYPE_ICONS[type]  ?? '📄';
  const badgeColor = valid ? '#16a34a' : '#dc2626';
  const badgeBg    = valid ? '#f0fdf4' : '#fef2f2';
  const badgeText  = valid ? '✅ VÁLIDO' : '❌ INVÁLIDO';
  const statusBorder = valid ? '#16a34a' : '#dc2626';

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <title>Verificação — ${typeLabel} | Corredor do Lobito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #f1f5f9;
      min-height: 100vh;
      padding: 16px;
    }

    .container {
      max-width: 480px;
      margin: 0 auto;
    }

    /* Header */
    .header {
      background: #1a3a6b;
      border-radius: 16px 16px 0 0;
      padding: 20px 24px 16px;
      text-align: center;
    }
    .header-title {
      color: #fff;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }
    .header-sub {
      color: #93c5fd;
      font-size: 12px;
      margin-top: 4px;
    }

    /* Badge de estado */
    .badge-wrap {
      background: ${badgeBg};
      border: 2px solid ${statusBorder};
      border-top: none;
      padding: 20px 24px;
      text-align: center;
    }
    .badge {
      display: inline-block;
      background: ${badgeColor};
      color: #fff;
      font-size: 20px;
      font-weight: 800;
      padding: 10px 32px;
      border-radius: 50px;
      letter-spacing: 1px;
    }
    .doc-type {
      margin-top: 12px;
      font-size: 15px;
      color: #1e3a5f;
      font-weight: 600;
    }
    .doc-type-icon {
      font-size: 28px;
      margin-bottom: 4px;
      display: block;
    }
    .message {
      margin-top: 8px;
      font-size: 13px;
      color: #374151;
    }

    /* Card de detalhes */
    .card {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-top: none;
      padding: 0 24px 8px;
    }
    .card-title {
      font-size: 11px;
      font-weight: 700;
      color: #64748b;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 16px 0 8px;
      border-bottom: 1px solid #f1f5f9;
    }
    .row {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 10px 0;
      border-bottom: 1px solid #f8fafc;
      gap: 12px;
    }
    .row:last-child { border-bottom: none; }
    .label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      min-width: 120px;
      flex-shrink: 0;
    }
    .value {
      font-size: 13px;
      color: #0f172a;
      font-weight: 600;
      text-align: right;
      word-break: break-word;
    }

    /* Footer */
    .footer {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-top: none;
      border-radius: 0 0 16px 16px;
      padding: 14px 24px;
      text-align: center;
    }
    .footer-ts {
      font-size: 11px;
      color: #94a3b8;
    }
    .footer-logo {
      font-size: 13px;
      font-weight: 700;
      color: #1a3a6b;
      margin-bottom: 4px;
    }
    .footer-link {
      font-size: 11px;
      color: #3b82f6;
      text-decoration: none;
    }

    /* Responsivo extra pequeno */
    @media (max-width: 360px) {
      body { padding: 8px; }
      .badge { font-size: 16px; padding: 8px 20px; }
      .label { min-width: 100px; }
    }
  </style>
</head>
<body>
  <div class="container">

    <div class="header">
      <div class="header-title">🏛 CORREDOR DO LOBITO</div>
      <div class="header-sub">Sistema Oficial de Verificação de Documentos</div>
    </div>

    <div class="badge-wrap">
      <span class="doc-type-icon">${typeIcon}</span>
      <div class="badge">${badgeText}</div>
      <div class="doc-type">${typeLabel}</div>
      <div class="message">${data.message ?? ''}</div>
    </div>

    <div class="card">
      <div class="card-title">Detalhes do Documento</div>
      ${rows(data)}
    </div>

    <div class="footer">
      <div class="footer-logo">Corredor do Lobito</div>
      <div class="footer-ts">Verificado em: ${fmtDate(data.verifiedAt)}</div>
      <br>
      <a class="footer-link" href="https://corredor-lobito.gov">corredor-lobito.gov</a>
    </div>

  </div>
</body>
</html>`;
}
