import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreatePriceProposalDto } from './dto/create-price-proposal.dto';
import { UpdatePriceProposalDto } from './dto/update-price-proposal.dto';
import { RejectProposalDto } from './dto/reject-proposal.dto';

@Injectable()
export class PriceProposalsService {
  constructor(
    private prisma:  PrismaService,
    private audit:   AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  async create(dto: CreatePriceProposalDto, user: AuthUser) {
    const cd = await this.codeGen.generate('price_proposals');
    return this.prisma.priceProposal.create({
      data: {
        cd,
        productId:     dto.productId,
        createdById:   user.id,
        proposedPrice: dto.proposedPrice,
        currency:      dto.currency ?? 'USD',
        justification: dto.justification,
        validFrom:     dto.validFrom ? new Date(dto.validFrom) : null,
        validTo:       dto.validTo   ? new Date(dto.validTo)   : null,
        status:        'draft',
      },
    });
  }

  async findAll() {
    return this.prisma.priceProposal.findMany({
      include: { product: { select: { id: true, name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    return this.findOrFail(id);
  }

  async findMyProposals(user: AuthUser) {
    return this.prisma.priceProposal.findMany({
      where:   { createdById: user.id },
      include: { product: { select: { id: true, name: true, category: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: string, dto: UpdatePriceProposalDto, user: AuthUser) {
    const proposal = await this.findOrFail(id);

    if (proposal.createdById !== user.id) {
      throw new ForbiddenException('Apenas o criador pode editar esta proposta');
    }
    if (proposal.status === 'approved') {
      throw new ForbiddenException('Price proposal aprovada é imutável');
    }
    if (!['draft', 'rejected'].includes(proposal.status)) {
      throw new BadRequestException('Apenas propostas em draft ou rejected podem ser editadas');
    }

    return this.prisma.priceProposal.update({
      where: { id },
      data: {
        proposedPrice: dto.proposedPrice,
        justification: dto.justification,
        validFrom:     dto.validFrom ? new Date(dto.validFrom) : undefined,
        validTo:       dto.validTo   ? new Date(dto.validTo)   : undefined,
        status:        'draft',
      },
    });
  }

  async submit(id: string, user: AuthUser) {
    const proposal = await this.findOrFail(id);

    if (proposal.createdById !== user.id) {
      throw new ForbiddenException('Apenas o criador pode submeter esta proposta');
    }
    if (proposal.status !== 'draft') {
      throw new BadRequestException('Apenas propostas em draft podem ser submetidas');
    }

    const updated = await this.prisma.priceProposal.update({
      where: { id },
      data:  { status: 'submitted', submittedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'SUBMIT_PRICE_PROPOSAL',
      entity: 'price_proposal', entityId: id,
      before: { status: 'draft' },
      after:  { status: 'submitted' },
    });

    return updated;
  }

  async approve(id: string, user: AuthUser) {
    const proposal = await this.prisma.priceProposal.findUnique({
      where:   { id },
      include: { product: true },
    });

    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    if (proposal.status !== 'submitted') {
      throw new BadRequestException('Apenas propostas submetidas podem ser aprovadas');
    }

    // Snapshot imutável gerado uma vez aqui — nunca mais alterado
    const snapshot = {
      snapshotVersion:  '1.0',
      generatedAt:      new Date().toISOString(),
      proposalId:       proposal.id,
      productId:        proposal.product.id,
      productName:      proposal.product.name,
      productCategory:  proposal.product.category,
      approvedPriceUsd: Number(proposal.proposedPrice),
      currency:         proposal.currency,
      validFrom:        proposal.validFrom?.toISOString() ?? null,
      validTo:          proposal.validTo?.toISOString()   ?? null,
      immutable:        true,
    };

    const updated = await this.prisma.priceProposal.update({
      where: { id },
      data: {
        status:       'approved',
        snapshot,
        approvedAt:   new Date(),
        approvedById: user.id,
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'APPROVE_PRICE_PROPOSAL',
      entity: 'price_proposal', entityId: id,
      after:  { status: 'approved', snapshot },
    });

    return updated;
  }

  async reject(id: string, dto: RejectProposalDto, user: AuthUser) {
    const proposal = await this.findOrFail(id);

    if (!['submitted', 'draft'].includes(proposal.status)) {
      throw new BadRequestException('Proposta não pode ser rejeitada neste estado');
    }

    const updated = await this.prisma.priceProposal.update({
      where: { id },
      data:  { status: 'rejected', rejectionReason: dto.reason },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'REJECT_PRICE_PROPOSAL',
      entity: 'price_proposal', entityId: id,
      before: { status: proposal.status },
      after:  { status: 'rejected', reason: dto.reason },
    });

    return updated;
  }

  private async findOrFail(id: string) {
    const proposal = await this.prisma.priceProposal.findUnique({
      where:   { id },
      include: { product: { select: { id: true, name: true, category: true } } },
    });
    if (!proposal) throw new NotFoundException('Proposta não encontrada');
    return proposal;
  }
}
