import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

@Injectable()
export class StorageService {
  private supabase: SupabaseClient;

  constructor(private config: ConfigService) {
    this.supabase = createClient(
      this.config.get<string>('SUPABASE_URL')!,
      this.config.get<string>('SUPABASE_SERVICE_ROLE_KEY')!,
    );
  }

  async upload(
    bucket: string,
    path: string,
    buffer: Buffer,
    mimeType: string,
  ): Promise<{ storageUrl: string; storagePath: string }> {
    const { error } = await this.supabase.storage
      .from(bucket)
      .upload(path, buffer, { contentType: mimeType, upsert: true });

    if (error) {
      throw new InternalServerErrorException(`Storage upload falhou: ${error.message}`);
    }

    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);
    return {
      storageUrl:  data.publicUrl,
      storagePath: `${bucket}/${path}`,
    };
  }

  async getSignedUrl(bucket: string, path: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await this.supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) {
      throw new InternalServerErrorException(`Signed URL falhou: ${error.message}`);
    }
    return data!.signedUrl;
  }

  async delete(bucket: string, path: string): Promise<void> {
    const { error } = await this.supabase.storage.from(bucket).remove([path]);
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
