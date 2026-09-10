var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { IdGeneratorService } from '../common/services/id-generator.service.js';
import { AuditService } from '../audit/audit.service.js';
let PacketsService = class PacketsService {
    prisma;
    ids;
    audit;
    constructor(prisma, ids, audit) {
        this.prisma = prisma;
        this.ids = ids;
        this.audit = audit;
    }
    async create(dto, actor) {
        const loan = await this.prisma.loan.findUnique({
            where: { id: dto.loanId },
            include: { packet: true },
        });
        if (!loan)
            throw new NotFoundException('Loan not found');
        if (loan.packet) {
            throw new BadRequestException('This loan already has a packet');
        }
        return this.prisma.$transaction(async (tx) => {
            const packetCode = await this.ids.next('PKT', tx);
            const packet = await tx.packet.create({
                data: {
                    packetCode,
                    loanId: dto.loanId,
                    status: 'CREATED',
                    createdById: actor.id,
                },
            });
            await this.audit.log({
                entityType: 'Packet',
                entityId: packet.id,
                action: 'PACKET_CREATED',
                userId: actor.id,
                roleAtTime: actor.role,
                newValue: { packetCode, loanId: dto.loanId },
                result: 'SUCCESS',
            }, tx);
            return packet;
        });
    }
    async storeInLocation(packetId, dto, actor) {
        const packet = await this.prisma.packet.findUnique({ where: { id: packetId } });
        if (!packet)
            throw new NotFoundException('Packet not found');
        if (packet.status === 'RELEASED') {
            throw new BadRequestException('Cannot store a released packet');
        }
        const branch = dto.branch ?? 'Main Branch';
        const label = `${dto.safe}-L${dto.locker}-S${dto.shelf}-P${dto.position}`;
        return this.prisma.$transaction(async (tx) => {
            const location = await tx.storageLocation.upsert({
                where: {
                    branch_safe_locker_shelf_position: {
                        branch,
                        safe: dto.safe,
                        locker: dto.locker,
                        shelf: dto.shelf,
                        position: dto.position,
                    },
                },
                create: { branch, safe: dto.safe, locker: dto.locker, shelf: dto.shelf, position: dto.position, label },
                update: {},
            });
            const updated = await tx.packet.update({
                where: { id: packetId },
                data: {
                    status: 'STORED',
                    storageLocationId: location.id,
                    sealedAt: packet.sealedAt ?? new Date(),
                    storedAt: new Date(),
                },
            });
            await tx.packetMovement.create({
                data: {
                    packetId,
                    toLocationId: location.id,
                    reason: 'Initial storage',
                    movedById: actor.id,
                    returned: true,
                },
            });
            await this.audit.log({
                entityType: 'Packet',
                entityId: packetId,
                action: 'PACKET_STORED',
                userId: actor.id,
                roleAtTime: actor.role,
                newValue: { location: label },
                result: 'SUCCESS',
            }, tx);
            return updated;
        });
    }
    async retrieve(packetId, dto, actor) {
        const packet = await this.prisma.packet.findUnique({ where: { id: packetId } });
        if (!packet)
            throw new NotFoundException('Packet not found');
        if (packet.status !== 'STORED') {
            throw new BadRequestException(`Cannot retrieve a packet with status ${packet.status}`);
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.packet.update({
                where: { id: packetId },
                data: { status: 'IN_CLOSURE_PROCESS' },
            });
            await tx.packetMovement.create({
                data: {
                    packetId,
                    fromLocationId: packet.storageLocationId,
                    reason: dto.reason,
                    movedById: actor.id,
                    returned: false,
                },
            });
            await this.audit.log({
                entityType: 'Packet',
                entityId: packetId,
                action: 'PACKET_RETRIEVED',
                userId: actor.id,
                roleAtTime: actor.role,
                reason: dto.reason,
                result: 'SUCCESS',
            }, tx);
            return updated;
        });
    }
    async release(packetId, actor) {
        const packet = await this.prisma.packet.findUnique({ where: { id: packetId } });
        if (!packet)
            throw new NotFoundException('Packet not found');
        if (packet.status !== 'IN_CLOSURE_PROCESS' && packet.status !== 'RETRIEVED') {
            throw new BadRequestException(`Packet must be retrieved before release (current status ${packet.status})`);
        }
        return this.prisma.$transaction(async (tx) => {
            const updated = await tx.packet.update({
                where: { id: packetId },
                data: { status: 'RELEASED', releasedAt: new Date() },
            });
            await this.audit.log({
                entityType: 'Packet',
                entityId: packetId,
                action: 'PACKET_RELEASED',
                userId: actor.id,
                roleAtTime: actor.role,
                result: 'SUCCESS',
            }, tx);
            return updated;
        });
    }
    async findById(id) {
        const packet = await this.prisma.packet.findUnique({
            where: { id },
            include: { storageLocation: true, movements: { orderBy: { timestamp: 'asc' } }, loan: true },
        });
        if (!packet)
            throw new NotFoundException('Packet not found');
        return packet;
    }
    async findAll(query) {
        const page = query?.page && query.page > 0 ? Number(query.page) : 1;
        const limit = query?.limit && query.limit > 0 ? Math.min(Number(query.limit), 100) : 20;
        const skip = (page - 1) * limit;
        const where = {};
        if (query?.status && query.status !== 'ALL') {
            where.status = query.status;
        }
        if (query?.q) {
            const q = query.q.trim();
            where.OR = [
                { packetCode: { contains: q, mode: 'insensitive' } },
                { storageLocation: { label: { contains: q, mode: 'insensitive' } } },
                { loan: { loanCode: { contains: q, mode: 'insensitive' } } },
                { loan: { customer: { fullName: { contains: q, mode: 'insensitive' } } } },
            ];
        }
        const [total, items] = await Promise.all([
            this.prisma.packet.count({ where }),
            this.prisma.packet.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    storageLocation: true,
                    loan: {
                        select: {
                            id: true,
                            loanCode: true,
                            status: true,
                            principalAmount: true,
                            customer: {
                                select: {
                                    id: true,
                                    fullName: true,
                                    customerCode: true,
                                    mobile: true,
                                },
                            },
                            _count: {
                                select: {
                                    jewelleryItems: true,
                                },
                            },
                        },
                    },
                },
            }),
        ]);
        return {
            items,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }
};
PacketsService = __decorate([
    Injectable(),
    __metadata("design:paramtypes", [PrismaService,
        IdGeneratorService,
        AuditService])
], PacketsService);
export { PacketsService };
//# sourceMappingURL=packets.service.js.map