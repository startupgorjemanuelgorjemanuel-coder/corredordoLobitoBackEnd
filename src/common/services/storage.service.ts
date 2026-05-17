import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private _supabase: SupabaseClient | null = null;
  private readonly logger = new Logger(StorageService.name);

  constructor(private config: ConfigService) {}

  private getClient(): SupabaseClient {
    if (this._supabase) return this._supabase;

    // Usar SUPABASE_API_URL para evitar conflito com a variável SUPABASE_URL
    // que o Railway injeta automaticamente como connection string PostgreSQL (postgresql://...)
    const url = this.config.get<string>('SUPABASE_API_URL')
             ?? this.config.get<string>('SUPABASE_URL');
    const key = this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY');

    if (!url || !url.startsWith('https://')) {
      this.logger.error(`SUPABASE_API_URL inválida: "${url}". Deve ser https://xxx.supabase.co`);
      throw new InternalServerErrorException('Storage não configurado — SUPABASE_API_URL em falta ou inválida.');
    }
    if (!key) {
      this.logger.error('SUPABASE_SERVICE_ROLE_KEY não está definida.');
      throw new InternalServerErrorException('Storage não configurado — SUPABASE_SERVICE_ROLE_KEY em falta.');
    }

    this._supabase = createClient(url, key);
    return this._supabase;
  }

  async upload(
    bucket: string,
    path: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ storageUrl: string; storagePath: string }> {
    const { error } = await this.getClient().storage
      .from(bucket)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      throw new InternalServerErrorException(`Storage upload falhou: ${error.message}`);
    }

    const { data } = this.getClient().storage.from(bucket).getPublicUrl(path);
    return {
      storageUrl:  data.publicUrl,
      storagePath: `${bucket}/${path}`,
    };
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.getClient().storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new InternalServerErrorException(`Signed URL falhou: ${error.message}`);
    }
    return data!.signedUrl;
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await this.getClient().storage.from(bucket).remove([path]);
    if (error) {
      throw new InternalServerErrorException(`Storage delete falhou: ${error.message}`);
    }
  }

  getBucketForEntity(entityType: string): string {
    const map: Record<string, string> = {
      company:  'company-docs',
      product:  'product-docs',
      shipment: 'shipment-docs',
      order:    'emitted-docs',
      report:   'emitted-docs',
    };
    return map[entityType] ?? 'emitted-docs';
  }
}
