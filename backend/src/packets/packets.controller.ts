import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { PacketsService } from './packets.service.js';
import { CreatePacketDto, AssignStorageDto, RetrievePacketDto } from './dto/packet.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('packets')
export class PacketsController {
  constructor(private readonly packetsService: PacketsService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  create(@Body() dto: CreatePacketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.packetsService.create(dto, user);
  }

  @Post(':id/store')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.STAFF)
  store(
    @Param('id') id: string,
    @Body() dto: AssignStorageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.packetsService.storeInLocation(id, dto, user);
  }

  @Post(':id/retrieve')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  retrieve(
    @Param('id') id: string,
    @Body() dto: RetrievePacketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.packetsService.retrieve(id, dto, user);
  }

  @Post(':id/release')
  @Roles(UserRole.OWNER, UserRole.MANAGER)
  release(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.packetsService.release(id, user);
  }

  @Get()
  findAll(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.packetsService.findAll({ q, status, page, limit });
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.packetsService.findById(id);
  }
}
