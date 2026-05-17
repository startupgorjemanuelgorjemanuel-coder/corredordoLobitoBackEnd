import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../common/services/storage.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { AuthUser } from '../../common/types/auth-user.type';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RejectDocumentDto } from './dto/validate-document.dto';

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

@Injectable()
export class DocumentsService {
  constructor(
    private prisma:   PrismaService,
    private storage:  StorageService,
    private codeGen:  CodeGeneratorService,
  ) {}

  async upload(file: Express.Multer.File, dto: UploadDocumentDto, user: AuthUser) {
    if (file.size > MAX_SIZE_BYTES) {
      throw new BadRequestException('Ficheiro demasiado grande. Máximo permitido: 10 MB.');
    }
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      throw new BadRequestException('Formato não suportado. Use PDF, JPG ou PNG.');
    }

    const bucket    = this.storage.getBucketForEntity(dto.entityType);
    const timestamp = Date.now();
    const safeName  = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path      = `${dto.entityId}/${timestamp}-${safeName}`;

    const { storageUrl, storagePath } = await this.storage.upload(
      bucket, path, file.buffer, file.mimetype,
    );

    const cd = await this.codeGen.generate('documents');

    return this.prisma.document.create({
      data: {
        cd,
        entityType:   dto.entityType,
        entityId:     dto.entityId,
        type:         dto.type,
        name:         dto.name,
        fileName:     file.originalname,
        mimeType:     file.mimetype,
        sizeBytes:    file.size,
        storageUrl,
        storagePath,
        uploadedById: user.id,
        status:       'pending',
      },
    });
  }

  async findByEntity(entityType: string, entityId: string) {
    return this.prisma.document.findMany({
      where: { entityType: entityType as any, entityId },
      orderBy: { createdAt: 'desc' },
      include: {
        uploadedBy:  { select: { id: true, fullName: true, role: true } },
        validatedBy: { select: { id: true, fullName: true, role: true } },
      },
    });
  }

  async getDownloadUrl(id: string, user: AuthUser) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');

    const [bucket, ...rest] = doc.storagePath.split('/');
    const filePath = rest.join('/');

    const signedUrl = await this.storage.getSignedUrl(bucket, filePath, 3600);
    return { signedUrl, expiresIn: 3600, fileName: doc.fileName };
  }

  async delete(id: string, user: AuthUser) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    if (doc.uploadedById !== user.id) {
      throw new ForbiddenException('Apenas o dono pode apagar este documento.');
    }
    if (doc.status !== 'pending') {
      throw new BadRequestException('Apenas documentos pendentes podem ser apagados.');
    }

    const [bucket, ...rest] = doc.storagePath.split('/');
    await this.storage.delete(bucket, rest.join('/'));
    await this.prisma.document.delete({ where: { id } });
    return { message: 'Documento apagado com sucesso.' };
  }

  async accept(id: string, user: AuthUser) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    if (doc.status === 'accepted') {
      throw new BadRequestException('Documento já está aceite.');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status:        'accepted',
        validatedById: user.id,
        validatedAt:   new Date(),
        rejectedReason: null,
      },
    });
  }

  async reject(id: string, dto: RejectDocumentDto, user: AuthUser) {
    const doc = await this.prisma.document.findUnique({ where: { id } });
    if (!doc) throw new NotFoundException('Documento não encontrado.');
    if (doc.status === 'accepted') {
      throw new BadRequestException('Documento já aceite não pode ser rejeitado.');
    }

    return this.prisma.document.update({
      where: { id },
      data: {
        status:         'rejected',
        rejectedReason: dto.reason,
        validatedById:  user.id,
        validatedAt:    new Date(),
      },
    });
  }
}
