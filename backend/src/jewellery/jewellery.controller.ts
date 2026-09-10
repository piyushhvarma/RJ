import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard.js';
import { RolesGuard } from '../common/guards/roles.guard.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator.js';
import { JewelleryService } from './jewellery.service.js';
import { CreateJewelleryItemDto } from './dto/create-jewellery-item.dto.js';
import { AddJewelleryPhotoDto } from './dto/add-jewellery-photo.dto.js';
import { ListJewelleryDto } from './dto/list-jewellery.dto.js';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('jewellery')
export class JewelleryController {
  constructor(private readonly jewelleryService: JewelleryService) {}

  @Post()
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER)
  create(@Body() dto: CreateJewelleryItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.jewelleryService.create(dto, user);
  }

  @Post(':id/photos')
  @Roles(UserRole.OWNER, UserRole.MANAGER, UserRole.APPRAISER, UserRole.STAFF)
  addPhoto(
    @Param('id') id: string,
    @Body() dto: AddJewelleryPhotoDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.jewelleryService.addPhoto(id, dto, user);
  }

  @Get('appraisals')
  findAllAppraisals(@Query('page') page?: number, @Query('limit') limit?: number) {
    return this.jewelleryService.findAllAppraisals({ page, limit });
  }

  @Get()
  findAll(@Query() query: ListJewelleryDto) {
    return this.jewelleryService.findAll(query);
  }
}
