import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { CodeGeneratorService } from '../../common/services/code-generator.service';
import { paginate, PaginationDto, PaginatedResult } from '../../common/dto/pagination.dto';
import type { AuthUser } from '../../common/types/auth-user.type';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateTrackingDto } from './dto/update-tracking.dto';
import { CustomsActionDto, CustomsRejectDto, HoldShipmentDto } from './dto/customs-action.dto';

@Injectable()
export class ShipmentsService {
  constructor(
    private prisma:  PrismaService,
    private audit:   AuditService,
    private codeGen: CodeGeneratorService,
  ) {}

  async create(dto: CreateShipmentDto, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');
    if (order.status !== 'paid') {
      throw new BadRequestException(
        `Apenas pedidos pagos podem ter embarques criados (estado actual: ${order.status})`,
      );
    }

    const existingShipment = await this.prisma.shipment.findFirst({ where: { orderId: dto.orderId } });
    if (existingShipment) {
      throw new BadRequestException('Este pedido já tem um embarque associado');
    }

    const cd = await this.codeGen.generate('shipments');
    const shipment = await this.prisma.shipment.create({
      data: {
        cd,
        orderId:     dto.orderId,
        operatorId:  user.id,
        origin:      dto.origin,
        destination: dto.destination,
        eta:         dto.eta ? new Date(dto.eta) : null,
        status:      'created',
        trackingEvents: [],
      },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CREATE_SHIPMENT',
      entity: 'shipment', entityId: shipment.id,
      after:  { status: 'created', orderId: dto.orderId },
    });

    return shipment;
  }

  async findAll(pagination: PaginationDto, statusFilter?: string): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const where = statusFilter ? { status: statusFilter as any } : {};
    const include = { operator: { select: { id: true, fullName: true } }, customsDispatch: true };
    const [data, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({ where, skip, take: limit, include, orderBy: { createdAt: 'desc' } }),
      this.prisma.shipment.count({ where }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findMyShipments(user: AuthUser, pagination: PaginationDto): Promise<PaginatedResult<any>> {
    const page  = pagination.page  ?? 1;
    const limit = pagination.limit ?? 20;
    const skip  = (page - 1) * limit;

    const [data, total] = await this.prisma.$transaction([
      this.prisma.shipment.findMany({
        where:   { operatorId: user.id },
        skip, take: limit,
        include: { customsDispatch: true, order: { select: { id: true, cd: true, status: true } } },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.shipment.count({ where: { operatorId: user.id } }),
    ]);

    return paginate(data, total, page, limit);
  }

  async findByOrderId(orderId: string, user: AuthUser) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException('Pedido não encontrado');

    // BUYER só pode ver o embarque do seu próprio pedido
    if (user.role === 'buyer' && order.buyerId !== user.id) {
      throw new ForbiddenException('Acesso negado — este pedido não lhe pertence');
    }

    const shipment = await this.prisma.shipment.findFirst({
      where:   { orderId },
      include: {
        operator:       { select: { id: true, fullName: true } },
        customsDispatch: true,
      },
    });

    if (!shipment) throw new NotFoundException('Este pedido ainda não tem embarque associado');
    return shipment;
  }

  async findOne(id: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where:   { id },
      include: {
        operator:       { select: { id: true, fullName: true } },
        customsDispatch: true,
      },
    });
    if (!shipment) throw new NotFoundException('Embarque não encontrado');
    return shipment;
  }

  async updateTracking(id: string, dto: UpdateTrackingDto, user: AuthUser) {
    const shipment = await this.findOrFail(id);

    if (shipment.operatorId !== user.id) {
      throw new ForbiddenException('Apenas o operador do embarque pode actualizar o tracking');
    }

    // Append-only — nunca sobrescreve eventos anteriores
    const events = (shipment.trackingEvents as any[]) ?? [];
    events.push({
      timestamp: new Date().toISOString(),
      location:  dto.location,
      status:    dto.status,
      updatedBy: user.id,
      notes:     dto.notes ?? null,
    });

    return this.prisma.shipment.update({
      where: { id },
      data: {
        lastLocation:   dto.location,
        trackingEvents: events,
        status:         dto.status as any,
      },
    });
  }

  async approve(id: string, dto: CustomsActionDto, user: AuthUser) {
    const shipment = await this.findOrFail(id);

    if (['customs_approved', 'delivered'].includes(shipment.status)) {
      throw new BadRequestException('Embarque já foi aprovado ou entregue');
    }

    await this.prisma.shipment.update({
      where: { id },
      data:  { status: 'customs_approved' },
    });

    const existingDispatch = await this.prisma.customsDispatch.findUnique({ where: { shipmentId: id } });
    const dispatchCd = existingDispatch?.cd ?? await this.codeGen.generate('customs_dispatches');
    const dispatch = await this.prisma.customsDispatch.upsert({
      where:  { shipmentId: id },
      update: { status: 'approved', notes: dto.notes, validatedAt: new Date(), dispatcherId: user.id },
      create: { cd: dispatchCd, shipmentId: id, dispatcherId: user.id, status: 'approved', notes: dto.notes, validatedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CUSTOMS_APPROVE',
      entity: 'shipment', entityId: id,
      before: { status: shipment.status },
      after:  { status: 'customs_approved' },
    });

    return dispatch;
  }

  async reject(id: string, dto: CustomsRejectDto, user: AuthUser) {
    const shipment = await this.findOrFail(id);

    await this.prisma.shipment.update({
      where: { id },
      data:  { status: 'customs_rejected' },
    });

    const existingReject = await this.prisma.customsDispatch.findUnique({ where: { shipmentId: id } });
    const rejectCd = existingReject?.cd ?? await this.codeGen.generate('customs_dispatches');
    const dispatch = await this.prisma.customsDispatch.upsert({
      where:  { shipmentId: id },
      update: { status: 'rejected', rejectionReason: dto.reason, validatedAt: new Date(), dispatcherId: user.id },
      create: { cd: rejectCd, shipmentId: id, dispatcherId: user.id, status: 'rejected', rejectionReason: dto.reason, validatedAt: new Date() },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'CUSTOMS_REJECT',
      entity: 'shipment', entityId: id,
      before: { status: shipment.status },
      after:  { status: 'customs_rejected', reason: dto.reason },
    });

    return dispatch;
  }

  async hold(id: string, dto: HoldShipmentDto, user: AuthUser) {
    const shipment = await this.findOrFail(id);

    if (['delivered', 'customs_rejected'].includes(shipment.status)) {
      throw new BadRequestException('Embarque não pode ser retido neste estado');
    }

    await this.prisma.shipment.update({
      where: { id },
      data:  { status: 'held', holdReason: dto.reason },
    });

    const existingHold = await this.prisma.customsDispatch.findUnique({ where: { shipmentId: id } });
    const holdCd = existingHold?.cd ?? await this.codeGen.generate('customs_dispatches');
    await this.prisma.customsDispatch.upsert({
      where:  { shipmentId: id },
      update: { status: 'held', dispatcherId: user.id },
      create: { cd: holdCd, shipmentId: id, dispatcherId: user.id, status: 'held' },
    });

    await this.audit.log({
      userId: user.id, role: user.role,
      action: 'HOLD_SHIPMENT',
      entity: 'shipment', entityId: id,
      before: { status: shipment.status },
      after:  { status: 'held', reason: dto.reason },
    });

    return this.findOne(id);
  }

  private async findOrFail(id: string) {
    const shipment = await this.prisma.shipment.findUnique({ where: { id } });
    if (!shipment) throw new NotFoundException('Embarque não encontrado');
    return shipment;
  }
}
