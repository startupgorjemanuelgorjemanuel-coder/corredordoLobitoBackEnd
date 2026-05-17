import {
  Controller, Post, Get, Delete, Param, Body, Query,
  UseGuards, UseInterceptors, UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { DocumentsService } from './documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { RejectDocumentDto } from './dto/validate-document.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthUser } from '../../common/types/auth-user.type';

@ApiTags('Documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  // ─── Upload ──────────────────────────────────────────────────────────────

  @Post('upload')
  @ApiOperation({ summary: 'Upload de documento — qualquer utilizador autenticado' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file:       { type: 'string', format: 'binary' },
        entityType: { type: 'string', example: 'company' },
        entityId:   { type: 'string', example: 'uuid-da-entidade' },
        type:       { type: 'string', example: 'certidao_comercial' },
        name:       { type: 'string', example: 'Certidão Comercial 2026' },
      },
    },
  })
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: UploadDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.upload(file, dto, user);
  }

  // ─── Listagem ────────────────────────────────────────────────────────────

  @Get()
  @ApiOperation({ summary: 'Listar documentos de uma entidade' })
  findByEntity(
    @Query('entityType') entityType: string,
    @Query('entityId')   entityId: string,
  ) {
    return this.documentsService.findByEntity(entityType, entityId);
  }

  // ─── Download ────────────────────────────────────────────────────────────

  @Get(':id/download')
  @ApiOperation({ summary: 'Obter URL de download temporária (60 min)' })
  getDownloadUrl(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.getDownloadUrl(id, user);
  }

  // ─── Apagar ──────────────────────────────────────────────────────────────

  @Delete(':id')
  @ApiOperation({ summary: 'Apagar documento (apenas dono, apenas pending)' })
  delete(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.delete(id, user);
  }

  // ─── Validação STAFF/STATE ───────────────────────────────────────────────

  @Post(':id/accept')
  @UseGuards(RolesGuard)
  @Roles('staff', 'state')
  @ApiOperation({ summary: 'STAFF/STATE aceita documento' })
  accept(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.documentsService.accept(id, user);
  }

  @Post(':id/reject')
  @UseGuards(RolesGuard)
  @Roles('staff', 'state')
  @ApiOperation({ summary: 'STAFF/STATE rejeita documento com motivo' })
  reject(
    @Param('id') id: string,
    @Body() dto: RejectDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.documentsService.reject(id, dto, user);
  }
}
