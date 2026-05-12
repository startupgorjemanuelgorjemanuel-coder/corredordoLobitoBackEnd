import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';

interface AuditPayload {
  userId:   string;
  role:     string;
  action:   string;
  entity:   string;
  entityId: string;
  before?:  object;
  after?:   object;
  meta?:    object;
}

@Injectable()
export class AuditService {
  constructor(
    private prisma:  PrismaService,
    private codeGen: CodeGeneratorService,
  ) {}

  async log(payload: AuditPayload) {
    const cd = await this.codeGen.generate('audit_logs');
    await this.prisma.auditLog.create({
      data: {
        cd,
        userId:     payload.userId,
        role:       payload.role,
        action:     payload.action,
        entity:     payload.entity,
        entityId:   payload.entityId,
        beforeJson: payload.before ? JSON.stringify(payload.before) : null,
        afterJson:  payload.after  ? JSON.stringify(payload.after)  : null,
        meta:       payload.meta   ? JSON.stringify(payload.meta)   : null,
      },
    });
  }
}
