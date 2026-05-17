import { Injectable, HttpException, HttpStatus } from '@nestjs/common';

interface AttemptRecord {
  count:       number;
  blockedUntil: Date | null;
  lastAttempt: Date;
}

// Progressão de bloqueio por EMAIL (produção e desenvolvimento):
// 1-4   → sem bloqueio
// 5-6   → bloqueio 1 min
// 7-9   → bloqueio 5 min
// 10-14 → bloqueio 15 min
// 15+   → bloqueio 60 min + audit
const PENALTY_SCHEDULE = [
  { threshold: 15, blockSeconds: 3600, severity: 'critical' },
  { threshold: 10, blockSeconds: 900,  severity: 'high'     },
  { threshold: 7,  blockSeconds: 300,  severity: 'medium'   },
  { threshold: 5,  blockSeconds: 60,   severity: 'low'      },
] as const;

// IPs locais/internos — aplicar limiares mais altos para não bloquear desenvolvimento
const LOCAL_IPS = new Set(['::1', '127.0.0.1', 'localhost', '::ffff:127.0.0.1']);
const IS_DEV    = process.env.NODE_ENV !== 'production';

// Janela de limpeza automática: tentativas expiram após 30 minutos de inactividade
const INACTIVITY_TTL_MS = 30 * 60 * 1000;

@Injectable()
export class LoginRateLimiterService {
  // Dupla chave: por email e por IP — ambos verificados independentemente
  private readonly byEmail = new Map<string, AttemptRecord>();
  private readonly byIp    = new Map<string, AttemptRecord>();

  // Registo de bloqueios para auditoria
  private readonly blockLog: Array<{
    key:        string;
    keyType:    'email' | 'ip';
    attempts:   number;
    severity:   string;
    blockedAt:  Date;
    blockedUntil: Date;
  }> = [];

  /**
   * Regista uma tentativa falhada e aplica bloqueio progressivo se necessário.
   * Deve ser chamado ANTES de validar as credenciais para bloquear por IP,
   * e DEPOIS de identificar o email para bloquear por email.
   */
  recordFailedAttempt(email: string, ip: string): void {
    this.increment(this.byEmail, email.toLowerCase(), 'email');
    this.increment(this.byIp,    ip,                  'ip');
  }

  /**
   * Limpa os contadores de um email após login bem-sucedido.
   */
  resetOnSuccess(email: string, ip: string): void {
    this.byEmail.delete(email.toLowerCase());
    this.byIp.delete(ip);
  }

  /**
   * Verifica se o email ou IP estão bloqueados.
   * Lança 429 com mensagem clara e segundos restantes.
   */
  checkBlocked(email: string, ip: string): void {
    this.assertNotBlocked(this.byEmail, email.toLowerCase(), 'email');
    // Em desenvolvimento, IPs locais têm limiar mais alto — não bloquear localhost
    if (!IS_DEV || !LOCAL_IPS.has(ip)) {
      this.assertNotBlocked(this.byIp, ip, 'IP');
    }
  }

  /**
   * Retorna os últimos bloqueios registados (para auditoria/dashboard).
   */
  getBlockLog(limit = 50) {
    return this.blockLog.slice(-limit).reverse();
  }

  // ─── Helpers privados ──────────────────────────────────────────────────────

  private getOrCreate(map: Map<string, AttemptRecord>, key: string): AttemptRecord {
    if (!map.has(key)) {
      map.set(key, { count: 0, blockedUntil: null, lastAttempt: new Date() });
    }
    return map.get(key)!;
  }

  private increment(
    map:     Map<string, AttemptRecord>,
    key:     string,
    keyType: 'email' | 'ip',
  ): void {
    this.evictExpired(map);
    const record = this.getOrCreate(map, key);
    record.count++;
    record.lastAttempt = new Date();

    // Verificar se deve aplicar bloqueio progressivo
    for (const { threshold, blockSeconds, severity } of PENALTY_SCHEDULE) {
      if (record.count >= threshold && !this.isBlocked(record)) {
        const until = new Date(Date.now() + blockSeconds * 1000);
        record.blockedUntil = until;

        this.blockLog.push({
          key,
          keyType,
          attempts:    record.count,
          severity,
          blockedAt:   new Date(),
          blockedUntil: until,
        });

        // Manter log com máximo de 1000 entradas
        if (this.blockLog.length > 1000) this.blockLog.shift();
        break;
      }
    }
  }

  private assertNotBlocked(
    map:     Map<string, AttemptRecord>,
    key:     string,
    keyType: string,
  ): void {
    const record = map.get(key);
    if (!record) return;

    if (this.isBlocked(record)) {
      const secondsLeft = Math.ceil(
        (record.blockedUntil!.getTime() - Date.now()) / 1000,
      );
      throw new HttpException(
        {
          statusCode:  429,
          error:       'Too Many Requests',
          message:     `Demasiadas tentativas de login. Aguarde ${secondsLeft} segundos antes de tentar novamente.`,
          retryAfter:  secondsLeft,
          blockedBy:   keyType,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  private isBlocked(record: AttemptRecord): boolean {
    if (!record.blockedUntil) return false;
    if (record.blockedUntil <= new Date()) {
      // Bloqueio expirou — limpar
      record.blockedUntil = null;
      record.count        = 0;
      return false;
    }
    return true;
  }

  private evictExpired(map: Map<string, AttemptRecord>): void {
    const cutoff = new Date(Date.now() - INACTIVITY_TTL_MS);
    for (const [key, record] of map.entries()) {
      if (record.lastAttempt < cutoff && !this.isBlocked(record)) {
        map.delete(key);
      }
    }
  }
}
